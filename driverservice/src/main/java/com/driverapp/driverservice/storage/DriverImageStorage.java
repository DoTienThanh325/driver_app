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
import java.util.concurrent.TimeUnit;

@Service
public class DriverImageStorage {
    private static final Logger log = LoggerFactory.getLogger(DriverImageStorage.class);

    private static final long MAX_IMAGE_SIZE = 15L * 1024 * 1024;

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

    // ─────────────────────────────────── PUBLIC UPLOAD METHODS

    /**
     * Upload CMND/CCCD mặt trước.
     * Key: driver/{username}/id-card/id_card_01.{ext}
     */
    public String uploadIdCardFront(String username, MultipartFile file) {
        return upload(username, "id-card", "id_card_front", file);
    }

    /**
     * Upload CMND/CCCD mặt sau.
     * Key: driver/{username}/id-card/id_card_02.{ext}
     */
    public String uploadIdCardBack(String username, MultipartFile file) {
        return upload(username, "id-card", "id_card_back", file);
    }

    /**
     * Upload GPLX mặt trước.
     * Key: driver/{username}/driver-license/license_front.{ext}
     */
    public String uploadDriverLicenseFront(String username, MultipartFile file) {
        return upload(username, "driver-license", "license_front", file);
    }

    /**
     * Upload GPLX mặt sau.
     * Key: driver/{username}/driver-license/license_back.{ext}
     */
    public String uploadDriverLicenseBack(String username, MultipartFile file) {
        return upload(username, "driver-license", "license_back", file);
    }

    /**
     * Upload GPLX Ô tô mặt trước.
     * Key: driver/{username}/driver-license/license_car_front.{ext}
     */
    public String uploadDriverLicenseCarFront(String username, MultipartFile file) {
        return upload(username, "driver-license", "license_car_front", file);
    }

    /**
     * Upload GPLX Ô tô mặt sau.
     * Key: driver/{username}/driver-license/license_car_back.{ext}
     */
    public String uploadDriverLicenseCarBack(String username, MultipartFile file) {
        return upload(username, "driver-license", "license_car_back", file);
    }

    /**
     * Upload GPLX Xe máy mặt trước.
     * Key: driver/{username}/driver-license/license_motorbike_front.{ext}
     */
    public String uploadDriverLicenseMotorbikeFront(String username, MultipartFile file) {
        return upload(username, "driver-license", "license_motorbike_front", file);
    }

    /**
     * Upload GPLX Xe máy mặt sau.
     * Key: driver/{username}/driver-license/license_motorbike_back.{ext}
     */
    public String uploadDriverLicenseMotorbikeBack(String username, MultipartFile file) {
        return upload(username, "driver-license", "license_motorbike_back", file);
    }

    /**
     * Upload đăng ký xe.
     * Key: driver/{username}/registration-front/registration_front.{ext}
     */
    public String uploadRegistrationFront(String username, MultipartFile file) {
        return upload(username, "registration-front", "registration_front", file);
    }

    /**
     * Upload ảnh biển số xe.
     * Key: driver/{username}/plate/plate_img.{ext}
     */
    public String uploadPlate(String username, MultipartFile file) {
        return upload(username, "plate", "plate_img", file);
    }

    /**
     * Upload giấy đăng ký xe — có index để tránh đè nhau khi thêm nhiều xe.
     * Key: driver/{username}/registration-front/registration_front_{index}.{ext}
     */
    public String uploadRegistrationFrontIndexed(String username, long index, MultipartFile file) {
        return upload(username, "registration-front", "registration_front_" + index, file);
    }

    /**
     * Upload ảnh biển số — có index để tránh đè nhau khi thêm nhiều xe.
     * Key: driver/{username}/plate/plate_img_{index}.{ext}
     */
    public String uploadPlateIndexed(String username, long index, MultipartFile file) {
        return upload(username, "plate", "plate_img_" + index, file);
    }

    // ─────────────────────────────────── OVERWRITE METHODS (IN-PLACE OVERWRITE)

