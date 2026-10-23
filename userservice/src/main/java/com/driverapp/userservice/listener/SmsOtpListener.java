package com.driverapp.userservice.listener;

import com.driverapp.userservice.event.DomainEvent;
import com.driverapp.userservice.event.SmsOtpPayload;
import com.driverapp.userservice.service.SmsSender;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SmsOtpListener {

    private final SmsSender smsSender;

    @RabbitListener(queues = "user.sms-otp.queue")
    public void handleSendSmsOtp(DomainEvent<SmsOtpPayload> event) {
        SmsOtpPayload payload = event.getPayload();
        log.info("[SMS Consumer] Đang gửi OTP bất đồng bộ đến số điện thoại {}: mã={}",
                payload.getPhoneNumber(), payload.getOtpCode());
        smsSender.sendOtp(payload.getPhoneNumber(), payload.getOtpCode());
    }
}
