package com.driverapp.userservice.publisher;

import com.driverapp.userservice.config.rabbitmq.UserRabbitMQConfig;
import com.driverapp.userservice.event.DomainEvent;
import com.driverapp.userservice.event.SmsOtpPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SmsEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishSendOtp(String phoneNumber, String otpCode) {
        SmsOtpPayload payload = SmsOtpPayload.builder()
                .phoneNumber(phoneNumber)
                .otpCode(otpCode)
                .build();

        DomainEvent<SmsOtpPayload> event = DomainEvent.of(
                "sms.otp.send",
                "userservice",
                payload
        );

        log.info("[Event] Publishing sms.otp.send: phone={}", phoneNumber);
        rabbitTemplate.convertAndSend(UserRabbitMQConfig.USER_DIRECT_EXCHANGE, "sms.otp.send", event);
    }
}
