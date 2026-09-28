package com.driverapp.driverservice.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class DriverTestController {

    @GetMapping("/api/drivers/test")
    public Map<String, String> testGatewayRoute() {
        return Map.of("message", "Driver service route is working");
    }
}
