package com.driverapp.userservice.service.impl;

import com.driverapp.userservice.service.SmsSender;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class LocalSmsSender implements SmsSender {
    @org.springframework.beans.factory.annotation.Value("${resilience.auth.expose-otp:true}")
    private boolean exposeOtp;

    @Override
    public void sendOtp(
            String phoneNumber,
            String otp
    ) {
        if (!exposeOtp) {
            log.warn("LocalSmsSender: expose-otp is disabled. In production, configure a real SmsSender.");
            return;
        }
        log.info("[LOCAL ONLY] OTP for {}: {}", phoneNumber, otp);
    }
}