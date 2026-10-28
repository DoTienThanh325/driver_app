# Notification Service

`notificationservice` phụ trách tiếp nhận, lưu trữ và gửi thông báo hệ thống đến người dùng (Khách hàng và Tài xế) khi phát sinh các sự kiện trong quá trình đặt chuyến, đổi trạng thái cuốc xe, hoặc thanh toán.

Dịch vụ này hoạt động theo mô hình **hướng sự kiện (Event-Driven)**, tiêu thụ message từ **RabbitMQ** và lưu dữ liệu thông báo vào **PostgreSQL**.

---

## Cấu hình Chính

- **Port**: `8086`.
- **Database**: PostgreSQL `driverapp_notification_db`.
- **Message Broker**: RabbitMQ `localhost:5672` (Queue `trip.notification.queue`).
- **JWT Issuer/JWKS**: `http://localhost:8081`.
- **Cơ chế Hết hạn Thông báo**: Mỗi thông báo khi tạo ra được tự động gán `createdAt = now` và `expiredAt = now + 15 phút` để tối ưu vòng đời dữ liệu.

---

## Xử Lý Sự Kiện Bất Đồng Bộ (RabbitMQ Listener)

### `TripNotificationListener` (Queue: `trip.notification.queue`)
- Lắng nghe các sự kiện cập nhật vòng đời chuyến đi từ `bookingservice`:
  - Tài xế đã nhận chuyến (`ACCEPTED`).
  - Tài xế đang trên đường đến điểm đón (`DRIVER_ARRIVING`).
  - Chuyến đi bắt đầu di chuyển (`IN_PROGRESS`).
  - Chuyến đi hoàn tất (`COMPLETED`).
- Tự động sinh thông báo cho cả Khách hàng (`customerId`) và Tài xế (`driverId`).
- Sử dụng bảng `processed_events` để kiểm tra chống gửi trùng lặp thông báo nếu sự kiện được retry.

---

## Endpoint REST API

### `POST /api/notifications` — Tạo thông báo thủ công
Endpoint nội bộ dành cho các microservices khác hoặc Gateway gọi trực tiếp khi cần gửi thông báo khẩn cấp:

- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "userId": "fa2fbb48-5231-4775-8025-a7bdf064f7bc",
    "title": "Cập nhật chuyến đi",
    "content": "Tài xế Nguyễn Văn A đang trên đường đến điểm đón của bạn."
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "Tạo thông báo thành công"
  }
  ```

---

## Cơ Sở Dữ Liệu & Flyway Migration

Database PostgreSQL: `driverapp_notification_db`

1. `V0__create_notification_table.sql`:
   - Bảng `notifications`: `id UUID PRIMARY KEY`, `title VARCHAR(255)`, `content TEXT`, `user_id UUID NOT NULL`, `expired_at TIMESTAMP`, `created_at TIMESTAMP`.
2. `V1__create_processed_events.sql`:
   - Bảng `processed_events`: Lưu `event_id`, `event_type`, `consumer_name`, `processed_at` phục vụ Idempotency.

---

## Hướng Dẫn Chạy

```bash
cd notificationservice
./mvnw spring-boot:run
```
*(Yêu cầu PostgreSQL `:5432`, RabbitMQ `:5672` và Eureka `:8761` đang hoạt động)*.
