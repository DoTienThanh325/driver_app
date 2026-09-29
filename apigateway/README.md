# API Gateway

`apigateway` là cửa ngõ vào backend. Service này dùng Spring Cloud Gateway WebFlux để route request đến các service bên dưới, cấu hình CORS, xác thực JWT và áp dụng một số rule phân quyền.

## Cấu hình chính

- Port: `8080`.
- JWT issuer/JWKS: lấy từ `userservice` tại `http://localhost:8081`.
- Khối cấu hình CORS mẫu cho `http://localhost:3000` và `http://localhost:4200` hiện đang được comment trong `application.yaml`, vì vậy chưa được áp dụng.
- Route hiện tại:
  - `/api/auth/**`, `/api/users/**`, `/.well-known/jwks.json` -> `lb://userservice`.
  - `/api/drivers/**`, `/api/vehicles/**` -> `lb://driverservice`.
  - `/api/trips/**`, `/api/bookings/**` -> `lb://bookingservice`.
  - `/api/payments/**`, `/api/vouchers/**` -> `lb://paymentservice`.
  - `/api/notifications/**` -> `lb://notificationservice`.
  - `/api/feedback/**`, `/api/feedbacks/**`, `/api/complaints/**` -> `lb://feedbackservice`.

## Giải thích file

- `pom.xml`: khai báo Spring Boot, Spring Cloud Gateway WebFlux, Spring Security, OAuth2 Resource Server, Actuator và test dependency.
- `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`: Maven Wrapper để chạy/build service mà không cần cài Maven global.
- `.gitignore`, `.gitattributes`: cấu hình Git cho service.
- `HELP.md`: file hướng dẫn mặc định được tạo bởi Spring Initializr.
- `src/main/java/com/driverapp/apigateway/ApigatewayApplication.java`: class main khởi động Spring Boot application.
- `src/main/java/com/driverapp/apigateway/config/SecurityConfig.java`: cấu hình security WebFlux, tắt CSRF, đọc role từ claim `roles`, cho phép `OPTIONS` và các API auth public, yêu cầu JWT cho các API còn lại. `GET /api/drivers/test` và `POST /api/drivers/register` yêu cầu role `CUSTOMER`.
- `src/main/resources/application.yaml`: cấu hình port, JWT resource server, CORS và route gateway.
- `src/test/java/com/driverapp/apigateway/ApigatewayApplicationTests.java`: test khởi tạo context mặc định.
- `target/`: thư mục build sinh ra bởi Maven, không phải source chính.

## Cách chạy

```powershell
.\mvnw.cmd spring-boot:run
```

Cần chạy `userservice` trước để gateway lấy được JWKS xác thực JWT.
