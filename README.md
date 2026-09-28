# Technology Driver App Backend

Backend của ứng dụng tài xế công nghệ được xây dựng theo kiến trúc microservices. Mỗi service là một dự án Spring Boot độc lập, có Maven Wrapper và cơ sở dữ liệu riêng. Các service đăng ký với Eureka; client truy cập hệ thống qua API Gateway, nơi xác thực JWT và chuyển tiếp request đến service phù hợp.

## Kiến trúc hệ thống

```text
Client
  |
  v
API Gateway :8080
  |
  +--> User Service         :8081  --> PostgreSQL
  +--> Driver Service       :8082  --> PostgreSQL + Redis
  +--> Booking Service      :8083  --> MongoDB
  +--> Payment Service      :8084  --> MongoDB
  +--> Feedback Service     :8085  --> PostgreSQL
  +--> Notification Service :8086  --> PostgreSQL

Các service và API Gateway <--> Eureka Server :8761
```

API Gateway sử dụng Eureka và Spring Cloud LoadBalancer để định tuyến bằng service name (`lb://userservice`, `lb://driverservice`, ...), không phụ thuộc trực tiếp vào địa chỉ của từng instance.

## Công nghệ chính

- Java 21
- Spring Boot 4.1.1
- Spring Cloud 2025.1.3
- Spring Cloud Gateway WebFlux
- Netflix Eureka và Spring Cloud LoadBalancer
- Spring Security OAuth2 Resource Server, JWT và JWKS
- PostgreSQL, Spring Data JPA và Flyway
- MongoDB
- Redis
- Maven Wrapper
- Lombok

## Các thành phần

| Thành phần | Port mặc định | Vai trò |
| --- | ---: | --- |
| `eureka` | `8761` | Service registry và discovery server |
| `apigateway` | `8080` | Điểm vào chung, xác thực JWT và định tuyến request |
| `userservice` | `8081` | Đăng ký, đăng nhập, OTP, JWT/refresh token và JWKS |
| `driverservice` | `8082` | Hồ sơ tài xế, giấy tờ, phương tiện và trạng thái hoạt động |
| `bookingservice` | `8083` | Chuyến đi/đơn giao, nhà hàng, món ăn và ghép tài xế |
| `paymentservice` | `8084` | Thanh toán và voucher |
| `feedbackservice` | `8085` | Đánh giá và khiếu nại |
| `notificationservice` | `8086` | Thông báo người dùng |

### Route qua API Gateway

| Service | Route |
| --- | --- |
| User | `/api/auth/**`, `/api/users/**`, `/.well-known/jwks.json` |
| Driver | `/api/drivers/**`, `/api/vehicles/**` |
| Booking | `/api/trips/**`, `/api/bookings/**` |
| Payment | `/api/payments/**`, `/api/vouchers/**` |
| Notification | `/api/notifications/**` |
| Feedback | `/api/feedback/**`, `/api/feedbacks/**`, `/api/complaints/**` |

Eureka Dashboard: `http://localhost:8761`

API Gateway: `http://localhost:8080`

## Yêu cầu môi trường

- JDK 21
- PostgreSQL chạy tại `localhost:5432`
- MongoDB chạy tại `localhost:27017`
- Redis chạy tại `localhost:6379`

Tạo các database PostgreSQL sau trước khi khởi động service:

```text
driverapp_user_db
driverapp_driver_db
driverapp_feedback_db
driverapp_notification_db
```

MongoDB sẽ sử dụng hai database:

```text
driverapp_booking_db
driverapp_payment_db
```

Flyway tự động tạo/cập nhật schema cho các service sử dụng PostgreSQL.

## Biến môi trường

| Biến | Ý nghĩa | Giá trị mặc định |
| --- | --- | --- |
| `DB_PASSWORD` | Mật khẩu PostgreSQL | Giá trị local trong `application.yaml` |
| `OTP_CHALLENGE_SECRET` | Secret dùng để ký OTP challenge | Secret local, phải thay khi triển khai |
| `EUREKA_DEFAULT_ZONE` | URL đăng ký Eureka | `http://localhost:8761/eureka/` |
| `EUREKA_PREFER_IP_ADDRESS` | Đăng ký instance bằng địa chỉ IP | `true` |
| `MONGODB_URI` | URI kết nối MongoDB | Database mặc định của từng service |
| `JWT_JWK_SET_URI` | Endpoint JWKS cho booking/payment | `http://localhost:8081/.well-known/jwks.json` |
| `JWT_ISSUER_URI` | JWT issuer cho booking/payment | `http://localhost:8081` |
| `BOOKING_SERVICE_PORT` | Port của Booking Service | `8083` |

> Lưu ý: `paymentservice` hiện cũng đọc biến `BOOKING_SERVICE_PORT` cho port của nó, với giá trị mặc định là `8084`. Không đặt biến này dùng chung khi chạy cả Booking Service và Payment Service trên cùng máy, nếu không hai service có thể bị trùng port.

## Khởi động dự án

Mỗi service có Maven Wrapper riêng. Trên Windows, mở một terminal cho từng service và chạy:

```powershell
cd <ten-service>
.\mvnw.cmd spring-boot:run
```

Trên Linux/macOS:

```bash
cd <ten-service>
./mvnw spring-boot:run
```

Thứ tự khởi động đề xuất:

1. `eureka`
2. `userservice`
3. `driverservice`, `bookingservice`, `paymentservice`, `feedbackservice`, `notificationservice`
4. `apigateway`

Sau khi khởi động, kiểm tra Eureka Dashboard để bảo đảm API Gateway và các service đã đăng ký thành công.

## Chạy kiểm thử

Chạy trong thư mục của service cần kiểm thử:

```powershell
.\mvnw.cmd test
```

## Cấu trúc repository

```text
backend/
├── apigateway/
├── bookingservice/
├── driverservice/
├── eureka/
├── feedbackservice/
├── notificationservice/
├── paymentservice/
└── userservice/
```

## Tài liệu chi tiết

- [API Gateway](apigateway/README.md)
- [User Service](userservice/README.md)
- [Driver Service](driverservice/README.md)
- [Booking Service](bookingservice/README.md)
- [Payment Service](paymentservice/README.md)
- [Notification Service](notificationservice/README.md)
- [Feedback Service](feedbackservice/README.md)
