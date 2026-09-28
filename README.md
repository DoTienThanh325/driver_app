# Technology Driver App Backend

Backend của dự án được tách thành nhiều Spring Boot service độc lập. Mỗi service có `pom.xml`, Maven Wrapper riêng và có thể chạy riêng trên port riêng. `apigateway` là điểm vào chung, nhận request từ client, xác thực JWT và route request đến các service nghiệp vụ.

## Công nghệ chính

- Java 21.
- Spring Boot 4.1.1.
- Spring Security OAuth2 Resource Server với JWT.
- Spring Cloud Gateway WebFlux cho `apigateway`.
- PostgreSQL + Flyway cho các service dùng dữ liệu quan hệ: user, driver, notification, feedback.
- MongoDB cho các service lưu document: booking, payment.
- Lombok để giảm boilerplate cho model/entity.

## Cấu trúc service

- `apigateway`: cửa ngõ API, cấu hình CORS, route và phân quyền theo JWT role.
- `userservice`: đăng ký, đăng nhập, OTP, cấp JWT/refresh token, JWKS public key và thông tin người dùng hiện tại.
- `driverservice`: quản lý dữ liệu tài xế, giấy tờ, phương tiện và trạng thái sẵn sàng nhận chuyến.
- `bookingservice`: quản lý chuyến đi/đơn giao, món ăn, nhà hàng và offer ghép tài xế.
- `paymentservice`: quản lý thanh toán chuyến đi, voucher và voucher của người dùng.
- `notificationservice`: lưu thông báo gửi cho người dùng.
- `feedbackservice`: lưu đánh giá và khiếu nại của người dùng về tài xế.

## Port và route hiện tại

| Thành phần | Port cấu hình | Ghi chú |
| --- | ---: | --- |
| `apigateway` | `8080` | Điểm vào chung cho client |
| `userservice` | `8081` | Cấp JWT và JWKS tại `/.well-known/jwks.json` |
| `driverservice` | `8082` | Gateway route `/api/drivers/**`, `/api/vehicles/**` |
| `bookingservice` | `8083` | Gateway route `/api/trips/**`, `/api/bookings/**` |
| `paymentservice` | `8084` | Gateway route `/api/payments/**`, `/api/vouchers/**` |
| `notificationservice` | `8086` | `application.yaml` đang để port `8086`, trong gateway route đang trỏ đến `8085` |
| `feedbackservice` | `8085` | `application.yaml` đang để port `8085`, trong gateway route đang trỏ đến `8086` |

Lưu ý: cấu hình route của gateway hiện tại đang ngược port giữa notification và feedback so với `application.yaml` của hai service này.

## Yêu cầu hạ tầng cục bộ

- PostgreSQL đang chạy local.
- MongoDB đang chạy local.
- Redis đang chạy local cho `driverservice`.
- Các database PostgreSQL:
  - `driverapp_user_db`
  - `driverapp_driver_db`
  - `driverapp_notification_db`
  - `driverapp_feedback_db`
- Các database MongoDB:
  - `driverapp_booking_db`
  - `driverapp_payment_db`

Biến môi trường đang được hỗ trợ:

- `DB_PASSWORD`: mật khẩu PostgreSQL, mặc định `12345khongcho`.
- `OTP_CHALLENGE_SECRET`: secret ký OTP challenge của `userservice`.
- `BOOKING_SERVICE_PORT`: đang được dùng trong `bookingservice` và `paymentservice`.
- `MONGODB_URI`: URI MongoDB cho service dùng MongoDB.
- `JWT_JWK_SET_URI`, `JWT_ISSUER_URI`: endpoint JWKS và issuer của JWT cho booking/payment.

## Cách chạy từng service

Vào thư mục service cần chạy và dùng Maven Wrapper:

```powershell
.\mvnw.cmd spring-boot:run
```

Ví dụ:

```powershell
cd userservice
.\mvnw.cmd spring-boot:run
```

Nên khởi động `userservice` trước các service khác vì các service còn lại và gateway cần JWT issuer/JWKS từ `userservice`.

## Tài liệu chi tiết

Mỗi service có README riêng:

- [apigateway/README.md](apigateway/README.md)
- [userservice/README.md](userservice/README.md)
- [driverservice/README.md](driverservice/README.md)
- [bookingservice/README.md](bookingservice/README.md)
- [paymentservice/README.md](paymentservice/README.md)
- [notificationservice/README.md](notificationservice/README.md)
- [feedbackservice/README.md](feedbackservice/README.md)