    /**
     * Ghi đè vào đường dẫn cũ nếu có cùng extension, hoặc xóa file cũ và ghi file mới nếu extension thay đổi.
     */
    public String overwriteOrUpload(String username, String folder, String fileName, String existingS3Url, MultipartFile file) {
        ImageFormat format = detectFormat(file);
        String targetKey;

        if (existingS3Url != null && existingS3Url.startsWith("s3://" + bucket + "/")) {
            String oldKey = keyOf(existingS3Url);
            if (oldKey.endsWith(format.extension)) {
                // Cùng định dạng -> Giữ nguyên key cũ và ghi đè trực tiếp
                targetKey = oldKey;
            } else {
                // Khác định dạng -> Xóa key cũ, tạo key mới
                deleteQuietly(existingS3Url);
                targetKey = "driver/" + username + "/" + folder + "/" + fileName + format.extension;
            }
        } else {
            targetKey = "driver/" + username + "/" + folder + "/" + fileName + format.extension;
        }

        try (InputStream stream = file.getInputStream()) {
            client.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(targetKey)
                            .stream(stream, file.getSize(), -1L)
                            .contentType(format.contentType)
                            .build());

            return "s3://" + bucket + "/" + targetKey;
        } catch (Exception exception) {
            throw new ObjectStorageException("Could not upload/overwrite driver image", exception);
        }
    }

    public String overwriteIdCardFront(String username, String existingUrl, MultipartFile file) {
        return overwriteOrUpload(username, "id-card", "id_card_front", existingUrl, file);
    }

    public String overwriteIdCardBack(String username, String existingUrl, MultipartFile file) {
        return overwriteOrUpload(username, "id-card", "id_card_back", existingUrl, file);
    }

    public String overwriteDriverLicenseFront(String username, String existingUrl, MultipartFile file) {
        return overwriteOrUpload(username, "driver-license", "license_front", existingUrl, file);
    }

    public String overwriteDriverLicenseBack(String username, String existingUrl, MultipartFile file) {
        return overwriteOrUpload(username, "driver-license", "license_back", existingUrl, file);
    }

    public String overwriteDriverLicenseCarFront(String username, String existingUrl, MultipartFile file) {
        return overwriteOrUpload(username, "driver-license", "license_car_front", existingUrl, file);
    }

    public String overwriteDriverLicenseCarBack(String username, String existingUrl, MultipartFile file) {
        return overwriteOrUpload(username, "driver-license", "license_car_back", existingUrl, file);
    }

    public String overwriteDriverLicenseMotorbikeFront(String username, String existingUrl, MultipartFile file) {
        return overwriteOrUpload(username, "driver-license", "license_motorbike_front", existingUrl, file);
    }

    public String overwriteDriverLicenseMotorbikeBack(String username, String existingUrl, MultipartFile file) {
        return overwriteOrUpload(username, "driver-license", "license_motorbike_back", existingUrl, file);
    }

    public String overwriteRegistrationFront(String username, String existingUrl, MultipartFile file) {
        return overwriteOrUpload(username, "registration-front", "registration_front", existingUrl, file);
    }

    public String overwritePlate(String username, String existingUrl, MultipartFile file) {
        return overwriteOrUpload(username, "plate", "plate_img", existingUrl, file);
    }

    // ─────────────────────────────────── COMMON METHODS

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
            log.error("Could not remove orphaned driver image {}", objectUrl, exception);
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
            throw new ObjectStorageException("Could not create image view URL", exception);
        }
    }

    // ─────────────────────────────────── PRIVATE HELPERS

    /**
     * Upload file lên MinIO.
     * Key format: driver/{username}/{folder}/{fileName}.{ext}
     * Ví dụ: driver/driver1/id-card/id_card_01.jpg
     */
    private String upload(String username, String folder, String fileName, MultipartFile file) {
        ImageFormat format = detectFormat(file);
        String key = "driver/" + username + "/" + folder + "/" + fileName + format.extension;

        try (InputStream stream = file.getInputStream()) {
            client.putObject(
                    PutObjectArgs.builder()
                            .bucket(bucket)
                            .object(key)
                            .stream(stream, file.getSize(), -1L)
                            .contentType(format.contentType)
                            .build());

            // URI ổn định để lưu trong DB
            return "s3://" + bucket + "/" + key;
        } catch (Exception exception) {
            throw new ObjectStorageException("Could not upload driver image", exception);
        }
    }

    private String keyOf(String objectUrl) {
        String prefix = "s3://" + bucket + "/";
        if (objectUrl == null || !objectUrl.startsWith(prefix)) {
            throw new IllegalArgumentException("Object URL does not belong to driver bucket");
        }
        return objectUrl.substring(prefix.length());
    }

    private ImageFormat detectFormat(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > MAX_IMAGE_SIZE) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Kích thước tệp không hợp lệ (1 byte - 15MB)");
        }

        try (InputStream stream = file.getInputStream()) {
            byte[] header = stream.readNBytes(16);

            // 1. Kiểm tra chuẩn magic bytes JPEG: 0xFF, 0xD8
            if (header.length >= 2
                    && (header[0] & 0xff) == 0xff
                    && (header[1] & 0xff) == 0xd8) {
                return ImageFormat.JPEG;
            }

            // 2. Kiểm tra chuẩn magic bytes PNG: 0x89, 'P', 'N', 'G'
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

            // 3. Kiểm tra chuẩn magic bytes PDF: %PDF-
            if (header.length >= 4
                    && header[0] == '%'
                    && header[1] == 'P'
                    && header[2] == 'D'
                    && header[3] == 'F') {
                return ImageFormat.PDF;
            }

            // 4. Kiểm tra chuẩn magic bytes WEBP: RIFF....WEBP
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

            // 5. Kiểm tra chuẩn magic bytes HEIC / HEIF: ....ftyp(heic|mif1|msf1)
            if (header.length >= 12
                    && header[4] == 'f'
                    && header[5] == 't'
                    && header[6] == 'y'
                    && header[7] == 'p') {
                String brand = new String(header, 8, 4).toLowerCase();
                if (brand.contains("heic") || brand.contains("mif1") || brand.contains("msf1")) {
                    return ImageFormat.HEIC;
                }
            }

            // 6. Kiểm tra chuẩn magic bytes GIF: GIF8
            if (header.length >= 4
                    && header[0] == 'G'
                    && header[1] == 'I'
                    && header[2] == 'F'
                    && header[3] == '8') {
                return ImageFormat.GIF;
            }

            // 7. Kiểm tra chuẩn magic bytes BMP: BM
            if (header.length >= 2
                    && header[0] == 'B'
                    && header[1] == 'M') {
                return ImageFormat.BMP;
            }

            // 8. Fallback theo Content-Type
            String contentType = file.getContentType();
            if (contentType != null) {
                String lowerContentType = contentType.toLowerCase();
                if (lowerContentType.contains("jpeg") || lowerContentType.contains("jpg")) {
                    return ImageFormat.JPEG;
                }
                if (lowerContentType.contains("png")) {
                    return ImageFormat.PNG;
                }
                if (lowerContentType.contains("pdf")) {
                    return ImageFormat.PDF;
                }
                if (lowerContentType.contains("webp")) {
                    return ImageFormat.WEBP;
                }
                if (lowerContentType.contains("heic") || lowerContentType.contains("heif")) {
                    return ImageFormat.HEIC;
                }
                if (lowerContentType.contains("gif")) {
                    return ImageFormat.GIF;
                }
                if (lowerContentType.contains("bmp")) {
                    return ImageFormat.BMP;
                }
            }

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Định dạng tệp không được hỗ trợ. Chấp nhận: JPG, PNG, PDF, WEBP, HEIC, GIF, BMP.");
        } catch (IOException exception) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Không thể đọc tệp tài liệu đã tải lên",
                    exception);
        }
    }

    private enum ImageFormat {
        JPEG(".jpg", "image/jpeg"),
        PNG(".png", "image/png"),
        WEBP(".webp", "image/webp"),
        HEIC(".heic", "image/heic"),
        HEIF(".heif", "image/heif"),
        PDF(".pdf", "application/pdf"),
        GIF(".gif", "image/gif"),
        BMP(".bmp", "image/bmp");

        private final String extension;
        private final String contentType;

        ImageFormat(String extension, String contentType) {
            this.extension = extension;
            this.contentType = contentType;
        }
    }
}