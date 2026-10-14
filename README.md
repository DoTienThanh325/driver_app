# Technology Driver App Backend

Hệ thống backend của ứng dụng gọi xe, giao hàng và đặt món công nghệ (Technology Driver App) được xây dựng theo kiến trúc **Microservices**. Mỗi service là một ứng dụng độc lập sử dụng Java 21, Spring Boot, có Maven Wrapper và cơ sở dữ liệu riêng biệt. Toàn bộ hệ thống đăng ký và phát hiện dịch vụ qua Netflix Eureka, client truy cập qua một điểm vào duy nhất là Spring Cloud Gateway (API Gateway) để xác thực JWT và định tuyến yêu cầu.

## Kiến trúc hệ thống

```text
                  +---------------------------+
                  |  Client (Mobile/Web/App)  |
                  +-------------+-------------+
                                |
                                v
                  +---------------------------+
                  |  API Gateway (Port 8080)  |  <--- Giải mã & Phân quyền JWT (RBAC)
                  +-------------+-------------+
                                |
         +----------------------+----------------------+----------------------+
         |                      |                      |                      |
         v                      v                      v                      v
+------------------+   +------------------+   +------------------+   +------------------+
|   User Service   |   |  Driver Service  |   | Booking Service  |   | Payment Service  |
|   (Port 8081)    |   |   (Port 8082)    |   |   (Port 8083)    |   |   (Port 8084)    |
|   PostgreSQL     |   |PostgreSQL + MinIO|   |     MongoDB      |   |     MongoDB      |
+------------------+   +------------------+   +------------------+   +------------------+
         |                      |                      |                      |
         +----------------------+----------------------+----------------------+
         |                                             |
         v                                             v
+------------------+                         +------------------+
| Feedback Service |                         |Notification Svc  |
|   (Port 8085)    |                         |   (Port 8086)    |
|   PostgreSQL     |                         |   PostgreSQL     |
+------------------+                         +------------------+

         Toàn bộ các dịch vụ và API Gateway kết nối Eureka Server (Port 8761)
```

## Các nguyên lý thiết kế then chốt

1. **Đồng nhất mã định danh tài xế (`driverId` = `userId`)**:
   - `driverId` trong toàn bộ hệ thống (`driverservice`, `bookingservice`, `paymentservice`, `feedbackservice`) chính là `userId` của tài xế (lấy trực tiếp từ claim `sub` của JWT token).
   - Bảng `drivers` sử dụng `user_id UUID PRIMARY KEY`.
   - Loại bỏ hoàn toàn các lời gọi API nội bộ giữa các service để chuyển đổi qua lại giữa `userId` và `driverId`, giúp tối ưu hóa hiệu năng và đơn giản hóa kiến trúc.
2. **Cơ sở dữ liệu độc lập & Flyway Migration hợp nhất**:
   - Mỗi service sử dụng cơ sở dữ liệu riêng biệt (Database per Service pattern).
   - Mỗi service dùng SQL (`userservice`, `driverservice`, `feedbackservice`, `notificationservice`) được chuẩn hóa migration với **duy nhất 1 file Flyway** khởi tạo schema hoàn chỉnh và dữ liệu mẫu cần thiết.
3. **Xác thực JWT & Cấp phép tập trung (JWKS & RBAC)**:
   - `userservice` đóng vai trò JWT Issuer, phát hành cặp khóa RSA và expose public key tại `/.well-known/jwks.json`.
   - API Gateway và các resource server xác thực chữ ký token thông qua JWKS endpoint này.
   - Hỗ trợ 4 vai trò chính: `CUSTOMER`, `DRIVER`, `ADMIN`, `BUSINESS`.
4. **Phát triển & Kiểm thử tiện lợi (Local OTP Debugging)**:
   - `userservice` sử dụng `LocalSmsSender` in mã OTP 6 số trực tiếp ra console log, hỗ trợ phát triển và chạy thử ngay mà không cần cấu hình gateway SMS trả phí (Twilio).

## Công nghệ chính

- **Ngôn ngữ & Framework**: Java 21, Spring Boot 4.1.1, Spring Cloud 2025.1.3
- **Gateway & Registry**: Spring Cloud Gateway WebFlux, Netflix Eureka Server, Spring Cloud LoadBalancer
- **Bảo mật**: Spring Security OAuth2 Resource Server, JWT (Nimbus JOSE + JWT), BCrypt, HMAC-SHA256
- **Cơ sở dữ liệu Quan hệ**: PostgreSQL, Spring Data JPA, Hibernate, Flyway Migration
- **Cơ sở dữ liệu Document**: MongoDB, Spring Data MongoDB
- **Bộ nhớ đệm & Phiên làm việc**: Redis
- **Lưu trữ đối tượng (Object Storage)**: MinIO (S3-compatible API)
- **Công cụ build & triển khai**: Maven Wrapper (`./mvnw` / `mvnw.cmd`), Docker Compose

## Danh sách Dịch vụ & Cổng mặc định

