# Notification Service

`notificationservice` lưu thông báo của người dùng. Service này đang có dependency WebSocket nhưng source hiện tại mới có entity/repository và security, chưa có controller hay handler WebSocket.

## Cấu hình chính

- Port trong `application.yaml`: `8086`.
- Database: PostgreSQL `driverapp_notification_db`.
- JWT issuer/JWKS: `http://localhost:8081`.
- Migration: Flyway trong `src/main/resources/db/migration`.

Service đăng ký Eureka với tên `notificationservice`; gateway định tuyến `/api/notifications/**` đến service name này.

## Giải thích file

- `pom.xml`: khai báo Spring WebMVC, WebSocket, JPA, Security, OAuth2 Resource Server, Validation, PostgreSQL, Flyway, Lombok và test dependency.
- `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`: Maven Wrapper.
- `.gitignore`, `.gitattributes`: cấu hình Git.
- `HELP.md`: file hướng dẫn mặc định của Spring Initializr.
- `src/main/java/com/driverapp/notificationservice/NotificationserviceApplication.java`: class main khởi động service.
- `config/SecurityConfig.java`: tắt CSRF, dùng session stateless và yêu cầu JWT cho mọi request.
- `models/Notification.java`: entity bảng `notifications`, lưu title, content, user id, thời gian tạo và thời gian hết hạn. Khi tạo mới, `expiredAt` mặc định bằng `createdAt + 15 phút`.
- `repository/NotificationRepository.java`: JPA repository cho `Notification`.
- `src/main/resources/application.yaml`: cấu hình port, datasource, JPA, Flyway và JWT resource server.
- `src/main/resources/db/migration/V0__create_notification_table.sql`: tạo bảng `notifications`.
- `src/test/java/com/driverapp/notificationservice/NotificationserviceApplicationTests.java`: test khởi tạo context mặc định.
- `target/`: thư mục build sinh ra bởi Maven.

## Cách chạy

```powershell
.\mvnw.cmd spring-boot:run
```
