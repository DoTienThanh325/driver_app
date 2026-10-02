package com.driverapp.bookingservice.dto.request;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Getter
@Setter 
@AllArgsConstructor
public class RegisterBusinessRequest {
    // Thông tin nhà hàng
    private String restaurantName;
    private String restaurantAddress;
    private double restaurantLatitude;
    private double restaurantLongitude;

    // Ảnh giấy phép kinh doanh (upload trực tiếp)
    private List<MultipartFile> businessLicenseImages;
}
