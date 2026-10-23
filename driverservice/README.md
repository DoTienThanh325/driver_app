# Driver Service

`driverservice` quản lý hồ sơ tài xế, trạng thái xác minh, giấy tờ, phương tiện và trạng thái sẵn sàng nhận chuyến. Service yêu cầu JWT hợp lệ từ `userservice`; ảnh giấy tờ và phương tiện được lưu trên MinIO, còn URI `s3://...` được lưu trong PostgreSQL.

> **Lưu ý kiến trúc**: Định danh tài xế (`driverId`) được đồng nhất hoàn toàn với mã người dùng (`userId` từ JWT subject). Bảng `drivers` sử dụng `user_id` làm Primary Key. Do đó, các service khác không cần gọi API phụ để tra cứu `driverId` từ `userId`.

## Cấu hình chính

- Port: `8082`.
- Database: PostgreSQL `driverapp_driver_db`.
- Redis: `localhost:6379`.
- Object storage: MinIO tại `http://localhost:9000`, bucket mặc định `driver-documents`.
- JWT issuer/JWKS: `http://localhost:8081`.
- Migration: Flyway trong `src/main/resources/db/migration` (`V0__create_driver_tables.sql`).
- Mỗi ảnh phải là JPEG, PNG hoặc WebP, dung lượng từ 1 byte đến 5 MiB.
- Giới hạn multipart: 5 MB mỗi file và 21 MB mỗi request.

Các biến cấu hình object storage:

| Biến | Giá trị mặc định | Ý nghĩa |
| --- | --- | --- |
| `STORAGE_ENDPOINT` | `http://localhost:9000` | Endpoint Driver Service dùng để upload/xóa object |
| `STORAGE_PUBLIC_ENDPOINT` | `http://localhost:9000` | Endpoint dùng khi tạo URL đọc ảnh có thời hạn |
| `STORAGE_ACCESS_KEY` | `minioadmin` | Access key |
| `STORAGE_SECRET_KEY` | `minioadmin` | Secret key |
| `STORAGE_BUCKET` | `driver-documents` | Bucket lưu ảnh |

## Endpoint hiện có

### `GET /api/drivers/test`

Kiểm tra route và xác thực. Khi gọi qua API Gateway, JWT phải có role `CUSTOMER`.

### `POST /api/drivers/register`

Tạo hồ sơ tài xế ở trạng thái `PENDING`, lưu giấy tờ tùy thân, bằng lái và phương tiện đầu tiên. Endpoint nhận `multipart/form-data` và khi gọi qua API Gateway yêu cầu role `CUSTOMER`.

| Trường | Kiểu | Bắt buộc |
| --- | --- | --- |
| `idCardFront` | file | Có |
| `idCardBack` | file | Có |
| `driverLicenseFront` | file | Có |
| `driverLicenseBack` | file | Có |
| `registrationFront` | file | Có |
| `plate` | file | Có |
| `vehicleType` | `CAR` hoặc `MOTORBIKE` | Có |

Response `201 Created` gồm `driverId`, `status` và `message`. Một user chỉ được tạo một hồ sơ tài xế.

### `POST /api/vehicles`

Thêm phương tiện cho tài xế đã có hồ sơ với trạng thái `APPROVED`. Endpoint nhận `multipart/form-data`:

| Trường | Kiểu | Bắt buộc |
| --- | --- | --- |
| `registrationFront` | file | Có |
| `plate` | file | Có |
| `driverLicenseFront` | file | Khi tài xế chưa có giấy tờ `DRIVER_LICENSE` |
| `driverLicenseBack` | file | Khi tài xế chưa có giấy tờ `DRIVER_LICENSE` |
| `vehicleType` | `CAR` hoặc `MOTORBIKE` | Có |

Response `201 Created` gồm `vehicleId`, `vehicleType` và `message`.

Nếu transaction database thất bại, service sẽ cố gắng xóa các ảnh vừa upload để tránh object rác trên MinIO.

### `GET /api/drivers/check-available/{driverId}`

Kiểm tra tài xế có tồn tại, đã được duyệt (`APPROVED`) và đang sẵn sàng nhận chuyến (`AVAILABLE`) hay không (dành cho `bookingservice` gọi nội bộ khi tài xế nhấn nhận chuyến `acceptTrip`).

- **HTTP Method**: `GET`
- **Path Variable**: `driverId` (UUID, chính là `userId` của tài xế)
- **Response `200 OK`**:
  ```json
  {
    "driverId": "b4c80242-63b7-4a0b-8d02-1a3b5a77c8e9",
    "status": "AVAILABLE"
  }
  ```

### `PATCH /api/drivers/availability`

Cập nhật trạng thái sẵn sàng nhận chuyến của tài xế (`AVAILABLE`, `ON_TRIP`, `OFFLINE`). Khi `bookingservice` hoàn tất chuyến (`COMPLETED`), endpoint này được gọi để giải phóng tài xế về trạng thái `AVAILABLE`.

