# Notification Service

`notificationservice` lưu và phát thông báo cho người dùng / tài xế trong hệ thống. Service này hỗ trợ API nội bộ cho các service khác gọi sang (như `driverservice` gửi thông báo khi phê duyệt hồ sơ tài xế).

## Cấu hình chính

- Port: `8086`.
- Database: PostgreSQL `driverapp_notification_db`.
- JWT issuer/JWKS: `http://localhost:8081`.
- Migration: Flyway trong `src/main/resources/db/migration`.
- Service Discovery: Đăng ký với Eureka Server (`notificationservice`).

## Endpoint hiện có

### Internal Endpoints (Inter-service)
- `POST /internal/notifications`: API nội bộ tiếp nhận yêu cầu gửi thông báo từ các microservice khác (`userId`, `title`, `content`).

## Cấu trúc thư mục & Giải thích file

- `pom.xml`: Khai báo Spring Web, WebSocket, JPA, Security, OAuth2 Resource Server, PostgreSQL, Flyway, Eureka Client, Lombok...
- `src/main/java/com/driverapp/notificationservice/`:
  - `NotificationserviceApplication.java`: Class main khởi động service.
  - `config/SecurityConfig.java`: Cấu hình stateless security, permitAll các internal endpoint `/internal/**`.
  - `controller/`:
    - `InternalNotificationController.java`: Controller nhận yêu cầu gửi thông báo nội bộ.
  - `dto/request/`:
    - `NotificationRequest.java`: DTO chứa `userId`, `title`, `content`.
  - `models/`:
    - `Notification.java`: Entity bảng `notifications` (title, content, userId, createdAt, expiredAt...). `expiredAt` mặc định bằng `createdAt + 15 phút`.
  - `repository/`:
    - `NotificationRepository.java`: JPA repository cho `Notification`.
  - `service/`:
    - `NotificationService.java` & `impl/NotificationServiceImpl.java`: Service nghiệp vụ lưu thông báo vào database và xử lý phát thông báo.
- `src/main/resources/`:
  - `application.yaml`: Cấu hình port 8086, PostgreSQL, JPA, Flyway, Eureka Client.
  - `db/migration/`: Migration SQL tạo bảng `notifications`.

## Cách chạy

```powershell
.\mvnw.cmd spring-boot:run
```

