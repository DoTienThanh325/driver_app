package com.driverapp.userservice.service.impl;

import com.driverapp.userservice.service.SmsSender;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class LocalSmsSender implements SmsSender {

    @Override
    public void sendOtp(
            String phoneNumber,
            String otp
    ) {
        log.info(
                "[LOCAL ONLY] OTP cho {}: {}",
                phoneNumber,
                otp
        );
    }
}