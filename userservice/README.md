# User Service

`userservice` phụ trách đăng ký, đăng nhập bằng mật khẩu + OTP, cấp access token/refresh token, logout, refresh token, quản lý thông tin người dùng và phân quyền role. Service này đóng vai trò issuer JWT cho toàn bộ hệ thống microservices.

## Cấu hình chính

- Port: `8081`.
- Database: PostgreSQL `driverapp_user_db`.
- Migration: Flyway trong `src/main/resources/db/migration`.
- JWT issuer: `http://localhost:8081`.
- Access token hết hạn sau `15` phút, refresh token hết hạn sau `7` ngày.
- OTP hết hạn sau `5` phút.

## Endpoint hiện có

### Public / Client Endpoints
- `POST /api/auth/register`: Đăng ký user mới với role mặc định `CUSTOMER`.
- `POST /api/auth/login`: Kiểm tra số điện thoại + mật khẩu, trả về `challengeToken` OTP.
- `POST /api/auth/verify-otp`: Xác minh `challengeToken` + mã OTP 6 số để cấp cặp token (`accessToken`, `refreshToken`).
- `POST /api/auth/refresh`: Đổi `refreshToken` lấy cặp token mới.
- `POST /api/auth/logout`: Revoke `refreshToken`.
- `GET /api/users/me`: Lấy thông tin user hiện tại từ JWT.
- `GET /.well-known/jwks.json`: Public JWK Set cho API Gateway và các microservice khác xác thực JWT.

### Internal Endpoints (Inter-service)
- `PUT /internal/users/{userId}/roles/{roleCode}`: Gán role cho user (dành cho `driverservice` gọi khi phê duyệt tài xế).
- `GET /internal/users/{userId}`: Lấy thông tin user theo ID.

## Cấu trúc thư mục & Giải thích file

- `pom.xml`: Khai báo dependencies Spring Web, Spring Data JPA, Security, OAuth2 Resource Server, Validation, PostgreSQL, Flyway, Lombok, Eureka Client...
- `src/main/java/com/driverapp/userservice/`:
  - `UserserviceApplication.java`: Class main khởi động service.
  - `config/JwtConfig.java`: Cấu hình RSA key pair, `JwtEncoder` và `JwtDecoder`.
  - `config/JwtProperties.java`: Bind cấu hình `app.jwt` (issuer, expiration).
  - `config/OtpProperties.java`: Bind cấu hình `app.otp` (TTL, secret).
  - `config/SecurityConfig.java`: Cấu hình stateless security, BCrypt encoder, permitAll các auth/JWKS/internal endpoints.
  - `controller/AuthController.java`: REST controller đăng ký, đăng nhập, verify OTP, refresh token, logout và me.
  - `controller/InternalUserController.java`: REST controller cho các giao tiếp nội bộ inter-service.
  - `controller/JwkController.java`: Expose public key tại `/.well-known/jwks.json`.
  - `dto/request/`:
    - `LoginRequest.java`: DTO đăng nhập bằng `phoneNumber` và `password`.
    - `OtpVerifyRequest.java`: DTO xác minh OTP bằng `challengeToken` và `otpCode`.
    - `RefreshTokenRequest.java`: DTO refresh token / logout bằng `refreshToken`.
    - `RegisterRequest.java`: DTO đăng ký user mới (`username`, `password`, `phoneNumber`).
  - `dto/response/`:
    - `LoginChallengeResponse.java`: Response sau login chứa `challengeToken`.
    - `OtpChallengeResult.java`: Kết quả tạo challenge OTP nội bộ.
    - `TokenResponse.java`: Response cấp `accessToken` và `refreshToken`.
    - `UserResponse.java`: Response thông tin user (`id`, `username`, `phoneNumber`, `roles`).
  - `models/`:
    - `User.java`: Entity `users`.
    - `Role.java`: Entity `roles`.
    - `RefreshToken.java`: Entity `refresh_tokens`.
    - `enums/RoleCode.java`: Enum `CUSTOMER`, `DRIVER`, `ADMIN`.
    - `enums/UserStatus.java`: Enum `ACTIVE`, `BANNED`.
  - `repository/`:
    - `UserRepository.java`: Repository tìm user theo phone/username.
    - `RoleRepository.java`: Repository tìm role theo `RoleCode`.
    - `RefreshTokenRepository.java`: Repository quản lý refresh token với pessimistic lock.
  - `service/`:
    - `AuthService.java` & `impl/AuthServiceImpl.java`: Nghiệp vụ đăng ký, login, verify OTP, refresh, logout.
    - `UserService.java` & `impl/UserServiceImpl.java`: Nghiệp vụ quản lý user và gán role.
    - `JwtService.java` & `impl/JwtServiceImpl.java`: Tạo/xác thực JWT và hash refresh token.
    - `OtpChallengeService.java` & `impl/OtpChallengeServiceImpl.java`: Tạo và ký HMAC OTP challenge.
    - `SmsSender.java` & `impl/LocalSmsSender.java`: Mock gửi tin nhắn OTP ra log console.
- `src/main/resources/`:
  - `application.yaml`: Cấu hình port 8081, PostgreSQL, JPA, Flyway, JWT, OTP và Eureka.
  - `db/migration/`: Các file SQL Flyway tạo bảng và seed roles.

## Cách chạy

```powershell
.\mvnw.cmd spring-boot:run
```

