# Driver Service

`driverservice` phụ trách quản lý toàn bộ vòng đời hồ sơ tài xế: tiếp nhận đăng ký trực tuyến, lưu trữ giấy tờ tùy thân & bằng lái xe trên MinIO, thẩm định hồ sơ của Quản trị viên (Admin Verification), quản lý phương tiện di chuyển, đồng bộ trạng thái sẵn sàng nhận chuyến (**Driver Availability**) và cập nhật điểm đánh giá trung bình (**Average Rating**).

> **Lưu ý kiến trúc then chốt**: Định danh tài xế (`driverId`) được đồng nhất hoàn toàn với mã người dùng (`userId` từ JWT subject). Bảng `drivers` sử dụng `user_id UUID PRIMARY KEY`.

---

## Cấu hình Chính

- **Port**: `8082`.
- **Database**: PostgreSQL `driverapp_driver_db`.
- **In-memory**: Redis `localhost:6379`.
- **Object Storage**: MinIO tại `http://localhost:9000` (Web Console `:9001`), bucket mặc định `driver-documents`.
- **Message Broker**: RabbitMQ `localhost:5672` (Topic Exchange).
- **JWT Issuer/JWKS**: `http://localhost:8081`.
- **Cơ chế lưu ảnh**: Ảnh gốc lưu trên MinIO dạng `s3://...`, API sinh Pre-signed URL có thời hạn cho client.

---

## Danh Sách Endpoint Hiện Có

### 1. Đăng Ký & Bổ Sung Hồ Sơ Tài Xế

#### `POST /api/drivers/register` — Khách hàng đăng ký làm tài xế
- **Method**: `POST` (`multipart/form-data`)
- **Quyền yêu cầu**: `ROLE_CUSTOMER`
- **Các trường gửi lên**:
  | Tên trường | Kiểu | Bắt buộc | Mô tả |
  | :--- | :---: | :---: | :--- |
  | `idCardFront` | File | Có | Mặt trước CCCD |
  | `idCardBack` | File | Có | Mặt sau CCCD |
  | `driverLicenseFront` | File | Có | Mặt trước Giấy phép lái xe |
  | `driverLicenseBack` | File | Có | Mặt sau Giấy phép lái xe |
  | `registrationFront` | File | Có | Giấy đăng ký xe (Cavet) |
  | `plate` | File | Có | Ảnh chụp biển số xe |
  | `vehicleType` | String | Có | `CAR` hoặc `MOTORBIKE` |
- **Xử lý**: Tải ảnh lên bucket MinIO, lưu hồ sơ vào PostgreSQL với trạng thái `PENDING`, khởi tạo bản ghi `driver_availability` là `OFFLINE`. Nếu ghi DB lỗi, ảnh vừa upload sẽ được dọn dẹp ngay để chống file rác.

#### `PATCH /api/drivers/registration` — Cập nhật hồ sơ bị từ chối
- **Method**: `PATCH` (`multipart/form-data`)
- **Quyền yêu cầu**: `ROLE_CUSTOMER`
- **Mục đích**: Cho phép tài xế cập nhật lại ảnh giấy tờ khi hồ sơ trước đó bị Admin từ chối (`REJECTED`). Sau khi nộp lại, hồ sơ chuyển về `PENDING` để xét duyệt lại.

---

### 2. Quản Trị Viên Xét Duyệt Hồ Sơ (`ROLE_ADMIN`)

#### `GET /api/drivers/candidates` — Danh sách hồ sơ chờ duyệt
- **Method**: `GET`
- **Quyền yêu cầu**: `ROLE_ADMIN`
- **Chức năng**: Lấy danh sách toàn bộ ứng viên tài xế đang ở trạng thái `PENDING`.

#### `GET /api/drivers/{driverId}` — Xem chi tiết hồ sơ tài xế
- **Method**: `GET`
- **Quyền yêu cầu**: `ROLE_ADMIN`, `ROLE_DRIVER`, `ROLE_CUSTOMER`
- **Chức năng**: Trả về đầy đủ thông tin cá nhân, loại xe, trạng thái xác minh, điểm đánh giá trung bình và các Pre-signed URL để xem trực tiếp các ảnh giấy tờ từ MinIO.