- **HTTP Method**: `PATCH`
- **Request Body**:
  ```json
  {
    "driverId": "b4c80242-63b7-4a0b-8d02-1a3b5a77c8e9",
    "status": "AVAILABLE"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "message": "Driver availability updated successfully"
  }
  ```

## Cơ sở dữ liệu & Migration

Cơ sở dữ liệu PostgreSQL `driverapp_driver_db` được khởi tạo qua 1 file migration duy nhất:
- `src/main/resources/db/migration/V0__create_driver_tables.sql`:
  - Bảng `drivers`: Khóa chính `user_id UUID PRIMARY KEY`, lưu `verification_status` (`PENDING`, `APPROVED`, `REJECTED`), `reject_reason`, `created_at`, `approved_at`.
  - Bảng `driver_documents`: Khóa ngoại `driver_id REFERENCES drivers(user_id)`, lưu `document_type`, `front_image_uri`, `back_image_uri`.
  - Bảng `driver_vehicles`: Khóa ngoại `driver_id REFERENCES drivers(user_id)`, lưu `registration_front_uri`, `plate_uri`, `vehicle_type`.
  - Bảng `driver_availability`: Khóa ngoại `driver_id REFERENCES drivers(user_id)` UNIQUE, lưu `status` (`OFFLINE`, `AVAILABLE`, `ON_TRIP`, `SUSPENDED`), `updated_at`.

## Giải thích file

- `pom.xml`: khai báo Spring WebMVC, JPA, Security, OAuth2 Resource Server, Validation, PostgreSQL, Flyway, Redis, MinIO SDK, Lombok và test dependency.
- `src/main/java/com/driverapp/driverservice/DriverserviceApplication.java`: class main khởi động service.
- `config/SecurityConfig.java`: tắt CSRF, dùng session stateless và yêu cầu JWT cho mọi request.
- `config/ObjectStorageConfig.java`: tạo MinIO client nội bộ và client dùng endpoint public.
- `controller/DriverRegistrationController.java`: nhận request multipart đăng ký tài xế.
- `controller/DriverVehicleController.java`: nhận request multipart thêm phương tiện.
- `controller/DriverAvailabilityController.java`: kiểm tra tài xế khả dụng (`check-available`) và cập nhật availability (`PATCH /api/drivers/availability`).
- `controller/DriverTestController.java`: controller test route `GET /api/drivers/test`.
- `dto/request/`: các record request cho đăng ký tài xế, thêm phương tiện và cập nhật trạng thái khả dụng.
- `dto/response/`: các record response tương ứng.
- `service/` và `service/impl/`: nghiệp vụ đăng ký tài xế, thêm phương tiện, cập nhật availability, upload ảnh và dọn ảnh khi transaction rollback.
- `storage/DriverImageStorage.java`: validate định dạng/kích thước, upload, xóa và tạo signed URL cho ảnh MinIO.
- `exception/`: chuyển lỗi xung đột dữ liệu hoặc object storage thành Problem Details phù hợp.
- `models/Driver.java`: entity bảng `drivers`, `userId` làm Primary Key, lưu trạng thái xác minh, lý do từ chối, thời điểm tạo và approve.
- `models/DriverDocument.java`: entity bảng `driver_documents`, lưu URI mặt trước/mặt sau giấy tờ tài xế.
- `models/DriverVehicle.java`: entity bảng `driver_vehicles`, lưu URI ảnh đăng ký xe, ảnh biển số và loại xe.
- `models/DriverAvailability.java`: entity bảng `driver_availability`, lưu trạng thái sẵn sàng của tài xế.
- `models/enums/AvailabilityStatus.java`: enum `OFFLINE`, `AVAILABLE`, `ON_TRIP`, `SUSPENDED`.
- `models/enums/DocumentType.java`: enum `ID_CARD`, `DRIVER_LICENSE`.
- `models/enums/VehicleType.java`: enum `CAR`, `MOTORBIKE`.
- `models/enums/VerificationStatus.java`: enum `PENDING`, `APPROVED`, `REJECTED`.
- `repository/`: các JPA repository cho driver, giấy tờ, phương tiện và trạng thái hoạt động.
- `src/main/resources/application.yaml`: cấu hình port, datasource, JPA, Flyway, Redis, JWT, multipart và MinIO.
- `src/main/resources/db/migration/V0__create_driver_tables.sql`: migration tạo các bảng driver, document, vehicle và availability.

## Chạy local

Từ thư mục gốc backend, khởi động MinIO:

```bash
docker compose up -d minio
```

Mở `http://localhost:9001`, đăng nhập bằng credential trong `docker-compose.yml` và tạo bucket `driver-documents`. Sau đó chạy service:

```bash
cd driverservice
./mvnw spring-boot:run
```
