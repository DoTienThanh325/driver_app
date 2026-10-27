# Driver Service

`driverservice` phụ trách quản lý toàn bộ vòng đời hồ sơ tài xế: tiếp nhận đăng ký trực tuyến, lưu trữ giấy tờ tùy thân & bằng lái xe trên MinIO, thẩm định hồ sơ của Quản trị viên (Admin Verification), quản lý phương tiện di chuyển, đồng bộ trạng thái sẵn sàng nhận chuyến (**Driver Availability**) và cập nhật điểm đánh giá trung bình (**Average Rating**).

> **Lưu ý kiến trúc then chốt**: Định danh tài xế (`driverId`) được đồng nhất hoàn toàn với mã người dùng (`userId` từ JWT subject). Bảng `drivers` sử dụng `user_id UUID PRIMARY KEY`.

---

## Cấu hình Chính

- **Port**: `8082`.
- **Database**: PostgreSQL `driverapp_driver_db`.
- **In-memory**: Redis `localhost:6379`.
- **Object Storage**: MinIO tại `http://localhost:9000` (Web Console `:9001`), bucket mặc định `driver-documents`.
- **Định dạng tệp hỗ trợ**: JPG, PNG, WEBP, HEIC, HEIF, PDF, GIF, BMP (kiểm tra an toàn qua magic bytes header & Content-Type).
- **Giới hạn tệp tải lên (Multipart)**: `max-file-size: 15MB`, `max-request-size: 50MB`.
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
  | `vehicleType` | String | Có | Loại phương tiện đăng ký ban đầu (`CAR` hoặc `MOTORBIKE`) |
  | `registrationFront` | File | Có | Giấy đăng ký xe (Cavet) |
  | `plate` | File | Có | Ảnh chụp biển số xe |
  | `driverLicenseFront` | File | Không* | Mặt trước GPLX (tự động phân loại theo `vehicleType` nếu không gửi loại bằng riêng) |
  | `driverLicenseBack` | File | Không* | Mặt sau GPLX |
  | `driverLicenseMotorbikeFront` | File | Không* | Mặt trước GPLX xe máy (`DRIVER_LICENSE_MOTORBIKE`) |
  | `driverLicenseMotorbikeBack` | File | Không* | Mặt sau GPLX xe máy |
  | `driverLicenseCarFront` | File | Không* | Mặt trước GPLX ô tô (`DRIVER_LICENSE_CAR`) |
  | `driverLicenseCarBack` | File | Không* | Mặt sau GPLX ô tô |
  > *\*Lưu ý*: Bắt buộc phải có ít nhất một cặp bằng lái phù hợp với loại phương tiện đăng ký ban đầu (`vehicleType`).
- **Xử lý**: Tải ảnh lên bucket MinIO, lưu hồ sơ vào PostgreSQL với trạng thái `PENDING`, khởi tạo bản ghi `driver_availability` là `OFFLINE`. Nếu ghi DB lỗi, ảnh vừa upload sẽ được dọn dẹp ngay để chống file rác.

#### `PATCH /api/drivers/registration` — Cập nhật hồ sơ bị từ chối / Bổ sung giấy tờ
- **Method**: `PATCH` (`multipart/form-data`)
- **Quyền yêu cầu**: `ROLE_CUSTOMER`, `ROLE_DRIVER`
- **Các trường có thể cập nhật**: Bất kỳ tệp giấy tờ nào cần sửa đổi (`idCardFront`, `idCardBack`, `driverLicenseFront`, `driverLicenseBack`, `driverLicenseMotorbikeFront`, `driverLicenseMotorbikeBack`, `driverLicenseCarFront`, `driverLicenseCarBack`, `registrationFront`, `plate`).
- **Mục đích**: Cho phép ứng viên tài xế cập nhật lại ảnh giấy tờ khi hồ sơ trước đó bị Admin từ chối (`REJECTED`) để chuyển về `PENDING` xét duyệt lại, hoặc cho phép tài xế đã duyệt cập nhật bổ sung giấy tờ.

---

### 2. Quản Trị Viên Xét Duyệt Hồ Sơ (`ROLE_ADMIN`)

#### `GET /api/drivers/candidates` — Danh sách hồ sơ chờ duyệt
- **Method**: `GET`
- **Quyền yêu cầu**: `ROLE_ADMIN`
- **Chức năng**: Lấy danh sách toàn bộ ứng viên tài xế đang ở trạng thái `PENDING`.

#### `GET /api/drivers/{driverId}` — Xem chi tiết hồ sơ tài xế
- **Method**: `GET`
- **Quyền yêu cầu**: `ROLE_ADMIN`, `ROLE_DRIVER`, `ROLE_CUSTOMER`
- **Chức năng**: Trả về đầy đủ thông tin cá nhân, loại xe, trạng thái xác minh, điểm đánh giá trung bình và các Pre-signed URL để xem trực tiếp các ảnh giấy tờ từ MinIO (CCCD, bằng lái xe máy, bằng lái ô tô, cavet, biển số).

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
- **Quyền yêu cầu**: `ROLE_CUSTOMER`, `ROLE_DRIVER`
- **Các trường gửi lên**:
  | Tên trường | Kiểu | Bắt buộc | Mô tả |
  | :--- | :---: | :---: | :--- |
  | `registrationFront` | File | Có | Giấy đăng ký xe (Cavet) |
  | `plate` | File | Có | Ảnh chụp biển số xe |
  | `vehicleType` | Query/Part | Có | `CAR` hoặc `MOTORBIKE` |
  | `driverLicenseFront` | File | Tùy chọn | Mặt trước GPLX tương ứng nếu tài xế chưa có bằng lái cho loại xe này |
  | `driverLicenseBack` | File | Tùy chọn | Mặt sau GPLX tương ứng |
- **Kết quả trả về**: `AddVehicleResponse` gồm `vehicleId`, `vehicleType`, `status` (`APPROVED` hoặc `PENDING`), `registrationFrontUrl`, `plateUrl`.

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
3. `V2__update_driver_documents_and_vehicles.sql`:
   - Nâng cấp ràng buộc CHECK trên `driver_documents` hỗ trợ `DRIVER_LICENSE_MOTORBIKE` và `DRIVER_LICENSE_CAR`.
   - Migration dữ liệu cũ: tự động ánh xạ `DRIVER_LICENSE` sang loại bằng tương ứng với phương tiện đã đăng ký.
   - Bổ sung cột `status VARCHAR(20) NOT NULL DEFAULT 'APPROVED'` cho bảng `driver_vehicles` (với ràng buộc `CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))`).
   - Đánh chỉ mục (`idx_driver_vehicles_driver_id`, `idx_driver_documents_driver_id_type`) tăng tốc độ truy vấn.

---

## Hướng Dẫn Chạy

```bash
cd driverservice
./mvnw spring-boot:run
```
*(Đảm bảo PostgreSQL, Redis, MinIO và Eureka Server đang chạy)*.
