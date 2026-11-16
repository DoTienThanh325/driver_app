package com.driverapp.bookingservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BusinessRegistrationDetailResponse {
    /** Mã đơn đăng ký kinh doanh */
    private String id;

    /** ID của người dùng sở hữu */
    private UUID userId;

    /** ID nhà hàng được tạo liên kết */
    private String restaurantId;

    /** 1. Tên nhà hàng, quán ăn */
    private String restaurantName;

    /** 2. Địa chỉ nhà hàng */
    private String restaurantAddress;

    /** Tọa độ định vị quán */
    private double restaurantLatitude;
    private double restaurantLongitude;

    /** 3. Danh sách URL ảnh giấy phép kinh doanh / minh chứng (MinIO presigned HTTP URLs) */
    private List<String> businessLicenseUrls;

    /** Trạng thái duyệt: PENDING, ACCEPTED, REJECTED, BANNED */
    private String status;

    /** Lý do từ chối nếu status = REJECTED */
    private String rejectReason;

    /** Thời gian đăng ký và cập nhật */
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
