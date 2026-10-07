package com.driverapp.bookingservice.service.impl;

import com.driverapp.bookingservice.client.UserServiceClient;
import com.driverapp.bookingservice.dto.request.RegisterBusinessRequest;
import com.driverapp.bookingservice.dto.request.ReviewBusinessRequest;
import com.driverapp.bookingservice.dto.response.RegisterBusinessResponse;
import com.driverapp.bookingservice.models.Business;
import com.driverapp.bookingservice.models.Restaurant;
import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;
import com.driverapp.bookingservice.repository.BusinessRepository;
import com.driverapp.bookingservice.dto.request.RestaurantRequest;
import com.driverapp.bookingservice.service.BusinessService;
import com.driverapp.bookingservice.service.RestaurantService;
import com.driverapp.bookingservice.storage.BusinessImageStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BusinessServiceImpl implements BusinessService {

        private final RestaurantService restaurantService;
        private final BusinessRepository businessRepository;
        private final BusinessImageStorage imageStorage;
        private final UserServiceClient userServiceClient;

        // ───────────────────────────── CUSTOMER: ĐĂNG KÝ KINH DOANH (chỉ 1 lần)
        @Override
        public RegisterBusinessResponse register(UUID userId, RegisterBusinessRequest request) {

                // 1 user chỉ đăng ký 1 lần
                if (businessRepository.existsByUserId(userId)) {
                        throw new ResponseStatusException(
                                        HttpStatus.CONFLICT,
                                        "Bạn đã có đơn đăng ký kinh doanh. Mỗi tài khoản chỉ được đăng ký một lần.");
                }

                // Validate ảnh trước khi làm gì khác
                List<MultipartFile> files = request.getBusinessLicenseImages();
                if (files == null || files.isEmpty()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        "Cần ít nhất một ảnh giấy phép kinh doanh");
                }
                files.forEach(imageStorage::validate);

                // Bước 1: Upload ảnh giấy phép lên MinIO → lấy URL lưu DB
                // Key format: business/{restaurantName}/license/license_01, license_02, ...
                List<String> licenseUrls = new ArrayList<>();
                for (int i = 0; i < files.size(); i++) {
                        String url = imageStorage.upload(request.getRestaurantName(), i + 1, files.get(i));
                        licenseUrls.add(url);
                }

                // Bước 2: Tạo Restaurant trước (qua RestaurantService)
                Restaurant savedRestaurant = restaurantService.createRestaurant(
                                new RestaurantRequest(
                                                request.getRestaurantName(),
                                                request.getRestaurantAddress(),
                                                request.getRestaurantLatitude(),
                                                request.getRestaurantLongitude()
                                )
                );

                // Bước 3: Tạo Business (dùng builder)
                Business business = Business.builder()
                                .userId(userId)
                                .restaurantId(savedRestaurant.getId())
                                .businessLicense(licenseUrls)
                                .status(BusinessRegistrationStatus.PENDING)
                                .createdAt(LocalDateTime.now())
                                .updatedAt(LocalDateTime.now())
                                .build();

                Business saved = businessRepository.save(business);

                return new RegisterBusinessResponse(
                                saved.getId(),
                                savedRestaurant.getId(),
                                saved.getStatus().name(),
                                "Đăng ký kinh doanh thành công, đang chờ xét duyệt.");
        }

        // ───────────────────────────── CUSTOMER: XEM ĐƠN CỦA MÌNH (1 đơn duy nhất)
        @Override
        public Business getMyBusiness(UUID userId) {
                return businessRepository.findByUserId(userId)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Bạn chưa có đơn đăng ký kinh doanh."));
        }

        // ───────────────────────────── ADMIN: DUYỆT HOẶC TỪ CHỐI (1 API gộp)
        @Override
        public Map<String, String> updateStatus(String registrationId, ReviewBusinessRequest request) {
                Business reg = findOrThrow(registrationId);

                if (request.status() == BusinessRegistrationStatus.REJECTED
                                && (request.rejectReason() == null || request.rejectReason().isBlank())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST, "Cần nhập lý do từ chối khi status = REJECTED");
                }

                if (request.status() == BusinessRegistrationStatus.BANNED
                                && (request.banReason() == null || request.banReason().isBlank())) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST, "Cần nhập lý do từ chối khi status = BANNED");
                }

                if (request.status() == BusinessRegistrationStatus.PENDING) {
                        throw new ResponseStatusException(
                                        HttpStatus.BAD_REQUEST, "status phải là ACCEPTED hoặc REJECTED hoặc BANNED");
                }

                if (request.status() == BusinessRegistrationStatus.ACCEPTED) {
                        // Gọi userservice cấp role BUSINESS
                        userServiceClient.grantRole(reg.getUserId(), "BUSINESS");
                }

                if (request.status() == BusinessRegistrationStatus.BANNED) {
                        // Gọi userservice thu hồi role BUSINESS
                        userServiceClient.revokeRole(reg.getUserId(), "BUSINESS");
                }

                reg.setStatus(request.status());
                reg.setRejectReason(request.rejectReason() != null && !request.rejectReason().isBlank()
                                ? request.rejectReason()
                                : null);
                reg.setBanReason(request.banReason() != null && !request.banReason().isBlank() ? request.banReason()
                                : null);
                reg.setUpdatedAt(LocalDateTime.now());

                businessRepository.save(reg);

                return Map.of("Message", "Đơn đăng ký đã được xử lý thành công");
        }

        // ───────────────────────────── ADMIN: DANH SÁCH THEO STATUS
        @Override
        public List<Business> listByStatus(BusinessRegistrationStatus status) {
                return businessRepository.findByStatus(status);
        }

        // ───────────────────────────── HELPER
        private Business findOrThrow(String id) {
                return businessRepository.findById(id)
                                .orElseThrow(() -> new ResponseStatusException(
                                                HttpStatus.NOT_FOUND, "Không tìm thấy đơn đăng ký với id: " + id));
        }
}
