# Notification Service

`notificationservice` quản lý và lưu trữ thông báo gửi tới người dùng trong hệ thống. Service này tiếp nhận các sự kiện thông báo (ví dụ cập nhật trạng thái chuyến đi từ `bookingservice`) và lưu vào PostgreSQL.

## Cấu hình chính

- Port trong `application.yaml`: `8086`.
- Database: PostgreSQL `driverapp_notification_db`.
- JWT issuer/JWKS: `http://localhost:8081`.
- Migration: Flyway trong `src/main/resources/db/migration` (`V0__create_notification_table.sql`).
- Eureka client name: `notificationservice` (Gateway route: `/api/notifications/**`).

## Endpoint hiện có

### `POST /api/notifications`

Tạo mới thông báo cho người dùng (được gọi nội bộ từ các microservices khác hoặc gateway):

- **HTTP Method**: `POST`
- **Endpoint**: `/api/notifications`
- **Request Body**:
  ```json
  {
    "userId": "fa2fbb48-5231-4775-8025-a7bdf064f7bc",
    "title": "Tài xế đang đến",
    "content": "Tài xế Nguyễn Văn A đang trên đường đến điểm đón của bạn."
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "Tạo thông báo thành công"
  }
  ```

Mỗi thông báo được tự động gán `createdAt = now` và `expiredAt = now + 15 phút`.

## Cơ sở dữ liệu & Migration

Cơ sở dữ liệu PostgreSQL `driverapp_notification_db` được khởi tạo qua 1 file migration duy nhất:
- `src/main/resources/db/migration/V0__create_notification_table.sql`:
  - Bảng `notifications`: `id UUID PRIMARY KEY`, `title VARCHAR(255)`, `content TEXT`, `user_id UUID NOT NULL`, `expired_at TIMESTAMP`, `created_at TIMESTAMP`.

## Giải thích file

- `pom.xml`: khai báo Spring WebMVC, WebSocket, JPA, Security, OAuth2 Resource Server, Validation, PostgreSQL, Flyway, Lombok và test dependency.
- `src/main/java/com/driverapp/notificationservice/NotificationserviceApplication.java`: class main khởi động service.
- `config/SecurityConfig.java`: cấu hình security stateless, yêu cầu JWT cho các request.
- `controller/NotificationController.java`: REST controller tiếp nhận yêu cầu tạo thông báo (`POST /api/notifications`).
- `dto/request/CreateNotificationRequest.java`: DTO nhận `userId`, `title`, `content`.
- `models/Notification.java`: entity bảng `notifications`, tự động khởi tạo `createdAt` và `expiredAt` (+15 phút).
- `repository/NotificationRepository.java`: JPA repository cho `Notification`.
- `service/NotificationService.java` & `service/impl/NotificationServiceImpl.java`: Logic lưu thông báo.
- `src/main/resources/application.yaml`: cấu hình port `8086`, datasource, JPA, Flyway và JWT resource server.
- `src/main/resources/db/migration/V0__create_notification_table.sql`: migration tạo bảng `notifications`.

## Cách chạy

```bash
cd notificationservice
./mvnw spring-boot:run
```
