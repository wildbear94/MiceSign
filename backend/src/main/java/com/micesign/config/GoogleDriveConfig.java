package com.micesign.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.drive.Drive;
import com.google.api.services.drive.DriveScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;
import java.util.List;

@Configuration
public class GoogleDriveConfig {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveConfig.class);
    private static final List<String> SCOPES = Collections.singletonList(DriveScopes.DRIVE);

    @Value("${google.drive.root-folder-name:MiceSign}")
    private String rootFolderName;

    @Bean
    public Drive googleDriveClient(
            @Value("${google.drive.credentials-path:}") String credentialsPath)
            throws IOException, GeneralSecurityException {

        GoogleCredentials credentials = resolveCredentials(credentialsPath);
        if (credentials == null) {
            log.warn("Google Drive credentials not available. Drive client will not be created.");
            return null;
        }

        log.info("Google Drive client initialized successfully");
        return new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials))
                .setApplicationName("MiceSign")
                .build();
    }

    private GoogleCredentials resolveCredentials(String credentialsPath) {
        // 1) 명시적 서비스 계정 키 파일이 있으면 사용
        if (credentialsPath != null && !credentialsPath.isBlank()) {
            java.io.File credFile = new java.io.File(credentialsPath);
            if (credFile.exists()) {
                try (FileInputStream fis = new FileInputStream(credFile)) {
                    GoogleCredentials creds = GoogleCredentials
                            .fromStream(fis)
                            .createScoped(SCOPES);
                    log.info("Using service account key file: {}", credentialsPath);
                    return creds;
                } catch (IOException e) {
                    log.error("Failed to load service account key file: {}", credentialsPath, e);
                }
            } else {
                log.warn("Service account key file not found: {}", credentialsPath);
            }
        }

        // 2) ADC (Application Default Credentials) 자동 탐지
        //    - GOOGLE_APPLICATION_CREDENTIALS 환경변수
        //    - gcloud auth application-default login
        //    - GCE/Cloud Run 메타데이터 서버
        try {
            GoogleCredentials creds = GoogleCredentials.getApplicationDefault()
                    .createScoped(SCOPES);
            log.info("Using Application Default Credentials (ADC)");
            return creds;
        } catch (IOException e) {
            log.warn("ADC not available: {}", e.getMessage());
        }

        return null;
    }

    public String getRootFolderName() {
        return rootFolderName;
    }
}
