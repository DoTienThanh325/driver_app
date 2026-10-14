# Payment Service

`paymentservice` quản lý toàn bộ luồng thanh toán chuyến đi, giao dịch VietQR, thông tin tài khoản ngân hàng của tài xế và hệ thống khuyến mãi (voucher). Service này sử dụng MongoDB và yêu cầu JWT hợp lệ từ `userservice`.

> **Lưu ý kiến trúc**: Định danh tài xế (`driverId`) đồng nhất với `userId` (lấy từ JWT subject `sub`). `paymentservice` không cần gọi sang `driverservice` để tra cứu thông tin định danh tài xế.

## Cấu hình chính

- Port mặc định: `8084` (cấu hình qua biến `PAYMENT_SERVICE_PORT` hoặc `BOOKING_SERVICE_PORT`).
- Database: MongoDB `driverapp_payment_db`.
- JWT issuer/JWKS: mặc định `http://localhost:8081`.

## Các Endpoint chính

### 1. Thanh toán Chuyến đi (`/api/payments`)

#### `POST /api/payments/trip`
Khách hàng (`ROLE_CUSTOMER`) tạo yêu cầu thanh toán cho chuyến đi:
- Phương thức: `PAY_BEFORE` (chuyển khoản VietQR trước/trong chuyến) hoặc `PAY_AFTER` (tiền mặt khi kết thúc chuyến).
- Hỗ trợ áp dụng voucher: Kiểm tra điều kiện đơn tối thiểu, hạn dùng, tính toán số tiền giảm giá và số tiền thực trả.
- Với `PAY_BEFORE`: Hệ thống tự động tra cứu STK của tài xế (`DriverPaymentInfo`) và sinh URL ảnh VietQR kèm nội dung chuyển khoản định danh (`PaymentTransaction`).
- **Response**: Trả về `TripPaymentResponse` gồm `tripPaymentId`, `fare`, `discountAmount`, `finalAmount`, `paymentMethod`, `status` và `qrCodeUrl` (nếu là `PAY_BEFORE`).

#### `PATCH /api/payments/trip/{tripPaymentId}/confirm`
Tài xế (`ROLE_DRIVER`) xác nhận đã nhận được tiền từ khách hàng:
- Kiểm tra quyền: Chỉ đúng tài xế của chuyến đi mới được xác nhận (`driverId == JWT.sub`).
- Chuyển trạng thái `PaymentTransaction` sang `SUCCESS` và `TripPayment` sang `COMPLETED`.

#### `POST /api/payments/driver-payment-info`
Tài xế (`ROLE_DRIVER`) đăng ký hoặc cập nhật thông tin tài khoản ngân hàng để nhận tiền chuyển khoản:
- `driverId` được tự động lấy từ `JWT.sub`.
- Thông tin gồm: Mã ngân hàng (`bin` / `bankCode`), số tài khoản (`accountNumber`), tên chủ tài khoản (`accountName`).

#### `PATCH /api/payments/trip/internal/{tripId}/complete`
Endpoint nội bộ dành cho `bookingservice` gọi khi chuyến đi tiền mặt (`PAY_AFTER`) được hoàn thành (`COMPLETED`). Tự động cập nhật `TripPayment` tương ứng sang `COMPLETED`.

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

- `TripPayment`: Lưu thông tin thanh toán chuyến đi gồm `tripId`, `customerId`, `driverId`, `fare`, `discountAmount`, `finalAmount`, phương thức `paymentMethod` (`PAY_BEFORE`, `PAY_AFTER`), trạng thái `status` (`PENDING`, `COMPLETED`, `FAILED`), danh sách `TripPaymentVoucher`.
- `PaymentTransaction`: Giao dịch thanh toán điện tử (VietQR) gồm `tripPaymentId`, `amount`, mã giao dịch/nội dung chuyển khoản, `qrUrl`, `status` (`PENDING`, `SUCCESS`, `EXPIRED`, `FAILED`).
- `DriverPaymentInfo`: Lưu thông tin ngân hàng của tài xế (`driverId` = `userId`), ngân hàng, số tài khoản, tên chủ tài khoản.
- `Voucher`: Thông tin voucher hệ thống hoặc đối tác nhà hàng gồm mã code, discount percent/amount, max discount, min order amount, max usage, expiry date.
- `UserVoucher`: Ví voucher của người dùng (`userId`), chứa danh sách các `UserVoucherItem`.

## Giải thích file

- `pom.xml`: khai báo Spring WebMVC, Spring Data MongoDB, Security, OAuth2 Resource Server, Validation, Lombok và test dependency.
- `src/main/java/com/driverapp/paymentservice/PaymentserviceApplication.java`: class main khởi động service.
- `config/SecurityConfig.java`: cấu hình bảo mật stateless, xác thực JWT resource server.
- `controller/TripPaymentController.java`: các API tạo thanh toán chuyến đi, tài xế xác nhận nhận tiền, đăng ký STK tài xế và API nội bộ hoàn tất thanh toán.
- `controller/VoucherController.java`: các API phát hành, claim và tra cứu voucher.
- `client/BookingServiceClient.java`: RestClient gọi sang Booking Service để lấy thông tin chuyến đi / giá vé phục vụ thanh toán.
- `dto/request/`: các record/class request cho thanh toán chuyến đi, đăng ký STK tài xế, tạo voucher, claim voucher.
- `dto/response/`: các record/class response cho thanh toán chuyến đi và chi tiết voucher.
- `models/`: Document MongoDB cho thanh toán, giao dịch, tài khoản ngân hàng tài xế và voucher.
- `models/enums/`: enum `PaymentMethod`, `TripPaymentStatus`, `TransactionStatus`, `VoucherType`, `VoucherProviderType`.
- `repository/`: Spring Data MongoDB repositories.
- `service/` & `service/impl/`: nghiệp vụ thanh toán chuyến đi, sinh mã VietQR, xác nhận thanh toán và nghiệp vụ voucher.
- `src/main/resources/application.yaml`: cấu hình port, MongoDB URI, UUID representation và JWT resource server.

## Cách chạy

```bash
cd paymentservice
./mvnw spring-boot:run
```
