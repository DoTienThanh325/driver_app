package com.driverapp.driverservice.config;

import io.minio.MinioClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ObjectStorageConfig {

    @org.springframework.beans.factory.annotation.Value("${storage.http.connect-ms:1000}")
    private long connectMs;
    @org.springframework.beans.factory.annotation.Value("${storage.http.call-ms:20000}")
    private long callMs;

    private okhttp3.OkHttpClient storageHttpClient() {
        return new okhttp3.OkHttpClient.Builder()
                .connectTimeout(connectMs, java.util.concurrent.TimeUnit.MILLISECONDS)
                .readTimeout(callMs, java.util.concurrent.TimeUnit.MILLISECONDS)
                .writeTimeout(callMs, java.util.concurrent.TimeUnit.MILLISECONDS)
                .callTimeout(callMs, java.util.concurrent.TimeUnit.MILLISECONDS)
                .retryOnConnectionFailure(false).build();
    }


    @Bean("minioClient")
    MinioClient minioClient(
            @Value("${storage.endpoint}") String endpoint,
            @Value("${storage.access-key}") String accessKey,
            @Value("${storage.secret-key}") String secretKey) {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .httpClient(storageHttpClient())
                .build();
    }

    @Bean("publicMinioClient")
    MinioClient publicMinioClient(
            @Value("${storage.public-endpoint}") String endpoint,
            @Value("${storage.access-key}") String accessKey,
            @Value("${storage.secret-key}") String secretKey) {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .httpClient(storageHttpClient())
                .build();
    }
}