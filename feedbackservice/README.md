# Feedback Service

`feedbackservice` quản lý toàn bộ quy trình đánh giá sao (Rating), nhận xét (Review) và báo cáo vi phạm/khiếu nại (Complaints) giữa Khách hàng và Tài xế cho từng chuyến đi.

Dịch vụ này sử dụng **PostgreSQL** làm cơ sở dữ liệu chính và phát sự kiện lên **RabbitMQ** để các dịch vụ khác (`driverservice`) tự động cập nhật điểm tín nhiệm và điểm sao trung bình của tài xế.

> **Lưu ý kiến trúc**: Định danh tài xế (`driverId`) đồng nhất với `userId` (lấy từ JWT subject `sub`). `feedbackservice` không cần gọi sang `driverservice` để tra cứu mã tài xế. Cả khách hàng và tài xế đều có thể tạo khiếu nại cho chuyến đi.

---

## Cấu hình Chính

- **Port**: `8085`.
- **Database**: PostgreSQL `driverapp_feedback_db`.
- **Message Broker**: RabbitMQ `localhost:5672` (Direct Exchange `feedback.direct.exchange`).
- **JWT Issuer/JWKS**: `http://localhost:8081`.
- **Migration**: Flyway trong `src/main/resources/db/migration` (`V1__create_feedback_tables.sql`).

---

## Các Endpoint Chính

### 1. Gửi Đánh Giá Tài Xế (`POST /api/feedbacks`)

Khách hàng gửi đánh giá sao và lời nhận xét cho chuyến đi đã hoàn thành:

- **HTTP Method**: `POST`
- **Endpoint**: `/api/feedbacks`
- **Xác thực**: Bearer JWT Token (`ROLE_CUSTOMER`). `customerId` lấy tự động từ `JWT.sub`.
- **Request Body**:
  ```json
  {
    "driverId": "b4c80242-63b7-4a0b-8d02-1a3b5a77c8e9",
    "tripId": "651f8a7e2b3c4d5e6f7a8b9c",
    "rating": 5.0,
    "comment": "Tài xế lái xe cẩn thận, đúng giờ."
  }
  ```
- **Xử lý Bất đồng bộ qua RabbitMQ**:
  - Lưu bản ghi đánh giá vào bảng `user_feedbacks`.
  - Phát sự kiện `feedback.submitted` tới RabbitMQ Exchange `feedback.direct.exchange`.
  - `driverservice` lắng nghe sự kiện này và tự động tính toán lại điểm đánh giá trung bình (`average_rating`) của tài xế.
- **Response `201 Created`**:
  ```json
  {
    "message": "Feedback submitted successfully"
  }
  ```

---

### 2. Gửi Khiếu Nại / Báo Cáo Vi Phạm (`POST /api/complaints`)

Cho phép cả khách hàng (`ROLE_CUSTOMER`) và tài xế (`ROLE_DRIVER`) tạo báo cáo sự cố hoặc hành vi vi phạm phát sinh trong chuyến đi:

- **HTTP Method**: `POST`
- **Endpoint**: `/api/complaints`
- **Xác thực**: Bearer JWT Token.
- **Quy tắc Phân quyền & Tự Động Gán ID**:
  - Khi người gửi là **CUSTOMER**: Bắt buộc có `driverId`. ID khách hàng (`userId`) tự động lấy từ `JWT.sub`.
  - Khi người gửi là **DRIVER**: Bắt buộc có `customerId`. ID tài xế (`driverId`) tự động lấy từ `JWT.sub`.
- **Request Body (Khách hàng gửi)**:
  ```json
  {
    "driverId": "b4c80242-63b7-4a0b-8d02-1a3b5a77c8e9",
    "tripId": "651f8a7e2b3c4d5e6f7a8b9c",
    "reportType": "RECKLESS_DRIVING"
  }
  ```
- **Request Body (Tài xế gửi)**:
  ```json
  {
    "customerId": "fa2fbb48-5231-4775-8025-a7bdf064f7bc",
    "tripId": "651f8a7e2b3c4d5e6f7a8b9c",
    "reportType": "CUSTOMER_NO_SHOW"
  }
  ```
- **Các loại vi phạm (`ReportType`)**:
  - `DRIVER_LATE`: Tài xế đến muộn.
  - `RECKLESS_DRIVING`: Lái xe ẩu, nguy hiểm.
  - `WRONG_ROUTE`: Đi sai đường.
  - `UNPROFESSIONAL_BEHAVIOR`: Thái độ không đúng mực.
  - `VEHICLE_MISMATCH`: Xe không khớp với đăng ký.
  - `OVERCHARGING`: Thu vượt cước phí quy định.
  - `DRIVER_NO_SHOW`: Tài xế không đến điểm đón.
  - `CUSTOMER_NO_SHOW`: Khách không xuất hiện tại điểm đón.
- **Trạng thái xử lý khiếu nại (`ComplainationStatus`)**:
  - `PENDING`: Đang chờ bộ phận hỗ trợ thẩm định.
  - `ACCEPTED`: Khiếu nại được chấp thuận.
  - `REJECTED`: Khiếu nại bị từ chối.
- **Response `201 Created`**:
  ```json
  {
    "message": "Complaint created successfully"
  }
  ```

---

## Cơ Sở Dữ Liệu & Flyway Migration

Database PostgreSQL: `driverapp_feedback_db`

Khởi tạo schema qua file migration:
- `src/main/resources/db/migration/V1__create_feedback_tables.sql`:
  - Bảng `user_feedbacks`: `id`, `user_id`, `driver_id`, `trip_id`, `rating`, `comment`, `created_at`.
  - Bảng `user_complainations`: `id`, `user_id`, `driver_id`, `trip_id`, `report_type`, `status`, `created_at`, `updated_at`.
  - Các chỉ mục: `idx_user_feedbacks_trip_id`, `idx_user_feedbacks_driver_id`, `idx_user_complainations_trip_id`, `idx_user_complainations_driver_id`.

---

## Hướng Dẫn Chạy

```bash
cd feedbackservice
./mvnw spring-boot:run
```
*(Yêu cầu PostgreSQL `:5432`, RabbitMQ `:5672` và Eureka `:8761` đang hoạt động)*.
