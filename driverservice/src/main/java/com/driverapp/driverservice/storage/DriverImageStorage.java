package com.driverapp.driverservice.storage;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.Http.Method;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class DriverImageStorage {
    private static final Logger log = LoggerFactory.getLogger(DriverImageStorage.class);

    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;

    private final MinioClient client;
    private final MinioClient publicClient;
    private final String bucket;

    public DriverImageStorage(
            @Qualifier("minioClient") MinioClient client,
            @Qualifier("publicMinioClient") MinioClient publicClient,
            @Value("${storage.bucket}") String bucket) {
        this.client = client;
        this.publicClient = publicClient;
        this.bucket = bucket;
    }

    public String upload(UUID userId, String kind, MultipartFile file) {
        ImageFormat format = detectFormat(file);

        String key = "drivers/" + userId + "/" + kind + "/"
                + UUID.randomUUID() + format.extension;

        try (InputStream stream = file.getInputStream()) {
            client.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(key)
                            .stream(stream, file.getSize(), -1L)
                            .contentType(format.contentType)
                            .build());

            // URI ổn định để lưu trong DB, không phải URL đọc công khai.
            return "s3://" + bucket + "/" + key;
        } catch (Exception exception) {
            throw new ObjectStorageException(
                    "Could not upload driver image", exception);
        }
    }

    public void validate(MultipartFile file) {
        detectFormat(file);
    }

    public void deleteQuietly(String objectUrl) {
        try {
            client.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucket)
                            .object(keyOf(objectUrl))
                            .build());
        } catch (Exception exception) {
            log.error(
                    "Could not remove orphaned driver image {}",
                    objectUrl,
                    exception);
        }
    }

    public String signedReadUrl(String objectUrl) {
        try {
            return publicClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucket)
                            .object(keyOf(objectUrl))
                            .expiry(10, TimeUnit.MINUTES)
                            .build());
        } catch (Exception exception) {
            throw new ObjectStorageException(
                    "Could not create image view URL", exception);
        }
    }

    private String keyOf(String objectUrl) {
        String prefix = "s3://" + bucket + "/";

        if (objectUrl == null || !objectUrl.startsWith(prefix)) {
            throw new IllegalArgumentException(
                    "Object URL does not belong to driver bucket");
        }

        return objectUrl.substring(prefix.length());
    }

    private ImageFormat detectFormat(MultipartFile file) {
        if (file == null || file.isEmpty()
                || file.getSize() > MAX_IMAGE_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Each image must be 1 byte to 5 MiB");
        }

        try (InputStream stream = file.getInputStream()) {
            byte[] header = stream.readNBytes(12);

            if (header.length >= 3
                    && (header[0] & 0xff) == 0xff
                    && (header[1] & 0xff) == 0xd8
                    && (header[2] & 0xff) == 0xff) {
                return ImageFormat.JPEG;
            }

            if (header.length >= 8
                    && (header[0] & 0xff) == 0x89
                    && header[1] == 'P'
                    && header[2] == 'N'
                    && header[3] == 'G'
                    && header[4] == 13
                    && header[5] == 10
                    && header[6] == 26
                    && header[7] == 10) {
                return ImageFormat.PNG;
            }

            if (header.length >= 12
                    && header[0] == 'R'
                    && header[1] == 'I'
                    && header[2] == 'F'
                    && header[3] == 'F'
                    && header[8] == 'W'
                    && header[9] == 'E'
                    && header[10] == 'B'
                    && header[11] == 'P') {
                return ImageFormat.WEBP;
            }

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only JPEG, PNG and WebP images are allowed");
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cannot read image",
                    exception);
        }
    }

    private enum ImageFormat {
        JPEG(".jpg", "image/jpeg"),
        PNG(".png", "image/png"),
        WEBP(".webp", "image/webp");

        private final String extension;
        private final String contentType;

        ImageFormat(String extension, String contentType) {
            this.extension = extension;
            this.contentType = contentType;
        }
    }
}