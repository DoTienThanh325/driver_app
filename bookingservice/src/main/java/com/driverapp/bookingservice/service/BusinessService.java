package com.driverapp.bookingservice.service;

import com.driverapp.bookingservice.dto.request.RegisterBusinessRequest;
import com.driverapp.bookingservice.dto.request.ReviewBusinessRequest;
import com.driverapp.bookingservice.dto.response.BusinessRegistrationDetailResponse;
import com.driverapp.bookingservice.dto.response.RegisterBusinessResponse;
import com.driverapp.bookingservice.models.Business;
import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;

import java.util.*;

public interface BusinessService {

    /** Customer đăng ký kinh doanh (chỉ 1 lần duy nhất) */
    RegisterBusinessResponse register(UUID userId, RegisterBusinessRequest request);

    /** Customer xem đơn của mình (1 đơn duy nhất) */
    Business getMyBusiness(UUID userId);

    /** Lấy chi tiết hồ sơ kinh doanh (kết hợp tên nhà hàng, địa chỉ, ảnh giấy phép MinIO) theo userId */
    BusinessRegistrationDetailResponse getRegistrationDetailByUserId(UUID userId);

    /** Admin duyệt hoặc từ chối đơn (1 API gộp) */
    Map<String, String> updateStatus(String registrationId, ReviewBusinessRequest request);

    /** Admin xem danh sách theo trạng thái */
    List<Business> listByStatus(BusinessRegistrationStatus status);
}
