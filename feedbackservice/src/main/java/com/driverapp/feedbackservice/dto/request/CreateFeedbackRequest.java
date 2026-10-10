package com.driverapp.feedbackservice.dto.request;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateFeedbackRequest {

    @NotNull(message = "driverId không được để trống")
    private UUID driverId;

    @NotBlank(message = "tripId không được để trống")
    private String tripId;

    @NotNull(message = "rating không được để trống")
    @DecimalMin(value = "1.0", message = "Điểm đánh giá tối thiểu là 1.0")
    @DecimalMax(value = "5.0", message = "Điểm đánh giá tối đa là 5.0")
    private Double rating;

    @Size(max = 500, message = "Nội dung nhận xét tối đa 500 ký tự")
    private String comment;
}
