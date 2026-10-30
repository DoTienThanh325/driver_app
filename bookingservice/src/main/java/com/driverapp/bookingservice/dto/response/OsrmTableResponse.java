package com.driverapp.bookingservice.dto.response;

import java.util.List;

public record OsrmTableResponse(
        String code,
        List<List<Double>> durations, // Ma trận thời gian di chuyển (tính bằng giây)
        List<List<Double>> distances  // Ma trận khoảng cách di chuyển (tính bằng mét)
) {}
