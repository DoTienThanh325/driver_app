package com.driverapp.bookingservice.listener;

import com.driverapp.bookingservice.event.MatchingRoundRequest;
import com.driverapp.bookingservice.service.impl.MatchingServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class MatchingRoundListener {
    private final MatchingServiceImpl matchingService;
    @RabbitListener(queues = "matching.round.queue", containerFactory = "resilienceRabbitListenerContainerFactory")
    public void resume(MatchingRoundRequest request) {
        matchingService.resumeRound(request.tripId(), request.round());
    }
}
