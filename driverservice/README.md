# Driver Service

`driverservice` quản lý hồ sơ tài xế, quy trình phê duyệt giấy tờ/phương tiện, trạng thái sẵn sàng hoạt động (`OFFLINE`, `AVAILABLE`, `ON_TRIP`) và tích hợp inter-service giao tiếp với `userservice` và `notificationservice`.

## Cấu hình chính

- Port: `8082`.
- Database: PostgreSQL `driverapp_driver_db`.
- Redis: `localhost:6379`.
- JWT issuer/JWKS: `http://localhost:8081`.
- Inter-service communication: Spring Cloud LoadBalancer + `RestClient` (Eureka Service Discovery).
- Migration: Flyway trong `src/main/resources/db/migration`.

## Endpoint hiện có

### Driver Endpoints
- `GET /api/drivers/test`: Endpoint kiểm thử kết nối qua API Gateway.
- `PUT /api/drivers/me/availability`: Cập nhật trạng thái hoạt động của tài xế (`OFFLINE`, `AVAILABLE`, ...).

### Admin / Approval Endpoints
- `POST /api/drivers/{driverId}/approve`: Phê duyệt hồ sơ tài xế, tự động gọi `userservice` nâng role thành `DRIVER` và gọi `notificationservice` gửi thông báo.
- `POST /api/drivers/{driverId}/reject`: Từ chối hồ sơ tài xế và gọi `notificationservice` gửi thông báo.

## Cấu trúc thư mục & Giải thích file

- `pom.xml`: Khai báo Spring Web, JPA, Security, OAuth2 Resource Server, PostgreSQL, Flyway, Redis, Spring Cloud Netflix Eureka Client, Spring Cloud LoadBalancer, Lombok...
- `src/main/java/com/driverapp/driverservice/`:
  - `DriverserviceApplication.java`: Class main khởi động service.
  - `client/`:
    - `UserServiceClient.java`: Client gọi REST API nội bộ `userservice` qua Eureka (`http://userservice`) với fallback URL.
    - `NotificationClient.java`: Client gọi REST API nội bộ `notificationservice` qua Eureka (`http://notificationservice`) với fallback URL.
  - `config/`:
    - `RestClientConfig.java`: Định nghĩa `@Primary RestClient.Builder` (tránh xung đột với Eureka Client) và `@LoadBalanced RestClient.Builder` (dùng cho inter-service calls).
    - `SecurityConfig.java`: Cấu hình JWT resource server security.
  - `controller/`:
    - `DriverApprovalController.java`: Controller xử lý API phê duyệt/từ chối tài xế.
    - `DriverAvailabilityController.java`: Controller xử lý API cập nhật trạng thái hoạt động tài xế.
    - `DriverTestController.java`: Test route `GET /api/drivers/test`.
  - `dto/response/`:
    - `DriverApprovalResponse.java`: DTO phản hồi kết quả phê duyệt.
    - `DriverAvailabilityResponse.java`: DTO phản hồi trạng thái sẵn sàng.
  - `exception/`:
    - `GlobalExceptionHandler.java`: Xử lý ngoại lệ toàn cục cho service.
  - `models/`:
    - `Driver.java`: Entity bảng `drivers` (userId, verificationStatus, rejectReason...).
    - `DriverDocument.java`: Entity bảng `driver_documents` (ảnh CMND/CCCD, bằng lái).
    - `DriverVehicle.java`: Entity bảng `driver_vehicles` (đăng ký xe, biển số, loại xe).
    - `DriverAvailability.java`: Entity bảng `driver_availability` (trạng thái hoạt động tài xế).
    - `enums/`:
      - `AvailabilityStatus.java`: Enum `OFFLINE`, `AVAILABLE`, `ON_TRIP`, `SUSPENDED`.
      - `DocumentType.java`: Enum `ID_CARD`, `DRIVER_LICENSE`.
      - `VehicleType.java`: Enum `CAR`, `MOTORBIKE`.
      - `VerificationStatus.java`: Enum `PENDING`, `APPROVED`, `REJECTED`.
  - `repository/`:
    - `DriverRepository.java`: JPA repository cho `Driver`.
    - `DriverDocumentRepository.java`: JPA repository cho `DriverDocument`.
    - `DriverVehicleRepository.java`: JPA repository cho `DriverVehicle`.
    - `DriverAvailabilityRepository.java`: JPA repository cho `DriverAvailability`.
  - `service/`:
    - `DriverApprovalService.java` & `impl/DriverApprovalServiceImpl.java`: Xử lý logic phê duyệt/từ chối tài xế & gửi thông báo inter-service.
    - `DriverAvailabilityService.java` & `impl/DriverAvailabilityServiceImpl.java`: Xử lý logic cập nhật trạng thái online/offline.
- `src/main/resources/`:
  - `application.yaml`: Cấu hình port 8082, PostgreSQL, JPA, Flyway, Redis, JWT và Eureka Client.
  - `db/migration/`: Flyway migration tạo các bảng driver, documents, vehicles, availability.

## Cách chạy

```powershell
.\mvnw.cmd spring-boot:run
```

