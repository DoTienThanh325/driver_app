package com.driverapp.bookingservice.service;

import com.driverapp.bookingservice.dto.request.RegisterBusinessRequest;
import com.driverapp.bookingservice.dto.request.ReviewBusinessRequest;
import com.driverapp.bookingservice.dto.response.RegisterBusinessResponse;
import com.driverapp.bookingservice.models.BusinessRegistration;
import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;

import java.util.List;
import java.util.UUID;

public interface BusinessRegistrationService {

    /** Customer đăng ký kinh doanh (chỉ 1 lần duy nhất) */
    RegisterBusinessResponse register(UUID userId, RegisterBusinessRequest request);

    /** Customer xem đơn của mình (1 đơn duy nhất) */
    BusinessRegistration getMyRegistration(UUID userId);

    /** Admin duyệt hoặc từ chối đơn (1 API gộp) */
    BusinessRegistration review(String registrationId, ReviewBusinessRequest request);

    /** Admin xem danh sách theo trạng thái */
    List<BusinessRegistration> listByStatus(BusinessRegistrationStatus status);
}
