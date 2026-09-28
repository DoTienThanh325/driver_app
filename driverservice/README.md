# Driver Service

`driverservice` lưu thông tin tài xế, trạng thái xác minh, giấy tờ, phương tiện và trạng thái sẵn sàng nhận chuyến. Service này yêu cầu JWT hợp lệ từ `userservice`.

## Cấu hình chính

- Port: `8082`.
- Database: PostgreSQL `driverapp_driver_db`.
- Redis: `localhost:6379`.
- JWT issuer/JWKS: `http://localhost:8081`.
- Migration: Flyway trong `src/main/resources/db/migration`.

## Endpoint hiện có

- `GET /api/drivers/test`: endpoint test route, trả về message nếu request qua được security/gateway.

## Giải thích file

- `pom.xml`: khai báo Spring WebMVC, JPA, Security, OAuth2 Resource Server, Validation, PostgreSQL, Flyway, Redis, Lombok và test dependency.
- `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`: Maven Wrapper.
- `.gitignore`, `.gitattributes`: cấu hình Git.
- `HELP.md`: file hướng dẫn mặc định của Spring Initializr.
- `src/main/java/com/driverapp/driverservice/DriverserviceApplication.java`: class main khởi động service.
- `config/SecurityConfig.java`: tắt CSRF, dùng session stateless và yêu cầu JWT cho mọi request.
- `controller/DriverTestController.java`: controller test route `GET /api/drivers/test`.
- `models/Driver.java`: entity bảng `drivers`, liên kết `userId`, trạng thái xác minh, lý do từ chối, thời điểm tạo và approve.
- `models/DriverDocument.java`: entity bảng `driver_documents`, lưu ảnh mặt trước/mặt sau giấy tờ tài xế.
- `models/DriverVehicle.java`: entity bảng `driver_vehicles`, lưu ảnh đăng ký xe, ảnh biển số và loại xe.
- `models/DriverAvailability.java`: entity bảng `driver_availability`, lưu trạng thái sẵn sàng của tài xế.
- `models/AvailabilityStatus.java`: enum `OFFLINE`, `AVAILABLE`, `ON_TRIP`, `SUSPENDED`.
- `models/DocumentType.java`: enum `ID_CARD`, `DRIVER_LICENSE`.
- `models/VehicleType.java`: enum `CAR`, `MOTORBIKE`.
- `models/VerificationStatus.java`: enum `PENDING`, `APPROVED`, `REJECTED`.
- `repository/DriverRepository.java`: JPA repository cho `Driver`.
- `repository/DriverDocumentRepository.java`: JPA repository cho `DriverDocument`.
- `repository/DriverVehicleRepository.java`: JPA repository cho `DriverVehicle`.
- `repository/DriverAvailabilityRepository.java`: JPA repository cho `DriverAvailability`.
- `src/main/resources/application.yaml`: cấu hình port, datasource, JPA, Flyway, Redis và JWT resource server.
- `src/main/resources/db/migration/V0__create_driver_tables.sql`: tạo các bảng driver, document, vehicle và availability.
- `src/test/java/com/driverapp/driverservice/DriverserviceApplicationTests.java`: test khởi tạo context mặc định.
- `target/`: thư mục build sinh ra bởi Maven.

## Cách chạy

```powershell
.\mvnw.cmd spring-boot:run
```
