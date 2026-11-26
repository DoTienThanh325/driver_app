package com.driverapp.notificationservice;

import com.driverapp.notificationservice.dto.websocket.NotificationMessage;
import com.driverapp.notificationservice.event.DomainEvent;
import com.driverapp.notificationservice.event.DriverOfferEventPayload;
import com.driverapp.notificationservice.listener.DriverOfferNotificationListener;
import com.driverapp.notificationservice.websocket.WebSocketNotificationPusher;
import com.driverapp.notificationservice.websocket.WebSocketSessionRegistry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class DriverOfferNotificationListenerTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private WebSocketSessionRegistry sessionRegistry;
    private DriverOfferNotificationListener listener;

    @BeforeEach
    void setUp() {
        sessionRegistry = new WebSocketSessionRegistry();
        WebSocketNotificationPusher pusher = new WebSocketNotificationPusher(
                messagingTemplate,
                sessionRegistry,
                new SimpleMeterRegistry()
        );
        listener = new DriverOfferNotificationListener(pusher);
    }

    @Test
    void pushesOfferUpdatedEventToOnlineDriver() {
        String driverId = UUID.randomUUID().toString();
        sessionRegistry.register(driverId, "sess-driver-1");

        listener.handleDriverOfferUpdated(DomainEvent.of(
                "trip.offer-updated",
                "bookingservice",
                DriverOfferEventPayload.builder()
                        .offerId("trip-1:1:0")
                        .tripId("trip-1")
                        .driverId(driverId)
                        .status("EXPIRED")
                        .backToBack(true)
                        .build()
        ));

        verify(messagingTemplate).convertAndSendToUser(
                eq(driverId),
                eq("/queue/notifications"),
                argThat((NotificationMessage msg) ->
                        "DRIVER_OFFER_UPDATED".equals(msg.type())
                                && "trip-1:1:0".equals(msg.data().get("offerId"))
                                && "EXPIRED".equals(msg.data().get("status"))
                                && Boolean.TRUE.equals(msg.data().get("backToBack"))
                )
        );
    }

    @Test
    void ignoresNullPayloadOrDriverId() {
        listener.handleDriverOfferUpdated(DomainEvent.of("trip.offer-updated", "bookingservice", null));
        verifyNoInteractions(messagingTemplate);
    }
}
