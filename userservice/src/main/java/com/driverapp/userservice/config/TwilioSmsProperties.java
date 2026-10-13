package com.driverapp.userservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.sms")
public record TwilioSmsProperties(
        String provider,
        boolean overrideEnabled,
        String defaultPhoneNumber,
        TwilioConfig twilio
) {
    public record TwilioConfig(
            String accountSid,
            String authToken,
            String fromPhoneNumber
    ) {}
}