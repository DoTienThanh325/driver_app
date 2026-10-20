# Payment Service

`paymentservice` quản lý toàn bộ luồng thanh toán chuyến đi, giao dịch VietQR, thông tin tài khoản ngân hàng của tài xế và hệ thống khuyến mãi (voucher). Service này sử dụng MongoDB và yêu cầu JWT hợp lệ từ `userservice`.

> **Lưu ý kiến trúc**: Định danh tài xế (`driverId`) đồng nhất với `userId` (lấy từ JWT subject `sub`). `paymentservice` không cần gọi sang `driverservice` để tra cứu thông tin định danh tài xế.

## Cấu hình chính

- Port mặc định: `8084` (cấu hình qua biến `PAYMENT_SERVICE_PORT` hoặc `BOOKING_SERVICE_PORT`).
- Database: MongoDB `driverapp_payment_db`.
- JWT issuer/JWKS: mặc định `http://localhost:8081`.

## Các Endpoint chính

### 1. Thanh toán Chuyến đi (`/api/payments`)

#### Quy trình Thanh toán Chuyến đi Tự Động
- **Khi tạo chuyến:** Bản ghi thanh toán `TripPayment` được tự động khởi tạo ngầm qua sự kiện `trip.created` với phương thức **`PAY_DIRECTLY`** (trạng thái `PENDING`). Không còn API tạo thanh toán thủ công.
- **Khi tài xế nhận cuốc:** Sự kiện `trip.driver-assigned` cập nhật `driverId` vào `TripPayment` nhưng **vẫn giữ nguyên phương thức `PAY_DIRECTLY`**.
- **Cơ chế SAGA Rollback:** Nếu quá trình tạo thanh toán mặc định gặp lỗi (sau khi retry qua Dead Letter Queue), event bù trừ `trip.payment-init.failed` sẽ được gửi về `bookingservice` để tự động xóa chuyến đi và báo lỗi cho khách.

#### `PATCH /api/payments/trip/{tripId}/pay-before`
Khách hàng (`ROLE_CUSTOMER`) chuyển đổi phương thức thanh toán sang trả trước (**`PAY_BEFORE`**) sau khi tài xế đã nhận chuyến:
- **Điều kiện:** Chuyến đi đã có tài xế nhận (`driverId != null`).
- Tự động tra cứu tài khoản ngân hàng của tài xế (`DriverPaymentInfo`).
- Sinh mã ảnh VietQR Napas 24/7 trực tiếp vào STK tài xế và lưu giao dịch `PaymentTransaction` (thời hạn 15 phút).
- Chuyển trạng thái `TripPayment` sang `AWAITING_PAYMENT`.
- **Response**: Trả về `TripPaymentResponse` gồm `tripPaymentId`, `totalAmount`, `discountAmount`, `finalAmount`, `status` và `qrPayment` (chi tiết tài khoản, URL ảnh QR, nội dung chuyển tiền).

#### `GET /api/payments/trip/{tripId}`
Khách hàng (`ROLE_CUSTOMER`) hoặc Tài xế (`ROLE_DRIVER`) xem chi tiết thanh toán của chuyến đi (bao gồm cả thông tin mã QR nếu là `PAY_BEFORE`).

#### `PATCH /api/payments/trip/{tripPaymentId}/confirm`
Tài xế (`ROLE_DRIVER`) xác nhận đã nhận được tiền chuyển khoản từ khách hàng:
- Kiểm tra quyền: Chỉ đúng tài xế của chuyến đi mới được xác nhận (`driverId == JWT.sub`).
- Chuyển trạng thái `PaymentTransaction` sang `COMPLETED` và `TripPayment` sang `COMPLETED`.

#### `POST /api/payments/driver-payment-info`
Tài xế (`ROLE_DRIVER`) đăng ký hoặc cập nhật thông tin tài khoản ngân hàng để nhận tiền chuyển khoản:
- `driverId` được tự động lấy từ `JWT.sub`.
- Thông tin gồm: Mã ngân hàng (`bankBin`), tên ngân hàng (`bankName`), số tài khoản (`bankAccountNumber`), tên chủ tài khoản (`bankAccountName`).

#### `PATCH /api/payments/trip/internal/{tripId}/complete`
Endpoint nội bộ (hoặc tự động xử lý qua event RabbitMQ `trip.completed`) khi chuyến đi trực tiếp (`PAY_DIRECTLY`) hoàn thành (`COMPLETED`). Tự động cập nhật `TripPayment` tương ứng sang `COMPLETED`.

---

### 2. Quản lý Khuyến mãi Voucher (`/api/vouchers`)

#### `POST /api/vouchers`
Admin (`ROLE_ADMIN`) hoặc Doanh nghiệp (`ROLE_BUSINESS`) phát hành voucher mới:
- Thiết lập mã code, loại voucher (`APP`, `RESTAURANT`), loại dịch vụ áp dụng (`FOOD`, `RIDE`), tỷ lệ giảm giá, mức giảm tối đa, đơn tối thiểu, số lượng phát hành và hạn sử dụng.

