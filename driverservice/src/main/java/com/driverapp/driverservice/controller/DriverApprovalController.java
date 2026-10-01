package com.driverapp.driverservice.controller;

import com.driverapp.driverservice.dto.response.DriverApprovalResponse;
import com.driverapp.driverservice.service.DriverApprovalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverApprovalController {

    private final DriverApprovalService driverApprovalService;

    @PutMapping("/{driverId}/approve")
    public ResponseEntity<DriverApprovalResponse> approveDriver(@PathVariable UUID driverId) {
        return ResponseEntity.ok(driverApprovalService.approveDriver(driverId));
    }
}
