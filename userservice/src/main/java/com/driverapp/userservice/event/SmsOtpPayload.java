package com.driverapp.userservice.event;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SmsOtpPayload {
    private String phoneNumber;
    private String otpCode;
}
