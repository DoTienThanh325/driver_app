package com.driverapp.feedbackservice.dto.request;

import com.driverapp.feedbackservice.models.enums.ReportType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateComplaintRequest {

    /**
     * ID tài xế (Bắt buộc khi người gửi là CUSTOMER).
     * Bỏ qua khi người gửi là DRIVER (sẽ tự động lấy qua driverservice).
     */
    private UUID driverId;

    /**
     * ID khách hàng (Bắt buộc khi người gửi là DRIVER).
     * Bỏ qua khi người gửi là CUSTOMER (sẽ lấy từ JWT subject).
     */
    private UUID customerId;

    /**
     * Mã chuyến đi liên quan.
     */
    @NotBlank(message = "Mã chuyến đi (tripId) không được để trống")
    private String tripId;

    /**
     * Loại báo cáo vi phạm.
     */
    @NotNull(message = "Loại báo cáo (reportType) không được để trống")
    private ReportType reportType;
}