#### `PATCH /api/drivers/{driverId}/verification-status` — Phê duyệt / Từ chối hồ sơ
- **Method**: `PATCH`
- **Quyền yêu cầu**: `ROLE_ADMIN`
- **Request Body**:
  ```json
  {
    "status": "APPROVED",
    "rejectReason": null
  }
  ```
  *(Nếu từ chối: `"status": "REJECTED"`, `"rejectReason": "Ảnh bằng lái bị mờ, không rõ số hiệu"`)*.
- **Quy trình Bất đồng bộ qua RabbitMQ**:
  - Khi Admin chọn `APPROVED`: `driverservice` phát sự kiện `driver.approved` lên RabbitMQ.
  - `userservice` lắng nghe sự kiện này và tự động cấp thêm quyền `ROLE_DRIVER` cho tài khoản người dùng tương ứng.

---

### 3. Quản Lý Phương Tiện & Trạng Thái Hoạt Động

#### `POST /api/vehicles` — Đăng ký thêm phương tiện mới
- **Method**: `POST` (`multipart/form-data`)
- **Quyền yêu cầu**: `ROLE_DRIVER` (hồ sơ tài xế đã được duyệt `APPROVED`).
- **Các trường**: `registrationFront`, `plate`, `vehicleType` (`CAR`/`MOTORBIKE`).

#### `GET /api/drivers/check-available/{driverId}` — Kiểm tra tính khả dụng (Internal)
- Được `bookingservice` gọi nội bộ để xác nhận tài xế đã được duyệt (`APPROVED`) và đang sẵn sàng nhận khách (`AVAILABLE`).

#### `PATCH /api/drivers/availability` — Cập nhật trạng thái nhận cuốc
- Cập nhật trạng thái của tài xế: `AVAILABLE`, `ON_TRIP`, `OFFLINE`, `SUSPENDED`.

---

### 4. Xử Lý Sự Kiện Bất Đồng Bộ (RabbitMQ Listeners)

1. **`DriverAvailabilityEventListener`**: Lắng nghe sự kiện vòng đời cuốc xe từ `bookingservice` để tự động cập nhật trạng thái hoạt động:
   - Khi tài xế nhận cuốc: chuyển sang `ON_TRIP`.
   - Khi hoàn tất cuốc (`trip.completed`): tự động giải phóng tài xế về lại `AVAILABLE`.
2. **`FeedbackRatingUpdateListener`**: Lắng nghe sự kiện đánh giá từ `feedbackservice`. Mỗi khi khách hàng chấm sao cho chuyến đi, listener này sẽ tự động tính toán lại điểm đánh giá trung bình (`average_rating`) và lưu vào bảng `drivers`.
3. **`DriverRoleRollbackListener`**: Thành phần SAGA bù trừ. Nếu `userservice` gặp sự cố không thể cấp role `DRIVER`, sự kiện bù trừ sẽ kích hoạt rollback trạng thái hồ sơ tài xế từ `APPROVED` về `PENDING` và ghi nhận chi tiết vào bảng `saga_compensation_log`.

---

## Cơ Sở Dữ Liệu & Flyway Migration

PostgreSQL Database: `driverapp_driver_db`

1. `V0__create_driver_tables.sql`:
   - `drivers`: `user_id UUID PRIMARY KEY`, trạng thái xác minh, lý do từ chối, thời gian duyệt.
   - `driver_documents`: Lưu URI giấy tờ (`ID_CARD`, `DRIVER_LICENSE`).
   - `driver_vehicles`: Lưu thông tin xe và loại xe (`CAR`, `MOTORBIKE`).
   - `driver_availability`: Trạng thái sẵn sàng (`OFFLINE`, `AVAILABLE`, `ON_TRIP`, `SUSPENDED`).
2. `V1__create_async_and_saga_tables.sql`:
   - `processed_events`: Bảng chống trùng lặp sự kiện (Idempotent Consumer).
   - `saga_compensation_log`: Bảng ghi vết các giao dịch bù trừ SAGA.
   - Bổ sung cột `average_rating NUMERIC(2, 1) DEFAULT 5.0` trong bảng `drivers`.

---

## Hướng Dẫn Chạy

```bash
cd driverservice
./mvnw spring-boot:run
```
*(Đảm bảo PostgreSQL, Redis, MinIO và Eureka Server đang chạy)*.
