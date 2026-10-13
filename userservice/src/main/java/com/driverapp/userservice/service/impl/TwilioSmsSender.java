package com.driverapp.userservice.service.impl;

import com.driverapp.userservice.config.TwilioSmsProperties;
import com.driverapp.userservice.service.SmsSender;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Slf4j
@Service
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "twilio", matchIfMissing = true)
public class TwilioSmsSender implements SmsSender {

    private final TwilioSmsProperties properties;
    private final RestClient restClient;

    public TwilioSmsSender(TwilioSmsProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.builder().build();
    }

    @Override
    public void sendOtp(String phoneNumber, String otp) {
        // Xác định số điện thoại gửi tới
        String targetPhone;
        String messageBody;

        if (properties.overrideEnabled() && properties.defaultPhoneNumber() != null && !properties.defaultPhoneNumber().isBlank()) {
            targetPhone = properties.defaultPhoneNumber();
            messageBody = String.format("[DriverApp] Ma OTP cho tai khoan %s la: %s. Ma co hieu luc trong 5 phut.", phoneNumber, otp);
            log.info("[Twilio SMS] Chế độ Override kích hoạt: Gửi OTP của {} về số mặc định {}", phoneNumber, targetPhone);
        } else {
            targetPhone = formatToE164(phoneNumber);
            messageBody = String.format("[DriverApp] Ma OTP dang nhap cua ban la: %s. Ma co hieu luc trong 5 phut.", otp);
        }

        TwilioSmsProperties.TwilioConfig twilio = properties.twilio();
        if (twilio == null || twilio.accountSid() == null || twilio.authToken() == null || twilio.authToken().isBlank()) {
            log.warn("[Twilio SMS] Chưa cấu hình Twilio Auth Token (hoặc Account SID)! In mã OTP ra log để test: {} cho {}", otp, targetPhone);
            return;
        }

        try {
            String twilioUrl = String.format("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", twilio.accountSid());

            // Basic Auth header: AccountSid:AuthToken
            String auth = twilio.accountSid() + ":" + twilio.authToken();
            String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));

            // Form data x-www-form-urlencoded
            MultiValueMap<String, String> formData = new LinkedMultiValueMap<>();
            formData.add("From", twilio.fromPhoneNumber());
            formData.add("To", targetPhone);
            formData.add("Body", messageBody);

            String response = restClient.post()
                    .uri(twilioUrl)
                    .header(HttpHeaders.AUTHORIZATION, "Basic " + encodedAuth)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(formData)
                    .retrieve()
                    .body(String.class);

            log.info("[Twilio SMS] Đã gửi OTP thành công tới {}. Twilio response: {}", targetPhone, response);
        } catch (org.springframework.web.client.RestClientResponseException e) {
            log.error("[Twilio SMS] Gửi SMS thất bại tới {}: HTTP {} - Chi tiết từ Twilio: {}. Mã OTP vẫn được in để test: {}", 
                    targetPhone, e.getStatusCode(), e.getResponseBodyAsString(), otp);
        } catch (Exception e) {
            log.error("[Twilio SMS] Gửi SMS thất bại tới {}: {}. Vẫn in mã OTP ra log để test: {}", targetPhone, e.getMessage(), otp);
        }
    }

    /**
     * Chuẩn hóa số điện thoại Việt Nam sang định dạng E.164 (+84...)
     * Ví dụ: 0911000001 -> +84911000001
     */
    private String formatToE164(String phone) {
        if (phone == null || phone.isBlank()) return phone;
        String cleaned = phone.replaceAll("[^0-9+]", "");
        if (cleaned.startsWith("+")) {
            return cleaned;
        }
        if (cleaned.startsWith("0")) {
            return "+84" + cleaned.substring(1);
        }
        return "+84" + cleaned;
    }
}
