package com.driverapp.driverservice.dto.request;

import org.springframework.web.multipart.MultipartFile;

public record UpdateDriverRegistrationRequest(
        MultipartFile idCardFront,
        MultipartFile idCardBack,
        MultipartFile driverLicenseFront,
        MultipartFile driverLicenseBack,
        MultipartFile registrationFront,
        MultipartFile plate
) {
    /**
     * Kiểm tra xem người dùng có gửi lên ít nhất 1 file hay không.
     */
    public boolean hasAtLeastOneFile() {
        return (idCardFront != null && !idCardFront.isEmpty())
                || (idCardBack != null && !idCardBack.isEmpty())
                || (driverLicenseFront != null && !driverLicenseFront.isEmpty())
                || (driverLicenseBack != null && !driverLicenseBack.isEmpty())
                || (registrationFront != null && !registrationFront.isEmpty())
                || (plate != null && !plate.isEmpty());
    }
}