| Dịch vụ | Port | Cơ sở dữ liệu | Vai trò chính |
| :--- | :---: | :--- | :--- |
| **eureka** | `8761` | Không | Service Discovery & Registry server |
| **apigateway** | `8080` | Không | Reverse proxy, CORS, giải mã JWT và phân quyền API |
| **userservice** | `8081` | PostgreSQL (`driverapp_user_db`) | Đăng ký, đăng nhập, OTP, cấp JWT/Refresh token, JWKS |
| **driverservice** | `8082` | PostgreSQL (`driverapp_driver_db`) + MinIO | Quản lý hồ sơ tài xế, xác minh giấy tờ, phương tiện, availability |
| **bookingservice** | `8083` | MongoDB (`driverapp_booking_db`) | Đặt chuyến, nhận chuyến, tiến độ chuyến đi, thực đơn nhà hàng |
| **paymentservice** | `8084` | MongoDB (`driverapp_payment_db`) | Thanh toán chuyến đi (VietQR, tiền mặt), STK tài xế, voucher |
| **feedbackservice** | `8085` | PostgreSQL (`driverapp_feedback_db`) | Đánh giá sao tài xế, khiếu nại vi phạm chuyến đi |
| **notificationservice** | `8086` | PostgreSQL (`driverapp_notification_db`) | Lưu trữ và gửi thông báo người dùng |

### Định tuyến qua API Gateway (`http://localhost:8080`)

| Đường dẫn route | Service xử lý |
| --- | --- |
| `/api/auth/**`, `/api/users/**`, `/.well-known/jwks.json` | `lb://userservice` |
| `/api/drivers/**`, `/api/vehicles/**` | `lb://driverservice` |
| `/api/trips/**`, `/api/bookings/**`, `/api/businesses/**` | `lb://bookingservice` |
| `/api/payments/**`, `/api/vouchers/**` | `lb://paymentservice` |
| `/api/feedback/**`, `/api/feedbacks/**`, `/api/complaints/**` | `lb://feedbackservice` |
| `/api/notifications/**` | `lb://notificationservice` |

## Yêu cầu môi trường

- **JDK 21**
- **PostgreSQL**: Đang chạy tại `localhost:5432`
- **MongoDB**: Đang chạy tại `localhost:27017`
- **Redis**: Đang chạy tại `localhost:6379`
- **MinIO**: Đang chạy tại `localhost:9000` (API S3) và `localhost:9001` (Web Console)

### Khởi tạo Database

Tạo 4 database PostgreSQL trước khi khởi động các service:

```sql
CREATE DATABASE driverapp_user_db;
CREATE DATABASE driverapp_driver_db;
CREATE DATABASE driverapp_feedback_db;
CREATE DATABASE driverapp_notification_db;
```

MongoDB sẽ tự động tạo 2 cơ sở dữ liệu khi phát sinh bản ghi đầu tiên:
- `driverapp_booking_db`
- `driverapp_payment_db`

### Khởi động MinIO

Chạy MinIO thông qua Docker Compose ở thư mục gốc backend:

```bash
docker compose up -d minio
```

Đăng nhập Web Console tại `http://localhost:9001` (User/Pass trong `docker-compose.yml`), tạo bucket tên `driver-documents`.

## Hướng dẫn khởi động hệ thống

Khởi động các microservices theo thứ tự sau (mở mỗi terminal riêng cho từng service):

1. **Eureka Server**:
   ```bash
   cd eureka && ./mvnw spring-boot:run
   ```
2. **User Service** (cần chạy trước để API Gateway tải được JWKS):
   ```bash
   cd userservice && ./mvnw spring-boot:run
   ```
3. **Các Service Nghiệp Vụ**:
   ```bash
   cd driverservice && ./mvnw spring-boot:run
   cd bookingservice && ./mvnw spring-boot:run
   cd paymentservice && ./mvnw spring-boot:run
   cd feedbackservice && ./mvnw spring-boot:run
   cd notificationservice && ./mvnw spring-boot:run
   ```
4. **API Gateway**:
   ```bash
   cd apigateway && ./mvnw spring-boot:run
   ```

*(Trên Windows, thay `./mvnw` bằng `.\mvnw.cmd`)*

## Kiểm tra trạng thái & Kiểm thử

- **Eureka Dashboard**: Truy cập `http://localhost:8761` để bảo đảm toàn bộ các service đã xuất hiện trong danh sách `Instances currently registered with Eureka`.
- **Chạy unit/integration test**:
  ```bash
  cd <service-name>
  ./mvnw test
  ```

## Cấu trúc thư mục

```text
backend/
├── docker-compose.yml              # Docker Compose dịch vụ bổ trợ (MinIO)
├── README.md                       # Tài liệu tổng quan toàn bộ hệ thống
├── apigateway/                     # Spring Cloud Gateway WebFlux
├── eureka/                         # Eureka Service Discovery
├── userservice/                    # Auth, Users, Roles, JWT & JWKS
├── driverservice/                  # Hồ sơ tài xế, giấy tờ, phương tiện, MinIO
├── bookingservice/                 # Đặt chuyến, nhận chuyến, nhà hàng, món ăn
├── paymentservice/                 # Thanh toán VietQR, tiền mặt, voucher, STK tài xế
├── feedbackservice/                # Đánh giá & khiếu nại chuyến đi
└── notificationservice/            # Thông báo hệ thống
```

## Tài liệu chi tiết từng dịch vụ

- [API Gateway](apigateway/README.md)
- [User Service](userservice/README.md)
- [Driver Service](driverservice/README.md)
- [Booking Service](bookingservice/README.md)
- [Payment Service](paymentservice/README.md)
- [Feedback Service](feedbackservice/README.md)
- [Notification Service](notificationservice/README.md)
