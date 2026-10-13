package com.driverapp.userservice.service.impl;

import com.driverapp.userservice.service.SmsSender;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "local")
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