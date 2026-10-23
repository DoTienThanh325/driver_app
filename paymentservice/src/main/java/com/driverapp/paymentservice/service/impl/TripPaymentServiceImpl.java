package com.driverapp.paymentservice.service.impl;

import com.driverapp.paymentservice.dto.request.CreateDriverPaymentInfoRequest;
import com.driverapp.paymentservice.dto.request.SwitchToPayBeforeRequest;
import com.driverapp.paymentservice.dto.response.TripPaymentResponse;
import com.driverapp.paymentservice.models.DriverPaymentInfo;
import com.driverapp.paymentservice.models.PaymentTransaction;
import com.driverapp.paymentservice.models.TripPayment;
import com.driverapp.paymentservice.models.Voucher;
import com.driverapp.paymentservice.models.enums.PaymentMethod;
import com.driverapp.paymentservice.models.enums.TransactionStatus;
import com.driverapp.paymentservice.models.enums.TripPaymentStatus;
import com.driverapp.paymentservice.models.submodels.TripPaymentVoucher;
import com.driverapp.paymentservice.repository.DriverPaymentInfoRepository;
import com.driverapp.paymentservice.repository.PaymentTransactionRepository;
import com.driverapp.paymentservice.repository.TripPaymentRepository;
import com.driverapp.paymentservice.repository.VoucherRepository;
import com.driverapp.paymentservice.service.TripPaymentService;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Service
@RequiredArgsConstructor
public class TripPaymentServiceImpl implements TripPaymentService {

    private final TripPaymentRepository tripPaymentRepository;
    private final DriverPaymentInfoRepository driverPaymentInfoRepository;
    private final PaymentTransactionRepository paymentTransactionRepository;
    private final VoucherRepository voucherRepository;

    private static final int QR_EXPIRY_MINUTES = 15;

