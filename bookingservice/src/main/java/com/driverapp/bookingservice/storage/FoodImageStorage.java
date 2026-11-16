package com.driverapp.bookingservice.storage;

import io.minio.BucketExistsArgs;
import io.minio.ListObjectsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.RemoveObjectArgs;
import io.minio.Result;
import io.minio.messages.Item;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;

@Slf4j
@Service
public class FoodImageStorage {

    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024; // 5 MiB

    private final MinioClient client;
    private final MinioClient publicClient;
    private final String bucket;

    public FoodImageStorage(
            @Qualifier("minioClient") MinioClient client,
            @Qualifier("publicMinioClient") MinioClient publicClient,
            @Value("${storage.bucket}") String bucket) {
        this.client = client;
        this.publicClient = publicClient;
        this.bucket = bucket;
    }

    @PostConstruct
    public void initBucket() {
        try {
            boolean found = client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!found) {
                client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Created MinIO bucket: {}", bucket);
            }
        } catch (Exception e) {
            log.warn("Could not ensure bucket {} exists: {}", bucket, e.getMessage());
        }
    }

    /**
     * Upload ảnh tùy chọn món ăn lên MinIO.
     * Thư mục: foodId
     * Tên file: image_1, image_2, ...
     * Ví dụ: "65f000000000000000000001/image_1.jpg"
     *
     * @param foodId ID của món ăn (dùng làm tên thư mục)
     * @param index  Số thứ tự ảnh bắt đầu từ 1 (image_1, image_2, ...)
     * @param file   File ảnh gửi lên từ client
     * @return URI dạng s3://bucket/key để lưu vào MongoDB
     */
    public String uploadFoodOptionImage(String foodId, int index, MultipartFile file) {
        ImageFormat format = detectFormat(file);
        String fileName = String.format("image_%d%s", index, format.extension);
        String objectKey = foodId + "/" + fileName;

        try (InputStream stream = file.getInputStream()) {
            client.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(objectKey)
                            .stream(stream, file.getSize(), -1L)
                            .contentType(format.contentType)
                            .build());
            return "s3://" + bucket + "/" + objectKey;
        } catch (Exception e) {
            log.error("Lỗi khi tải ảnh món ăn lên MinIO: foodId={}, objectKey={}", foodId, objectKey, e);
            throw new ObjectStorageException("Không thể lưu trữ ảnh món ăn", e);
        }
    }

    /**
     * Xóa toàn bộ ảnh trong thư mục foodId khi rollback transaction.
     */
    public void deleteFolder(String foodId) {
        try {
            Iterable<Result<Item>> results = client.listObjects(
                    ListObjectsArgs.builder().bucket(bucket).prefix(foodId + "/").build());
            for (Result<Item> result : results) {
                Item item = result.get();
                client.removeObject(RemoveObjectArgs.builder().bucket(bucket).object(item.objectName()).build());
            }
            log.info("Đã dọn dẹp các ảnh trên MinIO cho foodId: {}", foodId);
        } catch (Exception e) {
            log.warn("Không thể dọn dẹp file rác trên MinIO cho foodId {}: {}", foodId, e.getMessage());
        }
    }

    /**
     * Xóa một file ảnh cụ thể khi cập nhật hoặc dọn dẹp.
     */
    public void deleteQuietly(String objectUrl) {
        if (objectUrl == null || objectUrl.isBlank()) {
            return;
        }
        try {
            client.removeObject(
                    RemoveObjectArgs.builder()
                            .bucket(bucket)
                            .object(keyOf(objectUrl))
                            .build());
            log.info("Đã xóa ảnh cũ trên MinIO: {}", objectUrl);
        } catch (Exception e) {
            log.warn("Không thể xóa ảnh cũ trên MinIO {}: {}", objectUrl, e.getMessage());
        }
    }

    private String keyOf(String objectUrl) {
        String prefix = "s3://" + bucket + "/";
        if (objectUrl == null || !objectUrl.startsWith(prefix)) {
            throw new IllegalArgumentException("Object URL does not belong to bucket " + bucket);
        }
        return objectUrl.substring(prefix.length());
    }

    public void validate(MultipartFile file) {
        detectFormat(file);
    }

    private ImageFormat detectFormat(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_IMAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File ảnh phải có dung lượng từ 1 byte đến tối đa 5 MiB");
        }
        try (InputStream stream = file.getInputStream()) {
            byte[] header = stream.readNBytes(12);
            if (header.length >= 3 && (header[0] & 0xff) == 0xff && (header[1] & 0xff) == 0xd8 && (header[2] & 0xff) == 0xff) {
                return ImageFormat.JPEG;
            }
            if (header.length >= 8 && (header[0] & 0xff) == 0x89 && header[1] == 'P' && header[2] == 'N' && header[3] == 'G'
                    && header[4] == 13 && header[5] == 10 && header[6] == 26 && header[7] == 10) {
                return ImageFormat.PNG;
            }
            if (header.length >= 12 && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                    && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
                return ImageFormat.WEBP;
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Định dạng ảnh không hợp lệ! Chỉ chấp nhận JPEG, PNG hoặc WebP");
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Không thể đọc nội dung file ảnh", e);
        }
    }

    private enum ImageFormat {
        JPEG(".jpg", "image/jpeg"),
        PNG(".png", "image/png"),
        WEBP(".webp", "image/webp");

        final String extension;
        final String contentType;

        ImageFormat(String extension, String contentType) {
            this.extension = extension;
            this.contentType = contentType;
        }
    }
}
