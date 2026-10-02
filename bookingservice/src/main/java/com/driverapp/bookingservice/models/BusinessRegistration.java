package com.driverapp.bookingservice.models;

import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "business_registrations")
public class BusinessRegistration {

    @Id
    private String id;

    private UUID userId;

    @Builder.Default
    private BusinessRegistrationStatus status = BusinessRegistrationStatus.PENDING;

    private String rejectReason;

    private String restaurantId;

    /** URL ảnh giấy phép kinh doanh đã lưu trên MinIO (dạng s3://bucket/key) */
    private List<String> businessLicense;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
