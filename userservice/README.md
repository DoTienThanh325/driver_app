# User Service

`userservice` phụ trách đăng ký, đăng nhập bằng mật khẩu + xác minh OTP, cấp access token/refresh token, logout, refresh token và trả về thông tin người dùng hiện tại. Service này đóng vai trò JWT Issuer / Identity Provider cho toàn bộ kiến trúc microservices thông qua endpoint JWKS.

## Cấu hình chính

- Port: `8081`.
- Database: PostgreSQL `driverapp_user_db`.
- Migration: Flyway duy nhất tại `src/main/resources/db/migration/V0__create_user_tables.sql`.
- Cơ chế gửi OTP: Mặc định sử dụng `LocalSmsSender` in mã OTP 6 chữ số trực tiếp ra console log, hỗ trợ phát triển và kiểm thử nội bộ không phụ thuộc SMS gateway bên thứ ba.
- JWT issuer: `http://localhost:8081`.
- Access token hết hạn sau: `15` phút.
- Refresh token hết hạn sau: `7` ngày.
- OTP challenge hết hạn sau: `5` phút.

## Hệ thống Vai trò (Roles)

Hệ thống hỗ trợ 4 vai trò chính:
- `CUSTOMER`: Người dùng thông thường (đặt xe, đặt món, khiếu nại, áp dụng voucher). Role mặc định khi đăng ký mới.
- `DRIVER`: Tài xế (nhận chuyến, cập nhật tiến độ chuyến đi, đăng ký STK nhận tiền).
- `ADMIN`: Quản trị viên hệ thống (phát hành voucher, quản lý người dùng, xử lý khiếu nại).
- `BUSINESS`: Đối tác nhà hàng, đối tác kinh doanh dịch vụ ăn uống.

## Endpoint hiện có

- `POST /api/auth/register`: đăng ký user mới với role mặc định `CUSTOMER`.
- `POST /api/auth/login`: kiểm tra số điện thoại + mật khẩu, tạo OTP challenge kèm mã `challengeToken`.
- `POST /api/auth/verify-otp`: xác minh mã OTP 6 số cùng `challengeToken` để nhận cặp Access Token và Refresh Token.
- `POST /api/auth/refresh`: đổi Refresh Token hợp lệ lấy cặp token mới.
- `POST /api/auth/logout`: thu hồi (revoke) Refresh Token.
- `GET /api/users/me`: lấy thông tin user hiện tại từ Access Token (`id`, `username`, `phoneNumber`, `roles`).
- `GET /.well-known/jwks.json`: public JWK Set (chứa RSA public key) cho API Gateway và các service khác xác thực tính hợp lệ của JWT.

## Cơ sở dữ liệu & Migration

Toàn bộ cấu trúc cơ sở dữ liệu và seed dữ liệu ban đầu được hợp nhất trong 1 file Flyway:
- `src/main/resources/db/migration/V0__create_user_tables.sql`:
  - Bảng `users`: `id UUID PRIMARY KEY`, `username`, `password`, `phone_number`, `status` (`ACTIVE`, `BANNED`), `created_at`, `updated_at`.
  - Bảng `roles`: `id UUID PRIMARY KEY`, `role_code` (`CUSTOMER`, `DRIVER`, `ADMIN`, `BUSINESS`).
  - Bảng `user_roles`: liên kết `user_id` và `role_id`.
  - Bảng `refresh_tokens`: `id`, `user_id`, `refresh_token` (hash SHA-256), `expired_at`, `revoked_at`, `created_at`.
  - Khởi tạo sẵn 4 roles mặc định: `CUSTOMER`, `DRIVER`, `ADMIN`, `BUSINESS`.
  - Khởi tạo 2 tài khoản quản trị viên mặc định: `admin1` (`0900000001`) và `admin2` (`0900000002`) với mật khẩu mặc định `admin123`.

## Giải thích file

- `pom.xml`: khai báo Spring WebMVC, Spring Data JPA, Security, OAuth2 Resource Server, Validation, PostgreSQL, Flyway, Lombok và test dependency.
- `src/main/java/com/driverapp/userservice/UserserviceApplication.java`: class main khởi động service.
- `config/JwtConfig.java`: tạo RSA key pair lúc runtime, cấu hình `JwtEncoder` và `JwtDecoder`.
- `config/JwtProperties.java`: bind cấu hình `app.jwt` gồm issuer, thời gian access token và refresh token.
- `config/OtpProperties.java`: bind cấu hình `app.otp` gồm thời gian OTP và secret ký HMAC challenge.
- `config/SecurityConfig.java`: cấu hình stateless security, password encoder BCrypt, public các endpoint auth/JWKS và yêu cầu JWT cho endpoint còn lại.
- `controller/AuthController.java`: REST controller cho đăng ký, đăng nhập, OTP, refresh, logout và `/api/users/me`.
- `controller/JwkController.java`: expose public key tại `/.well-known/jwks.json`.
- `dto/request/LoginRequest.java`: request đăng nhập bằng `phoneNumber` và `password`.
- `dto/request/RefreshRequest.java`: request refresh/logout gồm `refreshToken`.
- `dto/request/RegisterRequest.java`: request đăng ký tài khoản.
- `dto/request/VerifyOtpRequest.java`: request xác minh OTP challenge.
- `dto/response/LoginResponse.java`: response sau login gồm `challengeToken`, thời gian hết hạn và message.
- `dto/response/OtpChallengeResult.java`: kết quả nội bộ khi tạo OTP challenge.
- `dto/response/TokenResponse.java`: response token gồm access token, refresh token, token type và TTL.
- `dto/response/UserResponse.java`: response thông tin user gồm id, username, phone number và roles.
- `models/User.java`: entity bảng `users`.
- `models/Role.java`: entity bảng `roles`.
- `models/RoleCode.java`: enum `CUSTOMER`, `DRIVER`, `ADMIN`, `BUSINESS`.
- `models/UserStatus.java`: enum trạng thái user `ACTIVE`, `BANNED`.
- `models/RefreshToken.java`: entity bảng `refresh_tokens`.
- `repository/UserRepository.java`: JPA repository cho user.
- `repository/RoleRepository.java`: JPA repository tìm role theo `RoleCode`.
- `repository/RefreshTokenRepository.java`: JPA repository tìm refresh token với pessimistic lock.
- `service/AuthService.java`: interface nghiệp vụ auth.
- `service/JwtService.java`: interface cấp token và hash SHA-256.
- `service/OtpChallengeService.java`: interface tạo/xác minh OTP challenge.
- `service/SmsSender.java`: interface gửi OTP.
- `service/impl/AuthServiceImpl.java`: hiện thực luồng register, login, verify OTP, refresh, logout và current user.
- `service/impl/JwtServiceImpl.java`: tạo JWT access token, tạo refresh token ngẫu nhiên, lưu hash SHA-256.
- `service/impl/OtpChallengeServiceImpl.java`: tạo OTP 6 số, ký challenge bằng HMAC-SHA256 và xác minh challenge.
- `service/impl/LocalSmsSender.java`: gửi OTP local bằng cách in trực tiếp mã OTP ra log console.
- `src/main/resources/application.yaml`: cấu hình port, datasource, JPA, Flyway, JWT và OTP.
- `src/main/resources/db/migration/V0__create_user_tables.sql`: migration tạo bảng users, roles, user_roles, refresh_tokens và seed dữ liệu.

## Cách chạy

```bash
cd userservice
./mvnw spring-boot:run
```
