package com.driverapp.userservice.service.impl;

import com.driverapp.userservice.service.SmsSender;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class LocalSmsSender implements SmsSender {
    @org.springframework.beans.factory.annotation.Value("${resilience.auth.expose-otp:false}")
    private boolean exposeOtp;

    @Override
    public void sendOtp(
            String phoneNumber,
            String otp
    ) {
        if (!exposeOtp) throw new IllegalStateException("Configure a production SmsSender or enable local AUTH_EXPOSE_OTP");
        log.info("[LOCAL ONLY] OTP for development: {}", otp);
    }
}