    // ────────────────────────── 1. TỰ ĐỘNG TẠO THANH TOÁN MẶC ĐỊNH PAY_DIRECTLY ──────────────────────────
    @Override
    @Transactional
    public void initDefaultPayDirectlyPayment(String tripId, UUID customerId, double totalAmount) {
        if (tripPaymentRepository.findByTripId(tripId).isPresent()) {
            log.warn("Thanh toán cho tripId={} đã tồn tại, bỏ qua tạo mặc định", tripId);
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        TripPayment payment = TripPayment.builder()
                .tripId(tripId)
                .customerId(customerId)
                .driverId(null) // Chưa có tài xế nhận cuốc
                .method(PaymentMethod.PAY_DIRECTLY)
                .status(TripPaymentStatus.PENDING)
                .shippFare(totalAmount)
                .totalAmount(totalAmount)
                .discountAmount(0.0)
                .finalAmount(totalAmount)
                .vouchers(new ArrayList<>())
                .createdAt(now)
                .updatedAt(now)
                .build();

        tripPaymentRepository.save(payment);
        log.info("[PAY_DIRECTLY DEFAULT] Đã tạo thanh toán mặc định cho tripId={}, amount={}", tripId, totalAmount);
    }

    // ────────────────────────── 2. CẬP NHẬT TÀI XẾ (VẪN GIỮ NGUYÊN PAY_DIRECTLY) ──────────────────────────
    @Override
    @Transactional
    public void assignDriverToPayment(String tripId, UUID driverId) {
        tripPaymentRepository.findByTripId(tripId).ifPresent(payment -> {
            payment.setDriverId(driverId);
            payment.setMethod(PaymentMethod.PAY_DIRECTLY); // Vẫn giữ PAY_DIRECTLY
            payment.setStatus(TripPaymentStatus.PENDING);  // Vẫn giữ PENDING
            payment.setUpdatedAt(LocalDateTime.now());
            tripPaymentRepository.save(payment);
            log.info("[ASSIGN DRIVER] Đã cập nhật driverId={} vào payment tripId={} (VẪN GIỮ PAY_DIRECTLY)", driverId, tripId);
        });
    }

    // ────────────────────────── 3. KHÁCH HÀNG PATCH SANG PAY_BEFORE ──────────────────────────
    @Override
    @Transactional
    public TripPaymentResponse switchToPayBefore(String tripId, SwitchToPayBeforeRequest request, Jwt jwt) {
        UUID customerId = UUID.fromString(jwt.getSubject());

        TripPayment payment = tripPaymentRepository.findByTripId(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin thanh toán cho chuyến đi"));

        // Kiểm tra quyền sở hữu của Customer
        if (!customerId.equals(payment.getCustomerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền chỉnh sửa thanh toán chuyến đi này");
        }

        // ĐIỀU KIỆN QUAN TRỌNG: Phải có tài xế nhận chuyến mới được đổi sang PAY_BEFORE
        if (payment.getDriverId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Chuyến đi chưa có tài xế nhận cuốc. Bạn chỉ có thể chuyển sang PAY_BEFORE sau khi tài xế nhận chuyến.");
        }

        if (payment.getStatus() == TripPaymentStatus.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Chuyến đi này đã hoàn tất thanh toán");
        }

        // Lấy thông tin STK của Tài xế
        DriverPaymentInfo driverInfo = driverPaymentInfoRepository.findByDriverId(payment.getDriverId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Tài xế chưa cập nhật thông tin ngân hàng. Vui lòng thanh toán trực tiếp (PAY_DIRECTLY)."));

        // Xử lý voucher nếu có
        double totalAmount = payment.getTotalAmount();
        double discountAmount = payment.getDiscountAmount();
        List<TripPaymentVoucher> appliedVouchers = payment.getVouchers() != null ? payment.getVouchers() : new ArrayList<>();

        if (request != null && request.getVoucherIds() != null && !request.getVoucherIds().isEmpty()) {
            discountAmount = 0.0;
            appliedVouchers = new ArrayList<>();
            LocalDateTime now = LocalDateTime.now();
            for (String vId : request.getVoucherIds()) {
                Voucher voucher = voucherRepository.findById(vId).orElse(null);
                if (voucher != null && voucher.getExpiredAt() != null && voucher.getExpiredAt().isAfter(now)) {
                    if (totalAmount >= voucher.getMinValue()) {
                        double discount = totalAmount * (voucher.getDiscount() / 100.0);
                        discount = Math.min(discount, voucher.getMaxDiscount());
                        discountAmount += discount;

                        TripPaymentVoucher pv = new TripPaymentVoucher();
                        pv.setVoucherId(vId);
                        appliedVouchers.add(pv);
                    }
                }
            }
        }

        double finalAmount = Math.max(0, totalAmount - discountAmount);
        LocalDateTime now = LocalDateTime.now();

        // Cập nhật TripPayment sang PAY_BEFORE
        payment.setMethod(PaymentMethod.PAY_BEFORE);
        payment.setStatus(TripPaymentStatus.AWAITING_PAYMENT);
        payment.setDiscountAmount(discountAmount);
        payment.setFinalAmount(finalAmount);
        payment.setVouchers(appliedVouchers);
        payment.setUpdatedAt(now);
        tripPaymentRepository.save(payment);

        // Sinh mã VietQR chuyển khoản
        String transferContent = "THANH TOAN CHUYEN DI " + tripId;
        String qrUrl = buildVietQrUrl(driverInfo.getBankBin(), driverInfo.getBankAccountNumber(),
                driverInfo.getBankAccountName(), finalAmount, transferContent);
        LocalDateTime expiresAt = now.plusMinutes(QR_EXPIRY_MINUTES);

        PaymentTransaction transaction = paymentTransactionRepository.findByTripPaymentId(payment.getId())
                .orElseGet(() -> PaymentTransaction.builder()
                        .tripPaymentId(payment.getId())
                        .tripId(tripId)
                        .driverId(payment.getDriverId())
                        .createdAt(now)
                        .build());

        transaction.setAmount(finalAmount);
        transaction.setBankBin(driverInfo.getBankBin());
        transaction.setBankAccountNumber(driverInfo.getBankAccountNumber());
        transaction.setBankAccountName(driverInfo.getBankAccountName());
        transaction.setTransferContent(transferContent);
        transaction.setQrDataURL(qrUrl);
        transaction.setStatus(TransactionStatus.PENDING);
        transaction.setExpiresAt(expiresAt);
        transaction.setUpdatedAt(now);
        paymentTransactionRepository.save(transaction);

        log.info("[SWITCH TO PAY_BEFORE] Thành công cho tripId={}, tài xế={}, STK={}",
                tripId, payment.getDriverId(), driverInfo.getBankAccountNumber());

        TripPaymentResponse.QrPaymentInfo qrInfo = TripPaymentResponse.QrPaymentInfo.builder()
                .transactionId(transaction.getId())
                .qrDataURL(qrUrl)
                .bankName(driverInfo.getBankName())
                .bankBin(driverInfo.getBankBin())
                .bankAccountNumber(driverInfo.getBankAccountNumber())
                .bankAccountName(driverInfo.getBankAccountName())
                .amount(finalAmount)
                .transferContent(transferContent)
                .expiresAt(expiresAt)
                .build();

        return TripPaymentResponse.builder()
                .message("Chuyển sang trả trước thành công. Vui lòng quét mã VietQR để thanh toán cho tài xế.")
                .tripPaymentId(payment.getId())
                .totalAmount(totalAmount)
                .discountAmount(discountAmount)
                .finalAmount(finalAmount)
                .method(PaymentMethod.PAY_BEFORE)
                .status(TripPaymentStatus.AWAITING_PAYMENT)
                .qrPayment(qrInfo)
                .build();
    }

    private String buildVietQrUrl(String bankBin, String accountNumber, String accountName,
            double amount, String transferContent) {
        String baseUrl = String.format("https://img.vietqr.io/image/%s-%s-compact2.png",
                bankBin, accountNumber);

        String encodedAddInfo = URLEncoder.encode(transferContent, StandardCharsets.UTF_8);
        String encodedAccountName = URLEncoder.encode(accountName, StandardCharsets.UTF_8);

        return String.format("%s?amount=%.0f&addInfo=%s&accountName=%s",
                baseUrl, amount, encodedAddInfo, encodedAccountName);
    }

    // ────────────────────────── 4. LẤY CHI TIẾT THANH TOÁN CHUYẾN ĐI ──────────────────────────
    @Override
    public TripPaymentResponse getTripPaymentByTripId(String tripId, Jwt jwt) {
        UUID userId = UUID.fromString(jwt.getSubject());

        TripPayment payment = tripPaymentRepository.findByTripId(tripId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin thanh toán cho chuyến đi"));

        if (!userId.equals(payment.getCustomerId()) && !userId.equals(payment.getDriverId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem thông tin thanh toán của chuyến đi này");
        }

        TripPaymentResponse.QrPaymentInfo qrInfo = null;
        if (payment.getMethod() == PaymentMethod.PAY_BEFORE) {
            PaymentTransaction tx = paymentTransactionRepository.findByTripPaymentId(payment.getId()).orElse(null);
            if (tx != null) {
                qrInfo = TripPaymentResponse.QrPaymentInfo.builder()
                        .transactionId(tx.getId())
                        .qrDataURL(tx.getQrDataURL())
                        .bankName(tx.getBankAccountName())
                        .bankBin(tx.getBankBin())
                        .bankAccountNumber(tx.getBankAccountNumber())
                        .bankAccountName(tx.getBankAccountName())
                        .amount(tx.getAmount())
                        .transferContent(tx.getTransferContent())
                        .expiresAt(tx.getExpiresAt())
                        .build();
            }
        }

        return TripPaymentResponse.builder()
                .message("Lấy thông tin thanh toán thành công")
                .tripPaymentId(payment.getId())
                .totalAmount(payment.getTotalAmount())
                .discountAmount(payment.getDiscountAmount())
                .finalAmount(payment.getFinalAmount())
                .method(payment.getMethod())
                .status(payment.getStatus())
                .qrPayment(qrInfo)
                .build();
    }

    // ────────────────────────── 5. TÀI XẾ XÁC NHẬN NHẬN TIỀN (API CÓ SẴN) ──────────────────────────
    @Override
    @Transactional
    public Map<String, String> confirmPayment(String tripPaymentId, Jwt jwt) {
        UUID driverUserId = UUID.fromString(jwt.getSubject());

        TripPayment tripPayment = tripPaymentRepository.findById(tripPaymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin thanh toán"));

        if (!driverUserId.equals(tripPayment.getDriverId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Bạn không có quyền xác nhận thanh toán cho chuyến đi này");
        }

        if (tripPayment.getStatus() != TripPaymentStatus.AWAITING_PAYMENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Chuyến đi này không ở trạng thái chờ xác nhận thanh toán");
        }

        LocalDateTime now = LocalDateTime.now();

        tripPayment.setStatus(TripPaymentStatus.COMPLETED);
        tripPayment.setUpdatedAt(now);
        tripPaymentRepository.save(tripPayment);

        paymentTransactionRepository.findByTripPaymentId(tripPaymentId).ifPresent(transaction -> {
            transaction.setStatus(TransactionStatus.COMPLETED);
            transaction.setConfirmedAt(now);
            transaction.setUpdatedAt(now);
            paymentTransactionRepository.save(transaction);
        });

        log.info("Driver (userId={}) đã xác nhận nhận tiền cho tripPaymentId={}", driverUserId, tripPaymentId);
        return Map.of("message", "Xác nhận nhận tiền thành công");
    }

    // ────────────────────────── 6. TÀI XẾ ĐĂNG KÝ THÔNG TIN NGÂN HÀNG (API CÓ SẴN) ──────────────────────────
    @Override
    @Transactional
    public Map<String, String> registerDriverPaymentInfo(CreateDriverPaymentInfoRequest request, Jwt jwt) {
        UUID driverUserId = UUID.fromString(jwt.getSubject());
        LocalDateTime now = LocalDateTime.now();

        DriverPaymentInfo info = driverPaymentInfoRepository.findByDriverId(driverUserId)
                .orElseGet(() -> DriverPaymentInfo.builder()
                        .driverId(driverUserId)
                        .createdAt(now)
                        .build());

        info.setBankName(request.getBankName());
        info.setBankBin(request.getBankBin());
        info.setBankAccountNumber(request.getBankAccountNumber());
        info.setBankAccountName(request.getBankAccountName());
        info.setUpdatedAt(now);

        driverPaymentInfoRepository.save(info);
        log.info("Tài xế (userId={}) đã cập nhật STK: bank={}, stk={}",
                driverUserId, request.getBankName(), request.getBankAccountNumber());

        return Map.of("message", "Đăng ký thông tin ngân hàng thành công");
    }

    // ────────────────────────── 7. TỰ ĐỘNG CHỐT PAY_DIRECTLY KHI COMPLETED ──────────────────────────
    @Override
    @Transactional
    public Map<String, String> completePayDirectlyTripPayment(String tripId) {
        tripPaymentRepository.findByTripId(tripId).ifPresent(tripPayment -> {
            if ((tripPayment.getMethod() == PaymentMethod.PAY_DIRECTLY || tripPayment.getMethod().name().equals("PAY_AFTER"))
                    && tripPayment.getStatus() == TripPaymentStatus.PENDING) {
                tripPayment.setStatus(TripPaymentStatus.COMPLETED);
                tripPayment.setUpdatedAt(LocalDateTime.now());
                tripPaymentRepository.save(tripPayment);
                log.info("Đã tự động cập nhật thanh toán trực tiếp (PAY_DIRECTLY) sang COMPLETED cho tripId={}", tripId);
            }
        });

        return Map.of("message", "Cập nhật trạng thái thanh toán thành công");
    }

    @Override
    @Transactional
    public Map<String, String> completePayAfterTripPayment(String tripId) {
        return completePayDirectlyTripPayment(tripId);
    }
}