#### `POST /api/vouchers/claim`
Khách hàng (`ROLE_CUSTOMER`) lưu voucher vào ví voucher cá nhân (`user_vouchers`).

#### `GET /api/vouchers/app`
Khách hàng xem danh sách voucher còn hiệu lực do hệ thống phát hành, có thể lọc theo `type` (`FOOD`, `RIDE`, ...).

#### `GET /api/vouchers/restaurants/{restaurantId}`
Khách hàng xem danh sách voucher áp dụng cho một nhà hàng cụ thể.

---

## Cấu trúc Model dữ liệu (MongoDB)

- `TripPayment`: Lưu thông tin thanh toán chuyến đi gồm `tripId`, `customerId`, `driverId`, `shippFare`, `totalFoodPrice`, `totalAmount`, `discountAmount`, `finalAmount`, phương thức `paymentMethod` (`PAY_DIRECTLY`, `PAY_BEFORE`), trạng thái `status` (`PENDING`, `AWAITING_PAYMENT`, `COMPLETED`, `FAILED`), danh sách `TripPaymentVoucher`.
- `PaymentTransaction`: Giao dịch thanh toán điện tử (VietQR) gồm `tripPaymentId`, `amount`, mã giao dịch/nội dung chuyển khoản, `qrDataURL`, ngân hàng, STK, tên chủ tài khoản, `status` (`PENDING`, `COMPLETED`, `EXPIRED`, `FAILED`), `expiresAt`.
- `DriverPaymentInfo`: Lưu thông tin ngân hàng của tài xế (`driverId` = `userId`), tên ngân hàng, mã BIN, số tài khoản, tên chủ tài khoản.
- `Voucher`: Thông tin voucher hệ thống hoặc đối tác nhà hàng gồm mã code, discount percent/amount, max discount, min order amount, max usage, expiry date.
- `UserVoucher`: Ví voucher của người dùng (`userId`), chứa danh sách các `UserVoucherItem`.

## Giải thích file

- `pom.xml`: khai báo Spring WebMVC, Spring Data MongoDB, RabbitMQ, Security, OAuth2 Resource Server, Validation, Lombok và test dependency.
- `src/main/java/com/driverapp/paymentservice/PaymentserviceApplication.java`: class main khởi động service.
- `config/SecurityConfig.java`: cấu hình bảo mật stateless, xác thực JWT resource server và cho phép truy cập internal endpoint không cần JWT.
- `config/rabbitmq/PaymentRabbitMQConfig.java`: cấu hình Topic Exchange, Dead Letter Queue (`trip.payment-init.dlq`, `trip.payment-complete.dlq`) và các queue xử lý thanh toán tự động, gán tài xế.
- `listener/TripLifecycleEventListener.java`: lắng nghe sự kiện `trip.created` để khởi tạo `PAY_DIRECTLY`, bắt lỗi DLQ gửi SAGA bù trừ `trip.payment-init.failed`, và lắng nghe `trip.driver-assigned` để cập nhật `driverId`.
- `listener/TripCompletedEventListener.java`: lắng nghe `trip.completed` để tự động hoàn tất thanh toán `PAY_DIRECTLY`.
- `controller/TripPaymentController.java`: các API khách hàng đổi sang `PAY_BEFORE`, xem chi tiết thanh toán, tài xế xác nhận nhận tiền, đăng ký STK tài xế và API nội bộ hoàn tất thanh toán.
- `controller/VoucherController.java`: các API phát hành, claim và tra cứu voucher.
- `client/BookingServiceClient.java`: RestClient gọi sang Booking Service để lấy thông tin chuyến đi / giá vé phục vụ thanh toán.
- `dto/request/`: các DTO request đổi sang `PAY_BEFORE` (`SwitchToPayBeforeRequest`), đăng ký STK tài xế, tạo voucher, claim voucher.
- `dto/response/`: các DTO response cho thanh toán chuyến đi và chi tiết voucher.
- `event/`: các class payload DomainEvent và SAGA (`TripPaymentInitFailedPayload`, `PaymentCompleteFailedPayload`, `TripEventPayload`).
- `models/`: Document MongoDB cho thanh toán, giao dịch, tài khoản ngân hàng tài xế và voucher.
- `models/enums/`: enum `PaymentMethod` (`PAY_DIRECTLY`, `PAY_BEFORE`), `TripPaymentStatus`, `TransactionStatus`, `VoucherType`, `VoucherProviderType`.
- `repository/`: Spring Data MongoDB repositories.
- `service/TripPaymentService.java` & `service/impl/TripPaymentServiceImpl.java`: nghiệp vụ khởi tạo thanh toán tự động, chuyển sang `PAY_BEFORE`, sinh mã VietQR Napas 24/7, xác nhận thanh toán và hoàn tất cuốc xe.
- `src/main/resources/application.yaml`: cấu hình port, MongoDB URI, RabbitMQ và JWT resource server.

## Cách chạy

```bash
cd paymentservice
./mvnw spring-boot:run
```
