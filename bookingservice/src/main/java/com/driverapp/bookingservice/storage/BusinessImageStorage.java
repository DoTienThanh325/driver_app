package com.driverapp.bookingservice.storage;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.Http.Method;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.io.InputStream;
import java.text.Normalizer;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

@Slf4j
@Service
public class BusinessImageStorage {

    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024; // 5 MiB

    private final MinioClient client;
    private final MinioClient publicClient;
    private final String bucket;

    public BusinessImageStorage(
            @Qualifier("minioClient") MinioClient client,
            @Qualifier("publicMinioClient") MinioClient publicClient,
            @Value("${storage.bucket}") String bucket) {
        this.client = client;
        this.publicClient = publicClient;
        this.bucket = bucket;
    }

    /**
     * Upload ảnh giấy phép lên MinIO.
     * Key format: business/{restaurantName}/license/license_01 (01, 02, ...)
     * Ví dụ: "Phở Bà Ngọc" -> "business/pho-ba-ngoc/license/license_01.jpg"
     *
     * @param restaurantName tên nhà hàng (sẽ được tự động slug hóa chuẩn tiếng Việt)
     * @param index          số thứ tự ảnh, bắt đầu từ 1
     * @return URI dạng s3://bucket/key để lưu vào DB
     */
    public String upload(String restaurantName, int index, MultipartFile file) {
        ImageFormat format = detectFormat(file);

        // Chuyển tiếng Việt có dấu sang dạng slug: "Phở Bà Ngọc" -> "pho-ba-ngoc"
        String slug = toSlug(restaurantName);

        // Đánh số thứ tự: license_01, license_02, ...
        String fileName = String.format("license_%02d%s", index, format.extension);
        String key = "business/" + slug + "/license/" + fileName;

        try (InputStream stream = file.getInputStream()) {
            client.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(key)
                            .stream(stream, file.getSize(), -1L)
                            .contentType(format.contentType)
                            .build());
            return "s3://" + bucket + "/" + key;
        } catch (Exception e) {
            throw new ObjectStorageException("Could not upload business license image", e);
        }
    }

    /**
     * Helper chuyển tên tiếng Việt có dấu sang slug URL an toàn (ví dụ: "Phở Bà Ngọc" -> "pho-ba-ngoc")
     */
    private String toSlug(String input) {
        if (input == null || input.isBlank()) {
            return "restaurant";
        }
        // Thay ký tự đặc trưng đ/Đ trước khi chuẩn hóa Unicode
        String temp = input.trim()
                .replace('đ', 'd')
                .replace('Đ', 'd');

        // Bỏ dấu thanh tiếng Việt qua Unicode NFD
        String normalized = Normalizer.normalize(temp, Normalizer.Form.NFD);
        Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
        String noDiacritics = pattern.matcher(normalized).replaceAll("");

        // Bỏ ký tự đặc biệt, chuyển khoảng trắng thành dấu gạch nối, loại bỏ gạch nối thừa
        return noDiacritics.toLowerCase()
                .replaceAll("[^a-z0-9\\s-]", "")
                .replaceAll("\\s+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
    }

    public void validate(MultipartFile file) {
        detectFormat(file);
    }

    /** Lấy presigned URL để đọc ảnh (hết hạn 10 phút) */
    public String signedReadUrl(String objectUrl) {
        try {
            return publicClient.getPresignedObjectUrl(
                    GetPresignedObjectUrlArgs.builder()
                            .method(Method.GET)
                            .bucket(bucket)
                            .object(keyOf(objectUrl))
                            .expiry(10, TimeUnit.MINUTES)
                            .build());
        } catch (Exception e) {
            throw new ObjectStorageException("Could not create image view URL", e);
        }
    }

    private String keyOf(String objectUrl) {
        String prefix = "s3://" + bucket + "/";
        if (objectUrl == null || !objectUrl.startsWith(prefix)) {
            throw new IllegalArgumentException("Object URL does not belong to business bucket");
        }
        return objectUrl.substring(prefix.length());
    }

    private ImageFormat detectFormat(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_IMAGE_SIZE) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
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
                    && header[1] == 'P' && header[2] == 'N' && header[3] == 'G'
                    && header[4] == 13 && header[5] == 10 && header[6] == 26 && header[7] == 10) {
                return ImageFormat.PNG;
            }
            if (header.length >= 12
                    && header[0] == 'R' && header[1] == 'I' && header[2] == 'F' && header[3] == 'F'
                    && header[8] == 'W' && header[9] == 'E' && header[10] == 'B' && header[11] == 'P') {
                return ImageFormat.WEBP;
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only JPEG, PNG and WebP images are allowed");
        } catch (IOException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot read image", e);
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
