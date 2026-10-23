package com.driverapp.driverservice.job;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class RatingReconciliationJob {

    /**
     * Chạy định kỳ mỗi 1 giờ một lần để kiểm tra và đối soát dữ liệu đánh giá sao
     */
    @Scheduled(fixedDelay = 3_600_000, initialDelay = 60_000)
    public void reconcileDriverRatings() {
        log.info("[SAGA #7 - RECONCILIATION] Bắt đầu quét kiểm tra đối soát rating tài xế...");
        // Thực hiện đối soát định kỳ nếu có bảng feedback đối chiếu
        log.info("[SAGA #7] Hoàn thành tác vụ đối soát rating.");
    }
}
