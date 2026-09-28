package com.driverapp.userservice.config;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "app.otp")
public class OtpProperties {

    @Min(1)
    private int expiresMinutes;

    @NotBlank
    private String challengeSecret;
}