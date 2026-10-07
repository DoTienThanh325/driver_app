package com.driverapp.driverservice.controller;

import com.driverapp.driverservice.dto.response.DriverCandidateResponse;
import com.driverapp.driverservice.dto.response.DriverDetailResponse;
import com.driverapp.driverservice.service.DriverCandidateService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverCandidateController {

    private final DriverCandidateService candidateService;

    /**
     * GET /api/drivers/candidates
     * Admin xem danh sách các tài xế mới đăng ký (PENDING).
     * Đầu ra là List<DriverCandidateResponse>.
     */
    @GetMapping("/candidates")
    public List<DriverCandidateResponse> getPendingCandidates() {
        return candidateService.getPendingCandidates();
    }

    /**
     * GET /api/drivers/{driverId}
     * Lấy thông tin chi tiết hồ sơ tài xế:
     * - Trích xuất userId & roles từ JWT.
     * - Kiểm tra sở hữu nếu là CUSTOMER hoặc DRIVER (chỉ xem được hồ sơ do chính
     * mình đăng ký).
     * - Admin có quyền xem bất kỳ tài xế nào.
     * - Tất cả URL ảnh (CCCD, Bằng lái, Phương tiện) được chuyển thành Presigned
     * URL MinIO.
     */
    @GetMapping("/{driverId}")
    public DriverDetailResponse getDriverDetail(
            @PathVariable UUID driverId,
            @AuthenticationPrincipal Jwt jwt) {
        UUID currentUserId = jwt != null ? UUID.fromString(jwt.getSubject()) : null;
        List<String> roles = jwt != null ? jwt.getClaimAsStringList("roles") : List.of();
        return candidateService.getDriverDetail(driverId, currentUserId, roles);
    }
}
