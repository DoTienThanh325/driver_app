package com.driverapp.paymentservice;

import com.driverapp.paymentservice.dto.request.CreateDriverPaymentInfoRequest;
import com.driverapp.paymentservice.dto.request.SwitchToPayBeforeRequest;
import com.driverapp.paymentservice.dto.response.DriverPaymentInfoResponse;
import com.driverapp.paymentservice.dto.response.TripPaymentResponse;
import com.driverapp.paymentservice.event.DomainEvent;
import com.driverapp.paymentservice.event.PaymentCompleteFailedPayload;
import com.driverapp.paymentservice.event.TripEventPayload;
import com.driverapp.paymentservice.event.TripPaymentInitFailedPayload;
import com.driverapp.paymentservice.listener.TripCompletedEventListener;
import com.driverapp.paymentservice.listener.TripLifecycleEventListener;
import com.driverapp.paymentservice.models.DriverPaymentInfo;
import com.driverapp.paymentservice.models.PaymentTransaction;
import com.driverapp.paymentservice.models.ProcessedEvent;
import com.driverapp.paymentservice.models.TripPayment;
import com.driverapp.paymentservice.models.Voucher;
import com.driverapp.paymentservice.models.enums.PaymentMethod;
import com.driverapp.paymentservice.models.enums.TransactionStatus;
import com.driverapp.paymentservice.models.enums.TripPaymentStatus;
import com.driverapp.paymentservice.models.enums.VoucherProviderType;
import com.driverapp.paymentservice.models.enums.VoucherType;
import com.driverapp.paymentservice.repository.DriverPaymentInfoRepository;
import com.driverapp.paymentservice.repository.PaymentTransactionRepository;
import com.driverapp.paymentservice.repository.ProcessedEventRepository;
import com.driverapp.paymentservice.repository.TripPaymentRepository;
import com.driverapp.paymentservice.repository.VoucherRepository;
import com.driverapp.paymentservice.service.impl.TripPaymentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentFlowScenariosTest {

    @Mock
    private TripPaymentRepository tripPaymentRepository;
    @Mock
    private DriverPaymentInfoRepository driverPaymentInfoRepository;
    @Mock
    private PaymentTransactionRepository paymentTransactionRepository;
    @Mock
    private VoucherRepository voucherRepository;
    @Mock
    private ProcessedEventRepository processedEventRepository;
    @Mock
    private RabbitTemplate rabbitTemplate;

    private TripPaymentServiceImpl tripPaymentService;
    private TripLifecycleEventListener lifecycleListener;
    private TripCompletedEventListener completedListener;

    private final Map<String, TripPayment> paymentById = new HashMap<>();
    private final Map<String, TripPayment> paymentByTripId = new HashMap<>();
    private final Map<UUID, DriverPaymentInfo> driverInfoStore = new HashMap<>();
    private final Map<String, PaymentTransaction> txByTripPaymentId = new HashMap<>();
    private final Map<String, Voucher> voucherStore = new HashMap<>();
    private final Set<String> processedEventIds = new HashSet<>();

    private final UUID customerId = UUID.randomUUID();
    private final UUID driverId = UUID.randomUUID();
    private final UUID strangerId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        tripPaymentService = new TripPaymentServiceImpl(
                tripPaymentRepository,
                driverPaymentInfoRepository,
                paymentTransactionRepository,
                voucherRepository
        );
        lifecycleListener = new TripLifecycleEventListener(
                tripPaymentService,
                processedEventRepository,
                rabbitTemplate
        );
        completedListener = new TripCompletedEventListener(
                tripPaymentService,
                tripPaymentRepository,
                processedEventRepository,
                rabbitTemplate
        );

        lenient().when(tripPaymentRepository.findByTripId(anyString())).thenAnswer(inv ->
                Optional.ofNullable(paymentByTripId.get(inv.getArgument(0))));
        lenient().when(tripPaymentRepository.findById(anyString())).thenAnswer(inv ->
                Optional.ofNullable(paymentById.get(inv.getArgument(0))));
        lenient().when(tripPaymentRepository.save(any(TripPayment.class))).thenAnswer(inv -> {
            TripPayment p = inv.getArgument(0);
            if (p.getId() == null) {
                p.setId("pay-" + (paymentById.size() + 1));
            }
            paymentById.put(p.getId(), p);
            paymentByTripId.put(p.getTripId(), p);
            return p;
        });

        lenient().when(driverPaymentInfoRepository.findByDriverId(any(UUID.class))).thenAnswer(inv ->
                Optional.ofNullable(driverInfoStore.get(inv.getArgument(0))));
        lenient().when(driverPaymentInfoRepository.save(any(DriverPaymentInfo.class))).thenAnswer(inv -> {
            DriverPaymentInfo info = inv.getArgument(0);
            if (info.getId() == null) {
                info.setId("dpi-" + (driverInfoStore.size() + 1));
            }
            driverInfoStore.put(info.getDriverId(), info);
            return info;
        });

        lenient().when(paymentTransactionRepository.findByTripPaymentId(anyString())).thenAnswer(inv ->
                Optional.ofNullable(txByTripPaymentId.get(inv.getArgument(0))));
        lenient().when(paymentTransactionRepository.save(any(PaymentTransaction.class))).thenAnswer(inv -> {
            PaymentTransaction tx = inv.getArgument(0);
            if (tx.getId() == null) {
                tx.setId("tx-" + (txByTripPaymentId.size() + 1));
            }
            txByTripPaymentId.put(tx.getTripPaymentId(), tx);
            return tx;
        });

        lenient().when(voucherRepository.findById(anyString())).thenAnswer(inv ->
                Optional.ofNullable(voucherStore.get(inv.getArgument(0))));

        lenient().when(processedEventRepository.existsById(anyString())).thenAnswer(inv ->
                processedEventIds.contains(inv.getArgument(0)));
        lenient().when(processedEventRepository.save(any(ProcessedEvent.class))).thenAnswer(inv -> {
            ProcessedEvent pe = inv.getArgument(0);
            processedEventIds.add(pe.getEventId());
            return pe;
        });
    }

    // Kịch bản 1: Luồng thanh toán trực tiếp (PAY_DIRECTLY) trọn vẹn từ tạo chuyến -> gán tài xế -> hoàn thành chuyến
    @Test
    void payDirectlyFlow_fromTripCreatedToTripCompleted() {
        String tripId = "trip-direct-01";
        Jwt customerJwt = jwtFor(customerId);
        Jwt driverJwt = jwtFor(driverId);

        // Bước 1: Tạo chuyến -> tự động khởi tạo PAY_DIRECTLY (PENDING)
        lifecycleListener.handleTripCreated(tripEvent("evt-1", "TRIP_CREATED", tripId, null, 120_000));
        TripPayment created = paymentByTripId.get(tripId);
        assertNotNull(created);
        assertEquals(PaymentMethod.PAY_DIRECTLY, created.getMethod());
        assertEquals(TripPaymentStatus.PENDING, created.getStatus());
        assertNull(created.getDriverId());
        assertEquals(120_000.0, created.getFinalAmount());

        // Bước 2: Tài xế nhận chuyến -> gán driverId, vẫn giữ PAY_DIRECTLY & PENDING
        lifecycleListener.handleDriverAssigned(tripEvent("evt-2", "DRIVER_ASSIGNED", tripId, driverId, 120_000));
        assertEquals(driverId, created.getDriverId());
        assertEquals(PaymentMethod.PAY_DIRECTLY, created.getMethod());
        assertEquals(TripPaymentStatus.PENDING, created.getStatus());

        // Bước 3: Customer & Driver xem thông tin thanh toán -> không có QR
        TripPaymentResponse customerView = tripPaymentService.getTripPaymentByTripId(tripId, customerJwt);
        TripPaymentResponse driverView = tripPaymentService.getTripPaymentByTripId(tripId, driverJwt);
        assertEquals(PaymentMethod.PAY_DIRECTLY, customerView.getMethod());
        assertEquals(TripPaymentStatus.PENDING, customerView.getStatus());
        assertNull(customerView.getQrPayment());
        assertEquals(120_000.0, driverView.getFinalAmount());

        // Bước 4: Chuyến đi hoàn thành -> tự động chốt COMPLETED
        completedListener.handleTripCompleted(tripEvent("evt-3", "TRIP_COMPLETED", tripId, driverId, 120_000));
        assertEquals(TripPaymentStatus.COMPLETED, paymentByTripId.get(tripId).getStatus());
        assertTrue(processedEventIds.containsAll(Set.of("evt-1", "evt-2", "evt-3")));
    }

    // Kịch bản 2: Luồng chuyển sang trả trước VietQR (PAY_BEFORE) có voucher -> tài xế xác nhận nhận tiền -> hoàn thành chuyến không chốt đè
    @Test
    void payBeforeFlow_withVouchersAndDriverConfirmation() {
        String tripId = "trip-qr-01";
        Jwt customerJwt = jwtFor(customerId);
        Jwt driverJwt = jwtFor(driverId);

        // Bước 1 & 2: Tạo chuyến và gán tài xế
        lifecycleListener.handleTripCreated(tripEvent("evt-10", "TRIP_CREATED", tripId, null, 100_000));
        lifecycleListener.handleDriverAssigned(tripEvent("evt-11", "DRIVER_ASSIGNED", tripId, driverId, 100_000));

        // Bước 3: Tài xế đăng ký và cập nhật STK ngân hàng
        Map<String, String> regRes = tripPaymentService.registerDriverPaymentInfo(
                CreateDriverPaymentInfoRequest.builder()
                        .bankName("MB Bank")
                        .bankBin("970422")
                        .bankAccountNumber("11112222")
                        .bankAccountName("NGUYEN VAN A")
                        .build(),
                driverJwt
        );
        assertEquals("Đăng ký thông tin ngân hàng thành công", regRes.get("message"));

        tripPaymentService.updateDriverPaymentInfo(
                CreateDriverPaymentInfoRequest.builder()
                        .bankName("Vietcombank")
                        .bankBin("970436")
                        .bankAccountNumber("0123456789")
                        .bankAccountName("NGUYEN VAN A")
                        .build(),
                driverJwt
        );
        DriverPaymentInfoResponse bankInfo = tripPaymentService.getDriverPaymentInfo(driverJwt);
        assertEquals("Vietcombank", bankInfo.getBankName());
        assertEquals("0123456789", bankInfo.getBankAccountNumber());

        // Chuẩn bị voucher: 2 hợp lệ, 1 hết hạn, 1 chưa đủ minValue
        voucherStore.put("v-20pct", Voucher.builder()
                .id("v-20pct").discount(20.0).maxDiscount(15_000.0).minValue(50_000.0)
                .type(VoucherType.TRANSIT).providerType(VoucherProviderType.APP)
                .expiredAt(LocalDateTime.now().plusDays(5)).build());
        voucherStore.put("v-10pct", Voucher.builder()
                .id("v-10pct").discount(10.0).maxDiscount(20_000.0).minValue(50_000.0)
                .type(VoucherType.TRANSIT).providerType(VoucherProviderType.APP)
                .expiredAt(LocalDateTime.now().plusDays(5)).build());
        voucherStore.put("v-expired", Voucher.builder()
                .id("v-expired").discount(50.0).maxDiscount(50_000.0).minValue(0.0)
                .expiredAt(LocalDateTime.now().minusDays(1)).build());
        voucherStore.put("v-high-min", Voucher.builder()
                .id("v-high-min").discount(50.0).maxDiscount(50_000.0).minValue(200_000.0)
                .expiredAt(LocalDateTime.now().plusDays(5)).build());

        // Bước 4: Customer đổi sang PAY_BEFORE kèm danh sách voucher
        TripPaymentResponse switchRes = tripPaymentService.switchToPayBefore(
                tripId,
                SwitchToPayBeforeRequest.builder()
                        .voucherIds(List.of("v-20pct", "v-10pct", "v-expired", "v-high-min", "v-not-exist"))
                        .build(),
                customerJwt
        );

        assertEquals(PaymentMethod.PAY_BEFORE, switchRes.getMethod());
        assertEquals(TripPaymentStatus.AWAITING_PAYMENT, switchRes.getStatus());
        assertEquals(100_000.0, switchRes.getTotalAmount());
        assertEquals(25_000.0, switchRes.getDiscountAmount()); // 15_000 (capped) + 10_000
        assertEquals(75_000.0, switchRes.getFinalAmount());
        assertNotNull(switchRes.getQrPayment());
        assertTrue(switchRes.getQrPayment().getQrDataURL().contains("970436-0123456789-compact2.png"));
        assertTrue(switchRes.getQrPayment().getQrDataURL().contains("amount=75000"));
        assertEquals("THANH TOAN CHUYEN DI " + tripId, switchRes.getQrPayment().getTransferContent());

        PaymentTransaction tx = txByTripPaymentId.get(switchRes.getTripPaymentId());
        assertNotNull(tx);
        assertEquals(TransactionStatus.PENDING, tx.getStatus());

        // Bước 5: Xem lại chi tiết thanh toán vẫn thấy QR
        TripPaymentResponse detail = tripPaymentService.getTripPaymentByTripId(tripId, customerJwt);
        assertNotNull(detail.getQrPayment());
        assertEquals(75_000.0, detail.getQrPayment().getAmount());

        // Bước 6: Tài xế xác nhận đã nhận tiền
        Map<String, String> confirmRes = tripPaymentService.confirmPayment(switchRes.getTripPaymentId(), driverJwt);
        assertEquals("Xác nhận nhận tiền thành công", confirmRes.get("message"));
        assertEquals(TripPaymentStatus.COMPLETED, paymentByTripId.get(tripId).getStatus());
        assertEquals(TransactionStatus.COMPLETED, txByTripPaymentId.get(switchRes.getTripPaymentId()).getStatus());
        assertNotNull(txByTripPaymentId.get(switchRes.getTripPaymentId()).getConfirmedAt());

        // Bước 7: Event hoàn thành chuyến đến sau -> không chốt đè lại giao dịch PAY_BEFORE
        completedListener.handleTripCompleted(tripEvent("evt-12", "TRIP_COMPLETED", tripId, driverId, 100_000));
        assertEquals(PaymentMethod.PAY_BEFORE, paymentByTripId.get(tripId).getMethod());
        assertEquals(TripPaymentStatus.COMPLETED, paymentByTripId.get(tripId).getStatus());
    }

    // Kịch bản 3: Đổi sang PAY_BEFORE nhiều lần cập nhật lại transaction cũ và không để finalAmount âm
    @Test
    void payBeforeFlow_reSwitchUpdatesExistingTransactionAndClampsAmountToZero() {
        String tripId = "trip-qr-reswitch";
        Jwt customerJwt = jwtFor(customerId);
        Jwt driverJwt = jwtFor(driverId);

        lifecycleListener.handleTripCreated(tripEvent("evt-20", "TRIP_CREATED", tripId, null, 30_000));
        lifecycleListener.handleDriverAssigned(tripEvent("evt-21", "DRIVER_ASSIGNED", tripId, driverId, 30_000));
        tripPaymentService.registerDriverPaymentInfo(
                CreateDriverPaymentInfoRequest.builder()
                        .bankName("ACB").bankBin("970416")
                        .bankAccountNumber("88889999").bankAccountName("DRIVER B").build(),
                driverJwt
        );

        // Lần 1: chuyển PAY_BEFORE chưa có voucher
        TripPaymentResponse first = tripPaymentService.switchToPayBefore(tripId, null, customerJwt);
        String firstTxId = first.getQrPayment().getTransactionId();
        assertEquals(30_000.0, first.getFinalAmount());

        // Lần 2: áp voucher giảm nhiều hơn giá chuyến -> finalAmount = 0 và dùng lại transaction cũ
        voucherStore.put("v-big-1", Voucher.builder()
                .id("v-big-1").discount(100.0).maxDiscount(20_000.0).minValue(0.0)
                .expiredAt(LocalDateTime.now().plusDays(1)).build());
        voucherStore.put("v-big-2", Voucher.builder()
                .id("v-big-2").discount(100.0).maxDiscount(25_000.0).minValue(0.0)
                .expiredAt(LocalDateTime.now().plusDays(1)).build());

        TripPaymentResponse second = tripPaymentService.switchToPayBefore(
                tripId,
                SwitchToPayBeforeRequest.builder().voucherIds(List.of("v-big-1", "v-big-2")).build(),
                customerJwt
        );

        assertEquals(0.0, second.getFinalAmount());
        assertEquals(firstTxId, second.getQrPayment().getTransactionId());
        assertEquals(1, txByTripPaymentId.size());
    }

    // Kịch bản 4: Các trường hợp sai trình tự, thiếu điều kiện và sai quyền trong luồng thanh toán
    @Test
    void paymentFlow_invalidSequenceAndPermissionErrors() {
        String tripId = "trip-err-01";
        Jwt customerJwt = jwtFor(customerId);
        Jwt driverJwt = jwtFor(driverId);
        Jwt strangerJwt = jwtFor(strangerId);

        // Chưa có thanh toán -> 404
        ResponseStatusException notFoundEx = assertThrows(ResponseStatusException.class,
                () -> tripPaymentService.getTripPaymentByTripId("non-existent", customerJwt));
        assertEquals(HttpStatus.NOT_FOUND, notFoundEx.getStatusCode());

        // Tài xế chưa liên kết STK -> 404
        ResponseStatusException noBankInfoEx = assertThrows(ResponseStatusException.class,
                () -> tripPaymentService.getDriverPaymentInfo(driverJwt));
        assertEquals(HttpStatus.NOT_FOUND, noBankInfoEx.getStatusCode());

        // Tạo chuyến (chưa có tài xế)
        lifecycleListener.handleTripCreated(tripEvent("evt-30", "TRIP_CREATED", tripId, null, 80_000));

        // Đổi sang PAY_BEFORE khi chưa có tài xế -> 400
        ResponseStatusException noDriverEx = assertThrows(ResponseStatusException.class,
                () -> tripPaymentService.switchToPayBefore(tripId, null, customerJwt));
        assertEquals(HttpStatus.BAD_REQUEST, noDriverEx.getStatusCode());

        // Gán tài xế nhưng tài xế chưa đăng ký STK -> 400
        lifecycleListener.handleDriverAssigned(tripEvent("evt-31", "DRIVER_ASSIGNED", tripId, driverId, 80_000));
        ResponseStatusException missingBankEx = assertThrows(ResponseStatusException.class,
                () -> tripPaymentService.switchToPayBefore(tripId, null, customerJwt));
        assertEquals(HttpStatus.BAD_REQUEST, missingBankEx.getStatusCode());

        // Tài xế xác nhận tiền khi đơn vẫn là PAY_DIRECTLY (PENDING) -> 400
        String paymentId = paymentByTripId.get(tripId).getId();
        ResponseStatusException wrongStatusEx = assertThrows(ResponseStatusException.class,
                () -> tripPaymentService.confirmPayment(paymentId, driverJwt));
        assertEquals(HttpStatus.BAD_REQUEST, wrongStatusEx.getStatusCode());

        // Người lạ truy cập / sửa / xác nhận -> 403
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> tripPaymentService.getTripPaymentByTripId(tripId, strangerJwt)).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> tripPaymentService.switchToPayBefore(tripId, null, strangerJwt)).getStatusCode());
        assertEquals(HttpStatus.FORBIDDEN, assertThrows(ResponseStatusException.class,
                () -> tripPaymentService.confirmPayment(paymentId, strangerJwt)).getStatusCode());

        // Chốt PAY_DIRECTLY thành công -> sau đó khách cố đổi sang PAY_BEFORE -> 409 CONFLICT
        completedListener.handleTripCompleted(tripEvent("evt-32", "TRIP_COMPLETED", tripId, driverId, 80_000));
        ResponseStatusException alreadyCompletedEx = assertThrows(ResponseStatusException.class,
                () -> tripPaymentService.switchToPayBefore(tripId, null, customerJwt));
        assertEquals(HttpStatus.CONFLICT, alreadyCompletedEx.getStatusCode());
    }

    // Kịch bản 5: Idempotency (bỏ qua event trùng) & SAGA Compensating Events khi đẩy vào DLQ
    @Test
    void sagaAndIdempotencyFlow_duplicateEventsAndDlqCompensation() {
        String tripId = "trip-saga-01";
        DomainEvent<TripEventPayload> createdEvent = tripEvent("evt-dup-1", "TRIP_CREATED", tripId, null, 95_000);

        // Xử lý lần 1 -> thành công; xử lý lần 2 cùng eventId -> bỏ qua
        lifecycleListener.handleTripCreated(createdEvent);
        lifecycleListener.handleTripCreated(createdEvent);
        verify(tripPaymentRepository, times(1)).save(any(TripPayment.class));

        // Giả lập lỗi DB khi tạo thanh toán -> ném exception để RabbitMQ retry, sau đó DLQ phát event bù trừ
        when(tripPaymentRepository.findByTripId("trip-fail-init")).thenReturn(Optional.empty());
        when(tripPaymentRepository.save(any(TripPayment.class))).thenThrow(new RuntimeException("Mongo timeout"));

        DomainEvent<TripEventPayload> failInitEvent = tripEvent("evt-fail-1", "TRIP_CREATED", "trip-fail-init", null, 50_000);
        assertThrows(RuntimeException.class, () -> lifecycleListener.handleTripCreated(failInitEvent));

        lifecycleListener.handlePaymentInitDlq(failInitEvent);
        ArgumentCaptor<TripPaymentInitFailedPayload> initFailCaptor = ArgumentCaptor.forClass(TripPaymentInitFailedPayload.class);
        verify(rabbitTemplate).convertAndSend(
                eq("saga.compensating.exchange"),
                eq("trip.payment-init.failed"),
                initFailCaptor.capture()
        );
        assertEquals("trip-fail-init", initFailCaptor.getValue().getTripId());
        assertEquals(customerId.toString(), initFailCaptor.getValue().getCustomerId());

        // DLQ khi chốt thanh toán PAY_DIRECTLY thất bại -> phát PaymentCompleteFailedPayload
        DomainEvent<TripEventPayload> completeFailDirect = tripEvent("evt-fail-2", "TRIP_COMPLETED", tripId, driverId, 95_000);
        completedListener.handlePaymentFailureDlq(completeFailDirect);

        ArgumentCaptor<PaymentCompleteFailedPayload> completeFailCaptor = ArgumentCaptor.forClass(PaymentCompleteFailedPayload.class);
        verify(rabbitTemplate).convertAndSend(
                eq("saga.compensating.exchange"),
                eq("payment.complete.failed"),
                completeFailCaptor.capture()
        );
        assertEquals(tripId, completeFailCaptor.getValue().getTripId());
        assertEquals("PAY_DIRECTLY", completeFailCaptor.getValue().getPaymentMethod());

        // Nếu đơn là PAY_BEFORE thì DLQ complete failure không phát event bù trừ PAY_DIRECTLY
        paymentByTripId.get(tripId).setMethod(PaymentMethod.PAY_BEFORE);
        completedListener.handlePaymentFailureDlq(completeFailDirect);
        verify(rabbitTemplate, times(1)).convertAndSend(
                eq("saga.compensating.exchange"),
                eq("payment.complete.failed"),
                any(PaymentCompleteFailedPayload.class)
        );
    }

    private DomainEvent<TripEventPayload> tripEvent(String eventId, String eventType, String tripId, UUID driver, double amount) {
        return DomainEvent.<TripEventPayload>builder()
                .eventId(eventId)
                .eventType(eventType)
                .sourceService("bookingservice")
                .payload(TripEventPayload.builder()
                        .tripId(tripId)
                        .customerId(customerId.toString())
                        .driverId(driver != null ? driver.toString() : null)
                        .totalAmount(BigDecimal.valueOf(amount))
                        .build())
                .build();
    }

    private Jwt jwtFor(UUID subject) {
        return Jwt.withTokenValue("mock-token")
                .header("alg", "none")
                .subject(subject.toString())
                .build();
    }
}
