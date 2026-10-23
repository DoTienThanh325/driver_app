# Feedback Service

`feedbackservice` quản lý đánh giá sao, nhận xét và báo cáo khiếu nại vi phạm giữa khách hàng và tài xế cho từng chuyến đi. Service yêu cầu JWT hợp lệ từ `userservice`.

> **Lưu ý kiến trúc**: Định danh tài xế (`driverId`) đồng nhất với `userId` (lấy từ JWT subject `sub`). `feedbackservice` không cần gọi sang `driverservice` để tra cứu mã tài xế. Cả khách hàng và tài xế đều có thể tạo khiếu nại cho chuyến đi.

## Cấu hình chính

- Port: `8085`.
- Database: PostgreSQL `driverapp_feedback_db`.
- JWT issuer/JWKS: `http://localhost:8081`.
- Migration: Flyway trong `src/main/resources/db/migration` (`V1__create_feedback_tables.sql`).

## Các Endpoint chính

### 1. Gửi Đánh Giá Tài Xế (`POST /api/feedbacks`)

Khách hàng gửi đánh giá sao và lời nhận xét cho chuyến đi đã hoàn thành:

- **HTTP Method**: `POST`
- **Endpoint**: `/api/feedbacks`
- **Xác thực**: Bearer JWT Token (`ROLE_CUSTOMER`)
- **Request Body**:
  ```json
  {
    "driverId": "b4c80242-63b7-4a0b-8d02-1a3b5a77c8e9",
    "tripId": "651f8a7e2b3c4d5e6f7a8b9c",
    "rating": 4.5,
    "comment": "Tài xế lái xe cẩn thận, đúng giờ."
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "Feedback submitted successfully"
  }
  ```

---

### 2. Gửi Khiếu Nại / Báo Cáo Vi Phạm (`POST /api/complaints`)

Cho phép cả khách hàng (`ROLE_CUSTOMER`) và tài xế (`ROLE_DRIVER`) tạo báo cáo sự cố/vi phạm phát sinh trong chuyến đi:

- **HTTP Method**: `POST`
- **Endpoint**: `/api/complaints`
- **Xác thực**: Bearer JWT Token
- **Quy tắc phân quyền**:
  - Khi người gửi là **CUSTOMER**: Bắt buộc có `driverId`. ID khách hàng (`userId`) tự động lấy từ `JWT.sub`.
  - Khi người gửi là **DRIVER**: Bắt buộc có `customerId`. ID tài xế (`driverId`) tự động lấy từ `JWT.sub`.
- **Request Body (Ví dụ Khách hàng gửi)**:
  ```json
  {
    "driverId": "b4c80242-63b7-4a0b-8d02-1a3b5a77c8e9",
    "tripId": "651f8a7e2b3c4d5e6f7a8b9c",
    "reportType": "RECKLESS_DRIVING"
  }
  ```
- **Request Body (Ví dụ Tài xế gửi)**:
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
  - `VEHICLE_MISMATCH`: Xe không đúng thông tin đăng ký.
  - `OVERCHARGING`: Thu quá cước phí quy định.
  - `DRIVER_NO_SHOW`: Tài xế không đến điểm đón.
  - `CUSTOMER_NO_SHOW`: Khách hàng không xuất hiện tại điểm đón.
- **Trạng thái khiếu nại (`ComplainationStatus`)**:
  - `PENDING`: Chờ bộ phận hỗ trợ xử lý.
  - `ACCEPTED`: Khiếu nại được chấp thuận.
  - `REJECTED`: Khiếu nại bị từ chối.
- **Response `201 Created`**:
  ```json
  {
    "message": "Complaint created successfully"
  }
  ```

---

## Cơ sở dữ liệu & Migration

Cơ sở dữ liệu PostgreSQL `driverapp_feedback_db` được khởi tạo qua 1 file migration duy nhất:
- `src/main/resources/db/migration/V1__create_feedback_tables.sql`:
  - Bảng `user_feedbacks`: `id`, `user_id`, `driver_id`, `trip_id`, `rating`, `comment`, `created_at`. Chỉ mục: `idx_user_feedbacks_trip_id`, `idx_user_feedbacks_driver_id`.
  - Bảng `user_complainations`: `id`, `user_id`, `driver_id`, `trip_id`, `report_type`, `status`, `created_at`, `updated_at`. Chỉ mục: `idx_user_complainations_trip_id`, `idx_user_complainations_driver_id`.

## Giải thích file

- `pom.xml`: khai báo Spring WebMVC, JPA, Security, OAuth2 Resource Server, Validation, PostgreSQL, Flyway, Lombok và test dependency.
- `src/main/java/com/driverapp/feedbackservice/FeedbackserviceApplication.java`: class main khởi động service.
- `config/SecurityConfig.java`: tắt CSRF, dùng session stateless và yêu cầu JWT cho mọi request.
- `controller/FeedbackController.java`: endpoint gửi đánh giá sao tài xế (`POST /api/feedbacks`).
- `controller/ComplaintController.java`: endpoint gửi khiếu nại vi phạm chuyến đi (`POST /api/complaints`).
- `dto/request/CreateFeedbackRequest.java`: DTO nhận `driverId`, `tripId`, `rating`, `comment`.
- `dto/request/CreateComplaintRequest.java`: DTO nhận `driverId`, `customerId`, `tripId`, `reportType`.
- `models/UserFeedback.java`: entity bảng `user_feedbacks`.
- `models/UserComplaination.java`: entity bảng `user_complainations`.
- `models/enums/ReportType.java`: enum loại báo cáo vi phạm.
- `models/enums/ComplainationStatus.java`: enum trạng thái khiếu nại (`PENDING`, `ACCEPTED`, `REJECTED`).
- `repository/UserFeedbackRepository.java`: JPA repository cho `UserFeedback`.
- `repository/UserComplainationRepository.java`: JPA repository cho `UserComplaination`.
- `service/FeedbackService.java` & `service/impl/FeedbackServiceImpl.java`: Logic lưu đánh giá tài xế.
- `service/ComplaintService.java` & `service/impl/ComplaintServiceImpl.java`: Logic kiểm tra role, xác định bên khiếu nại và tạo bản ghi khiếu nại.
- `src/main/resources/application.yaml`: cấu hình port, datasource, JPA, Flyway và JWT resource server.
- `src/main/resources/db/migration/V1__create_feedback_tables.sql`: migration tạo các bảng feedback và complainations.

## Cách chạy

```bash
cd feedbackservice
./mvnw spring-boot:run
```
