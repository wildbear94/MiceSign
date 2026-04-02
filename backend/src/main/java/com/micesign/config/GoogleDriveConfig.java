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
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Collections;

@Configuration
public class GoogleDriveConfig {

    private static final Logger log = LoggerFactory.getLogger(GoogleDriveConfig.class);

    @Value("${google.drive.root-folder-name:MiceSign}")
    private String rootFolderName;

    @Bean
    @ConditionalOnProperty(name = "google.drive.credentials-path")
    public Drive googleDriveClient(@Value("${google.drive.credentials-path}") String credentialsPath)
            throws IOException, GeneralSecurityException {
        if (credentialsPath == null || credentialsPath.isBlank()) {
            log.warn("Google Drive credentials path is empty. Drive client will not be created.");
            return null;
        }
        GoogleCredentials credentials = GoogleCredentials
                .fromStream(new FileInputStream(credentialsPath))
                .createScoped(Collections.singletonList(DriveScopes.DRIVE_FILE));

        log.info("Google Drive client initialized with credentials from: {}", credentialsPath);
        return new Drive.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials))
                .setApplicationName("MiceSign")
                .build();
    }

    public String getRootFolderName() {
        return rootFolderName;
    }
}
