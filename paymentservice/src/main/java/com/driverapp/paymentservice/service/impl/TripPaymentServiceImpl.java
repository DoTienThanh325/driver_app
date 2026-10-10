package com.driverapp.paymentservice.service.impl;

import com.driverapp.paymentservice.client.BookingServiceClient;
import com.driverapp.paymentservice.client.DriverServiceClient;
import com.driverapp.paymentservice.dto.internal.TripPriceDto;
import com.driverapp.paymentservice.dto.request.CreateDriverPaymentInfoRequest;
import com.driverapp.paymentservice.dto.request.CreateTripPaymentRequest;
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
    private final BookingServiceClient bookingServiceClient;
    private final DriverServiceClient driverServiceClient;

    private static final int QR_EXPIRY_MINUTES = 15;

    // ────────────────────────── 1. TẠO THANH TOÁN CHUYẾN ĐI
    // ──────────────────────────
    @Override
    @Transactional
    public TripPaymentResponse createTripPayment(CreateTripPaymentRequest request, Jwt jwt) {
        UUID customerId = UUID.fromString(jwt.getSubject());
        String tripId = request.getTripId();

        // 1. Kiểm tra đã có thanh toán cho chuyến này chưa
        tripPaymentRepository.findByTripId(tripId).ifPresent(p -> {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chuyến đi này đã được tạo thanh toán");
        });

        // 2. Lấy thông tin giá chuyến từ Booking Service
        TripPriceDto tripPrice = bookingServiceClient.getTripPrice(tripId);

        if (!customerId.equals(tripPrice.customerId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền thanh toán cho chuyến đi này");
        }

        // 3. Tính tiền gốc
        double shippFare = tripPrice.shippFare();
        Double totalFoodPrice = tripPrice.totalFoodPrice();
        double totalAmount = shippFare + (totalFoodPrice != null ? totalFoodPrice : 0.0);

        // 4. Áp dụng Voucher
        double discountAmount = 0.0;
        List<TripPaymentVoucher> appliedVouchers = new ArrayList<>();

        if (request.getVoucherIds() != null && !request.getVoucherIds().isEmpty()) {
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

        // 5. Khởi tạo TripPayment
        TripPayment tripPayment = TripPayment.builder()
                .tripId(tripId)
                .customerId(customerId)
                .driverId(tripPrice.driverId())
                .method(request.getMethod())
                .shippFare(shippFare)
                .totalFoodPrice(totalFoodPrice)
                .totalAmount(totalAmount)
                .discountAmount(discountAmount)
                .finalAmount(finalAmount)
                .vouchers(appliedVouchers)
                .createdAt(now)
                .updatedAt(now)
                .build();

        // 6. Xử lý theo phương thức thanh toán
        if (request.getMethod() == PaymentMethod.PAY_AFTER) {
            tripPayment.setStatus(TripPaymentStatus.PENDING);
            tripPaymentRepository.save(tripPayment);
            log.info("PAY_AFTER: tripId={}, finalAmount={}", tripId, finalAmount);

            return TripPaymentResponse.builder()
                    .message("Tạo thanh toán tiền mặt thành công")
                    .tripPaymentId(tripPayment.getId())
                    .totalAmount(totalAmount)
                    .discountAmount(discountAmount)
                    .finalAmount(finalAmount)
                    .method(PaymentMethod.PAY_AFTER)
                    .status(TripPaymentStatus.PENDING)
                    .qrPayment(null)
                    .build();
        } else {
            // PAY_BEFORE: Chuyển khoản trực tiếp vào STK của Tài xế
            UUID driverId = tripPrice.driverId();
            if (driverId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Chuyến đi chưa có tài xế nhận");
            }

            // Lấy thông tin STK của Tài xế
            DriverPaymentInfo driverInfo = driverPaymentInfoRepository.findByDriverId(driverId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Tài xế chưa cập nhật thông tin ngân hàng. Vui lòng chọn trả tiền mặt (PAY_AFTER)"));

            tripPayment.setStatus(TripPaymentStatus.AWAITING_PAYMENT);
            tripPaymentRepository.save(tripPayment);

            String transferContent = "THANH TOAN CHUYEN DI " + tripId;
            String qrUrl = buildVietQrUrl(driverInfo.getBankBin(), driverInfo.getBankAccountNumber(),
                    driverInfo.getBankAccountName(), finalAmount, transferContent);
            LocalDateTime expiresAt = now.plusMinutes(QR_EXPIRY_MINUTES);

            PaymentTransaction transaction = PaymentTransaction.builder()
                    .tripPaymentId(tripPayment.getId())
                    .tripId(tripId)
                    .driverId(driverId)
                    .amount(finalAmount)
                    .bankBin(driverInfo.getBankBin())
                    .bankAccountNumber(driverInfo.getBankAccountNumber())
                    .bankAccountName(driverInfo.getBankAccountName())
                    .transferContent(transferContent)
                    .qrDataURL(qrUrl)
                    .status(TransactionStatus.PENDING)
                    .expiresAt(expiresAt)
                    .createdAt(now)
                    .updatedAt(now)
                    .build();

            paymentTransactionRepository.save(transaction);
            log.info("PAY_BEFORE: Chuyển khoản tới tài xế {}, STK={}, qrUrl={}",
                    driverId, driverInfo.getBankAccountNumber(), qrUrl);

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
                    .message("Tạo thanh toán thành công. Vui lòng quét mã VietQR để chuyển tiền cho tài xế.")
                    .tripPaymentId(tripPayment.getId())
                    .totalAmount(totalAmount)
                    .discountAmount(discountAmount)
                    .finalAmount(finalAmount)
                    .method(PaymentMethod.PAY_BEFORE)
                    .status(TripPaymentStatus.AWAITING_PAYMENT)
                    .qrPayment(qrInfo)
                    .build();
        }
    }

    /**
     * Tạo URL ảnh VietQR chuẩn Napas 24/7 trực tiếp tới STK Tài xế
     */
    private String buildVietQrUrl(String bankBin, String accountNumber, String accountName,
            double amount, String transferContent) {
        String baseUrl = String.format("https://img.vietqr.io/image/%s-%s-compact2.png",
                bankBin, accountNumber);

        String encodedAddInfo = URLEncoder.encode(transferContent, StandardCharsets.UTF_8);
        String encodedAccountName = URLEncoder.encode(accountName, StandardCharsets.UTF_8);

        return String.format("%s?amount=%.0f&addInfo=%s&accountName=%s",
                baseUrl, amount, encodedAddInfo, encodedAccountName);
    }

    // ────────────────────────── 2. TÀI XẾ XÁC NHẬN ĐÃ NHẬN TIỀN
    // ──────────────────────────
    @Override
    @Transactional
    public Map<String, String> confirmPayment(String tripPaymentId, Jwt jwt) {
        UUID driverUserId = UUID.fromString(jwt.getSubject());

        // Lấy driverId thực tế từ driverservice thông qua driverUserId
        UUID actualDriverId = driverServiceClient.getDriverIdByUserId(driverUserId);

        TripPayment tripPayment = tripPaymentRepository.findById(tripPaymentId)
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy thông tin thanh toán"));

        // Kiểm tra đúng tài xế của chuyến (đối chiếu actualDriverId)
        if (!actualDriverId.equals(tripPayment.getDriverId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Bạn không có quyền xác nhận thanh toán cho chuyến đi này");
        }

        if (tripPayment.getStatus() != TripPaymentStatus.AWAITING_PAYMENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Chuyến đi này không ở trạng thái chờ xác nhận thanh toán");
        }

        LocalDateTime now = LocalDateTime.now();

        // Cập nhật TripPayment
        tripPayment.setStatus(TripPaymentStatus.COMPLETED);
        tripPayment.setUpdatedAt(now);
        tripPaymentRepository.save(tripPayment);

        // Cập nhật PaymentTransaction
        paymentTransactionRepository.findByTripPaymentId(tripPaymentId).ifPresent(transaction -> {
            transaction.setStatus(TransactionStatus.COMPLETED);
            transaction.setConfirmedAt(now);
            transaction.setUpdatedAt(now);
            paymentTransactionRepository.save(transaction);
        });

        log.info("Driver {} (userId={}) đã xác nhận nhận tiền cho tripPaymentId={}", actualDriverId, driverUserId,
                tripPaymentId);
        return Map.of("message", "Xác nhận nhận tiền thành công");
    }

    // ────────────────────────── 3. TÀI XẾ ĐĂNG KÝ STK NGÂN HÀNG
    // ──────────────────────────
    @Override
    @Transactional
    public Map<String, String> registerDriverPaymentInfo(CreateDriverPaymentInfoRequest request, Jwt jwt) {
        UUID driverUserId = UUID.fromString(jwt.getSubject());

        // GỌI DRIVERSERVICE ĐỂ LẤY driverId THỰC TẾ TRONG BẢNG DRIVERS
        UUID actualDriverId = driverServiceClient.getDriverIdByUserId(driverUserId);
        LocalDateTime now = LocalDateTime.now();

        DriverPaymentInfo info = driverPaymentInfoRepository.findByDriverId(actualDriverId)
                .orElseGet(() -> DriverPaymentInfo.builder()
                        .driverId(actualDriverId)
                        .createdAt(now)
                        .build());

        info.setBankName(request.getBankName());
        info.setBankBin(request.getBankBin());
        info.setBankAccountNumber(request.getBankAccountNumber());
        info.setBankAccountName(request.getBankAccountName());
        info.setUpdatedAt(now);

        driverPaymentInfoRepository.save(info);
        log.info("Tài xế (userId={}, driverId={}) đã cập nhật STK: bank={}, stk={}",
                driverUserId, actualDriverId, request.getBankName(), request.getBankAccountNumber());

        return Map.of("message", "Đăng ký thông tin ngân hàng thành công");
    }

    // ────────────────────────── 4. TỰ ĐỘNG CẬP NHẬT PAY_AFTER KHI STATUS TRIP == COMPLETED ──────────────────────────
    @Override
    @Transactional
    public Map<String, String> completePayAfterTripPayment(String tripId) {
        tripPaymentRepository.findByTripId(tripId).ifPresent(tripPayment -> {
            if (tripPayment.getMethod() == PaymentMethod.PAY_AFTER
                    && tripPayment.getStatus() == TripPaymentStatus.PENDING) {
                tripPayment.setStatus(TripPaymentStatus.COMPLETED);
                tripPayment.setUpdatedAt(LocalDateTime.now());
                tripPaymentRepository.save(tripPayment);
                log.info("Đã tự động cập nhật thanh toán tiền mặt (PAY_AFTER) sang COMPLETED cho tripId={}", tripId);
            }
        });

        return Map.of("message", "Cập nhật trạng thái thanh toán thành công");
    }
}

