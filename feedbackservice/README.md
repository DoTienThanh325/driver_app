# Feedback Service

`feedbackservice` lưu đánh giá và khiếu nại của người dùng đối với tài xế. Service này yêu cầu JWT hợp lệ từ `userservice`.

## Cấu hình chính

- Port trong `application.yaml`: `8085`.
- Database: PostgreSQL `driverapp_feedback_db`.
- JWT issuer/JWKS: `http://localhost:8081`.
- Migration: Flyway trong `src/main/resources/db/migration`.

Lưu ý: gateway hiện đang route `/api/feedback/**` và `/api/complaints/**` đến port `8086`, khác với port `8085` của service này. Migration SQL hiện dùng giá trị `REJECT` trong check constraint, còn enum Java dùng `REJECTED`.

## Giải thích file

- `pom.xml`: khai báo Spring WebMVC, JPA, Security, OAuth2 Resource Server, Validation, PostgreSQL, Flyway, Lombok và test dependency.
- `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`: Maven Wrapper.
- `.gitignore`, `.gitattributes`: cấu hình Git.
- `HELP.md`: file hướng dẫn mặc định của Spring Initializr.
- `src/main/java/com/driverapp/feedbackservice/FeedbackserviceApplication.java`: class main khởi động service.
- `config/SecurityConfig.java`: tắt CSRF, dùng session stateless và yêu cầu JWT cho mọi request.
- `models/UserFeedback.java`: entity bảng `user_feedbacks`, lưu user id, driver id, rating, comment và thời gian tạo.
- `models/UserComplaination.java`: entity bảng `user_complainations`, lưu user id, driver id, loại báo cáo, trạng thái xử lý và timestamp.
- `models/enums/ReportType.java`: enum loại khiếu nại như `DRIVER_LATE`, `RECKLESS_DRIVING`, `WRONG_ROUTE`, `OVERCHARGING`.
- `models/enums/ComplainationStatus.java`: enum trạng thái `PENDING`, `ACCEPTED`, `REJECTED`.
- `repository/UserFeedbackRepository.java`: JPA repository cho `UserFeedback`.
- `repository/UserComplainationRepository.java`: JPA repository cho `UserComplaination`.
- `src/main/resources/application.yaml`: cấu hình port, datasource, JPA, Flyway và JWT resource server.
- `src/main/resources/db/migration/V0__create_feedback_tables.sql`: tạo bảng `user_feedbacks` và `user_complainations`.
- `src/test/java/com/driverapp/feedbackservice/FeedbackserviceApplicationTests.java`: test khởi tạo context mặc định.
- `target/`: thư mục build sinh ra bởi Maven.

## Cách chạy

```powershell
.\mvnw.cmd spring-boot:run
```
