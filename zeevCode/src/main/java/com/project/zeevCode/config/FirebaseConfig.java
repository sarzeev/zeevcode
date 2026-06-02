package com.project.zeevCode.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Base64;

@Configuration
@Slf4j
public class FirebaseConfig {

    @Value("${firebase.credentials.path:}")
    private String credentialsPath;

    @PostConstruct
    public void init() {
        if (!FirebaseApp.getApps().isEmpty()) {
            return;
        }

        try {
            InputStream serviceAccount = null;

            // 1. Try to load from file path
            if (credentialsPath != null && !credentialsPath.isEmpty() && Files.exists(Paths.get(credentialsPath))) {
                serviceAccount = new FileInputStream(credentialsPath);
                log.info("Loaded Firebase credentials from file: {}", credentialsPath);
            } 
            // 2. Try to load from environment variable (useful for production)
            else {
                String envCredentials = System.getenv("FIREBASE_SERVICE_ACCOUNT");
                if (envCredentials != null && !envCredentials.isEmpty()) {
                    // Check if base64 encoded
                    try {
                        byte[] decodedBytes = Base64.getDecoder().decode(envCredentials);
                        serviceAccount = new ByteArrayInputStream(decodedBytes);
                        log.info("Loaded Firebase credentials from base64 environment variable.");
                    } catch (IllegalArgumentException e) {
                        // Not base64, assume raw JSON string
                        serviceAccount = new ByteArrayInputStream(envCredentials.getBytes());
                        log.info("Loaded Firebase credentials from raw JSON environment variable.");
                    }
                } else {
                    log.warn("No Firebase credentials found. Falling back to Google Application Default Credentials.");
                    serviceAccount = null;
                }
            }

            GoogleCredentials credentials;
            if (serviceAccount != null) {
                credentials = GoogleCredentials.fromStream(serviceAccount);
            } else {
                credentials = GoogleCredentials.getApplicationDefault();
            }

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(credentials)
                    .build();

            FirebaseApp.initializeApp(options);
            log.info("Firebase Admin SDK initialized successfully.");

        } catch (Exception e) {
            log.error("Failed to initialize Firebase Admin SDK", e);
        }
    }
}
