package com.micesign.service;

import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import com.google.api.client.http.InputStreamContent;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.model.File;
import com.google.api.services.drive.model.FileList;
import com.micesign.common.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class GoogleDriveService {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveService.class);
    private static final int MAX_RETRIES = 3;
    private static final long BASE_DELAY_MS = 1000L;

    private final Drive driveClient;
    private final ConcurrentHashMap<String, String> folderIdCache = new ConcurrentHashMap<>();

    public GoogleDriveService(@Nullable Drive driveClient) {
        this.driveClient = driveClient;
    }

    public record DriveUploadResult(String fileId, String folderPath) {}

    public String createFolder(String folderName, String parentFolderId) {
        ensureDriveConfigured();
        return executeWithRetry(() -> {
            File folderMetadata = new File()
                    .setName(folderName)
                    .setMimeType("application/vnd.google-apps.folder");
            if (parentFolderId != null) {
                folderMetadata.setParents(Collections.singletonList(parentFolderId));
            }
            File folder = driveClient.files().create(folderMetadata)
                    .setFields("id")
                    .execute();
            return folder.getId();
        });
    }

    public String findOrCreateFolder(String path) {
        ensureDriveConfigured();
        String cachedId = folderIdCache.get(path);
        if (cachedId != null) {
            return cachedId;
        }

        String[] parts = path.split("/");
        String parentId = null;
        StringBuilder currentPath = new StringBuilder();

        for (String part : parts) {
            if (part.isEmpty()) continue;
            if (currentPath.length() > 0) {
                currentPath.append("/");
            }
            currentPath.append(part);
            String segmentPath = currentPath.toString();

            String folderId = folderIdCache.get(segmentPath);
            if (folderId != null) {
                parentId = folderId;
                continue;
            }

            // Search for existing folder
            String existingId = findFolderByName(part, parentId);
            if (existingId != null) {
                folderIdCache.put(segmentPath, existingId);
                parentId = existingId;
            } else {
                String newId = createFolder(part, parentId);
                folderIdCache.put(segmentPath, newId);
                parentId = newId;
            }
        }
        folderIdCache.put(path, parentId);
        return parentId;
    }

    public DriveUploadResult uploadFile(String folderPath, String fileName, String mimeType,
                                         InputStream inputStream, long fileSize) {
        ensureDriveConfigured();
        String folderId = findOrCreateFolder(folderPath);
        String fileId = executeWithRetry(() -> {
            File fileMetadata = new File()
                    .setName(fileName)
                    .setParents(Collections.singletonList(folderId));
            InputStreamContent mediaContent = new InputStreamContent(mimeType, inputStream);
            if (fileSize > 0) {
                mediaContent.setLength(fileSize);
            }
            File uploaded = driveClient.files().create(fileMetadata, mediaContent)
                    .setFields("id")
                    .execute();
            return uploaded.getId();
        });
        return new DriveUploadResult(fileId, folderPath);
    }

    public InputStream downloadFile(String fileId) {
        ensureDriveConfigured();
        return executeWithRetry(() ->
                driveClient.files().get(fileId).executeMediaAsInputStream()
        );
    }

    public void deleteFile(String fileId) {
        ensureDriveConfigured();
        executeWithRetry(() -> {
            driveClient.files().delete(fileId).execute();
            return null;
        });
    }

    // --- Private helpers ---

    private String findFolderByName(String folderName, String parentId) {
        return executeWithRetry(() -> {
            StringBuilder query = new StringBuilder();
            query.append("mimeType='application/vnd.google-apps.folder'");
            query.append(" and name='").append(folderName.replace("'", "\\'")).append("'");
            query.append(" and trashed=false");
            if (parentId != null) {
                query.append(" and '").append(parentId).append("' in parents");
            }
            FileList result = driveClient.files().list()
                    .setQ(query.toString())
                    .setFields("files(id)")
                    .setPageSize(1)
                    .execute();
            List<File> files = result.getFiles();
            return (files != null && !files.isEmpty()) ? files.get(0).getId() : null;
        });
    }

    private void ensureDriveConfigured() {
        if (driveClient == null) {
            throw new BusinessException("FILE_DRIVE_NOT_CONFIGURED", "파일 저장소가 설정되지 않았습니다");
        }
    }

    @FunctionalInterface
    private interface RetryableAction<T> {
        T execute() throws IOException;
    }

    private <T> T executeWithRetry(RetryableAction<T> action) {
        int attempt = 0;
        while (true) {
            try {
                return action.execute();
            } catch (GoogleJsonResponseException e) {
                attempt++;
                if (attempt >= MAX_RETRIES || !isRetryable(e.getStatusCode())) {
                    throw new BusinessException("FILE_DRIVE_ERROR",
                            "Google Drive API 오류: " + e.getDetails().getMessage());
                }
                sleepBeforeRetry(attempt);
            } catch (IOException e) {
                attempt++;
                if (attempt >= MAX_RETRIES) {
                    throw new BusinessException("FILE_DRIVE_ERROR",
                            "Google Drive 연결 오류: " + e.getMessage());
                }
                sleepBeforeRetry(attempt);
            }
        }
    }

    private boolean isRetryable(int statusCode) {
        return statusCode == 429 || statusCode == 500 || statusCode == 503;
    }

    private void sleepBeforeRetry(int attempt) {
        try {
            long delay = BASE_DELAY_MS * (1L << (attempt - 1)); // 1s, 2s, 4s
            log.warn("Google Drive API retry attempt {} after {}ms", attempt, delay);
            Thread.sleep(delay);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new BusinessException("FILE_DRIVE_ERROR", "작업이 중단되었습니다");
        }
    }
}
