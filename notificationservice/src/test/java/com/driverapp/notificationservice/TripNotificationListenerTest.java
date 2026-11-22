package com.driverapp.notificationservice;

import com.driverapp.notificationservice.dto.request.CreateNotificationRequest;
import com.driverapp.notificationservice.event.DomainEvent;
import com.driverapp.notificationservice.event.TripEventPayload;
import com.driverapp.notificationservice.listener.TripNotificationListener;
import com.driverapp.notificationservice.repository.ProcessedEventRepository;
import com.driverapp.notificationservice.service.NotificationService;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.same;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

class TripNotificationListenerTest {
    private final NotificationService notifications = mock(NotificationService.class);
    private final ProcessedEventRepository processed = mock(ProcessedEventRepository.class);
    private final TripNotificationListener listener = new TripNotificationListener(notifications, processed);
    private final UUID customer = UUID.randomUUID();
    private final UUID driver = UUID.randomUUID();

    @Test
    void driverArrivalSendsRouteAndStatusToCustomerOnly() {
        var payload = payload("DRIVER_ARRIVING").pickupAddress("Phú Diễn")
                .dropoffAddress("Đại học Bách Khoa").build();

        listener.handleTripNotification(event(payload));

        assertCustomerMessage(payload,
                "Chuyến đi từ Phú Diễn tới Đại học Bách Khoa: tài xế đã đến điểm đón.");
    }

    @Test
    void foodDeliveryUsesFoodCopyWhenAnAddressIsMissing() {
        var payload = payload("COMPLETED").shippingType("FOOD_DELIVERY").pickupAddress("Quán ăn").build();

        listener.handleTripNotification(event(payload));

        assertCustomerMessage(payload, "Đơn giao món của bạn: đơn món đã được giao.");
    }

    @Test
    void requestAndRepeatedEventDoNotSendAdditionalNotifications() {
        listener.handleTripNotification(event(payload("REQUESTED").build()));
        var duplicate = event(payload("DRIVER_ASSIGNED").build());
        when(processed.existsById(duplicate.getEventId())).thenReturn(true);

        listener.handleTripNotification(duplicate);

        verifyNoInteractions(notifications);
    }

    private void assertCustomerMessage(TripEventPayload payload, String content) {
        var request = ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notifications).createTripNotification(request.capture(), same(payload));
        assertEquals(customer, request.getValue().userId());
        assertEquals(content, request.getValue().content());
        verifyNoMoreInteractions(notifications);
    }

    private TripEventPayload.TripEventPayloadBuilder payload(String status) {
        return TripEventPayload.builder().tripId("trip-1").tripStatus(status)
                .customerId(customer.toString()).driverId(driver.toString());
    }

    private DomainEvent<TripEventPayload> event(TripEventPayload payload) {
        return DomainEvent.of("trip.updated", "bookingservice", payload);
    }
}
