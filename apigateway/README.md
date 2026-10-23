# API Gateway

`apigateway` là cửa ngõ tập trung (Reverse Proxy) duy nhất của toàn bộ hệ thống backend. Service này dùng Spring Cloud Gateway WebFlux để định tuyến các yêu cầu tới các microservices qua Eureka Server, xử lý CORS, giải mã và xác thực chữ ký JWT từ `userservice`, đồng thời phân quyền theo từng vai trò (RBAC) ở cấp độ gateway.

## Cấu hình chính

- Port: `8080`.
- Service Registry: Đăng ký và phân giải service qua Eureka Server (`http://localhost:8761/eureka/`).
- JWT Issuer/JWKS: Lấy public key từ `userservice` tại `http://localhost:8081/.well-known/jwks.json`.
- Hệ thống roles từ JWT: Đọc từ claim `roles` và chuyển thành `ROLE_<ROLE_NAME>`.

## Bảng ánh xạ Route (Routing Rules)

| Route Pattern | Service đích | Mô tả |
| --- | --- | --- |
| `/api/auth/**`, `/api/users/**`, `/.well-known/jwks.json` | `lb://userservice` | Đăng ký, đăng nhập, OTP, token, JWKS |
| `/api/drivers/**`, `/api/vehicles/**` | `lb://driverservice` | Hồ sơ tài xế, giấy tờ, phương tiện, availability |
| `/api/trips/**`, `/api/bookings/**`, `/api/businesses/**` | `lb://bookingservice` | Đặt chuyến, nhận chuyến, nhà hàng, món ăn, đăng ký kinh doanh |
| `/api/payments/**`, `/api/vouchers/**` | `lb://paymentservice` | Thanh toán, VietQR, STK tài xế, voucher |
| `/api/notifications/**` | `lb://notificationservice` | Thông báo thời gian thực và lịch sử thông báo |
| `/api/feedback/**`, `/api/feedbacks/**`, `/api/complaints/**` | `lb://feedbackservice` | Đánh giá sao tài xế và khiếu nại vi phạm chuyến đi |

## Quy tắc Phân quyền (Security & Authorization Rules)

| Phương thức | Endpoint Pattern | Quyền yêu cầu | Mô tả |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/**` | `permitAll()` | Đăng ký, đăng nhập, verify OTP, refresh token, logout |
| `OPTIONS` | `/**` | `permitAll()` | Preflight request CORS |
| `GET` / `POST` | `/api/drivers/register`, `/api/drivers/test` | `ROLE_CUSTOMER` | Đăng ký trở thành tài xế |
| `*` | `/api/bookings/foods/**`, `/api/bookings/restaurants/**` | `ROLE_BUSINESS` | Quản lý nhà hàng và thực đơn món ăn |
| `POST` | `/api/businesses/registration` | `ROLE_CUSTOMER` | Khách hàng đăng ký kinh doanh nhà hàng |
| `*` | `/api/businesses/*/review` | `ROLE_ADMIN` | Quản trị viên duyệt hồ sơ kinh doanh |
| `*` | `/api/drivers/*/verification-status`, `/api/drivers/candidates` | `ROLE_ADMIN` | Duyệt/từ chối hồ sơ tài xế |
| `PATCH` | `/api/trips/status` | `ROLE_DRIVER` | Tài xế cập nhật trạng thái chuyến đi |
| `PATCH` | `/api/trips/*/cancel` | `ROLE_CUSTOMER` | Khách hàng yêu cầu hủy chuyến đi |
| `POST` | `/api/trips` | `ROLE_CUSTOMER`, `ROLE_DRIVER` | Tạo chuyến đi hoặc nhận chuyến |
| `POST` | `/api/payments/trip` | `ROLE_CUSTOMER` | Khách hàng khởi tạo thanh toán chuyến đi |
| `PATCH` | `/api/payments/trip/*/confirm` | `ROLE_DRIVER` | Tài xế xác nhận nhận tiền thanh toán |
| `POST` / `PUT` | `/api/payments/driver-payment-info` | `ROLE_DRIVER` | Tài xế đăng ký / cập nhật STK nhận tiền |
| `POST` | `/api/vouchers` | `ROLE_ADMIN`, `ROLE_BUSINESS` | Phát hành voucher khuyến mãi |
| `POST` | `/api/vouchers/claim` | `ROLE_CUSTOMER` | Khách hàng nhận voucher |
| `GET` | `/api/vouchers/app` | `ROLE_CUSTOMER` | Khách hàng xem voucher ứng dụng |
| `POST` | `/api/feedbacks/**` | `ROLE_CUSTOMER` | Khách hàng đánh giá chuyến đi |
| `POST` | `/api/complaints/**` | `ROLE_CUSTOMER`, `ROLE_DRIVER` | Khách hàng hoặc tài xế khiếu nại chuyến đi |
| Mọi request khác | `/**` | Authenticated | Yêu cầu JWT hợp lệ |

## Giải thích file

- `pom.xml`: khai báo Spring Boot, Spring Cloud Gateway WebFlux, Spring Security, OAuth2 Resource Server, Actuator, Eureka Client và test dependency.
- `src/main/java/com/driverapp/apigateway/ApigatewayApplication.java`: class main khởi động Gateway.
- `src/main/java/com/driverapp/apigateway/config/SecurityConfig.java`: cấu hình phân quyền SecurityWebFilterChain, chuyển claim `roles` thành `ROLE_*`, áp dụng các path matchers.
- `src/main/resources/application.yaml`: cấu hình port `8080`, Eureka registry, JWKS endpoint, CORS và các routes loadbalancer.

## Cách chạy

```bash
cd apigateway
./mvnw spring-boot:run
```

> **Lưu ý**: Cần khởi động `eureka` và `userservice` trước để API Gateway có thể đăng ký dịch vụ và tải bộ khóa công khai JWKS phục vụ xác thực JWT.
