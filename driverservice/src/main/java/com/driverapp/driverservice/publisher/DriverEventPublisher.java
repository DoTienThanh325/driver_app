package com.driverapp.driverservice.publisher;

import com.driverapp.driverservice.config.rabbitmq.DriverRabbitMQConfig;
import com.driverapp.driverservice.event.DomainEvent;
import com.driverapp.driverservice.event.DriverApprovedPayload;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class DriverEventPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publishDriverApproved(String driverId, String userId) {
        DriverApprovedPayload payload = DriverApprovedPayload.builder()
                .driverId(driverId)
                .userId(userId)
                .build();

        DomainEvent<DriverApprovedPayload> event = DomainEvent.of(
                "driver.approved",
                "driverservice",
                payload
        );

        log.info("[Event] Publishing driver.approved: driverId={}, userId={}", driverId, userId);
        rabbitTemplate.convertAndSend(DriverRabbitMQConfig.DRIVER_DIRECT_EXCHANGE, "driver.approved", event);
    }
}
