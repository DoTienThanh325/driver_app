package com.driverapp.bookingservice.service.impl;

import com.driverapp.bookingservice.client.UserServiceClient;
import com.driverapp.bookingservice.dto.request.RegisterBusinessRequest;
import com.driverapp.bookingservice.dto.request.ReviewBusinessRequest;
import com.driverapp.bookingservice.dto.response.RegisterBusinessResponse;
import com.driverapp.bookingservice.models.BusinessRegistration;
import com.driverapp.bookingservice.models.Restaurant;
import com.driverapp.bookingservice.models.enums.BusinessRegistrationStatus;
import com.driverapp.bookingservice.repository.BusinessRegistrationRepository;
import com.driverapp.bookingservice.repository.RestaurantRepository;
import com.driverapp.bookingservice.service.BusinessRegistrationService;
import com.driverapp.bookingservice.storage.BusinessImageStorage;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BusinessRegistrationServiceImpl implements BusinessRegistrationService {

    private final RestaurantRepository restaurantRepository;
    private final BusinessRegistrationRepository businessRegistrationRepository;
    private final BusinessImageStorage imageStorage;
    private final UserServiceClient userServiceClient;

    // ───────────────────────────── CUSTOMER: ĐĂNG KÝ KINH DOANH (chỉ 1 lần)
    @Override
    public RegisterBusinessResponse register(UUID userId, RegisterBusinessRequest request) {

        // 1 user chỉ đăng ký 1 lần
        if (businessRegistrationRepository.existsByUserId(userId)) {
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

        // Bước 2: Tạo Restaurant trước (dùng builder)
        Restaurant restaurant = Restaurant.builder()
                .name(request.getRestaurantName())
                .locationAddress(request.getRestaurantAddress())
                .locationLatitude(request.getRestaurantLatitude())
                .locationLongitude(request.getRestaurantLongitude())
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        Restaurant savedRestaurant = restaurantRepository.save(restaurant);

        // Bước 3: Tạo BusinessRegistration (dùng builder)
        BusinessRegistration registration = BusinessRegistration.builder()
                .userId(userId)
                .restaurantId(savedRestaurant.getId())
                .businessLicense(licenseUrls)
                .status(BusinessRegistrationStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        BusinessRegistration saved = businessRegistrationRepository.save(registration);

        return new RegisterBusinessResponse(
                saved.getId(),
                savedRestaurant.getId(),
                saved.getStatus().name(),
                "Đăng ký kinh doanh thành công, đang chờ xét duyệt."
        );
    }

    // ───────────────────────────── CUSTOMER: XEM ĐƠN CỦA MÌNH (1 đơn duy nhất)
    @Override
    public BusinessRegistration getMyRegistration(UUID userId) {
        return businessRegistrationRepository.findByUserId(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Bạn chưa có đơn đăng ký kinh doanh."));
    }

    // ───────────────────────────── ADMIN: DUYỆT HOẶC TỪ CHỐI (1 API gộp)
    @Override
    public BusinessRegistration review(String registrationId, ReviewBusinessRequest request) {
        BusinessRegistration reg = findOrThrow(registrationId);

        if (reg.getStatus() != BusinessRegistrationStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Đơn đã được xử lý (trạng thái hiện tại: " + reg.getStatus() + ")");
        }

        if (request.status() == BusinessRegistrationStatus.REJECTED
                && (request.rejectReason() == null || request.rejectReason().isBlank())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Cần nhập lý do từ chối khi status = REJECTED");
        }

        if (request.status() == BusinessRegistrationStatus.PENDING) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "status phải là ACCEPTED hoặc REJECTED");
        }

        if(request.status() == BusinessRegistrationStatus.ACCEPTED) {
                // Gọi userservice cấp role BUSINESS
                userServiceClient.grantRole(reg.getUserId(), "BUSINESS");
        }

        BusinessRegistration updated = BusinessRegistration.builder()
                .id(reg.getId())
                .userId(reg.getUserId())
                .restaurantId(reg.getRestaurantId())
                .businessLicense(reg.getBusinessLicense())
                .status(request.status())
                .rejectReason(request.rejectReason())
                .createdAt(reg.getCreatedAt())
                .updatedAt(LocalDateTime.now())
                .build();

        return businessRegistrationRepository.save(updated);
    }

    // ───────────────────────────── ADMIN: DANH SÁCH THEO STATUS
    @Override
    public List<BusinessRegistration> listByStatus(BusinessRegistrationStatus status) {
        return businessRegistrationRepository.findByStatus(status);
    }

    // ───────────────────────────── HELPER
    private BusinessRegistration findOrThrow(String id) {
        return businessRegistrationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy đơn đăng ký với id: " + id));
    }
}
