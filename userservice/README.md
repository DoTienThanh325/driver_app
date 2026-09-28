# User Service

`userservice` phụ trách đăng ký, đăng nhập bằng mật khẩu + OTP, cấp access token/refresh token, logout, refresh token và trả về thông tin người dùng hiện tại. Service này đóng vai trò issuer JWT cho toàn bộ backend.

## Cấu hình chính

- Port: `8081`.
- Database: PostgreSQL `driverapp_user_db`.
- Migration: Flyway trong `src/main/resources/db/migration`.
- JWT issuer: `http://localhost:8081`.
- Access token hết hạn sau `15` phút, refresh token hết hạn sau `7` ngày.
- OTP hết hạn sau `5` phút.

## Endpoint hiện có

- `POST /api/auth/register`: đăng ký user mới với role mặc định `CUSTOMER`.
- `POST /api/auth/login`: kiểm tra số điện thoại + mật khẩu, tạo OTP challenge.
- `POST /api/auth/verify-otp`: xác minh OTP và cấp token.
- `POST /api/auth/refresh`: đổi refresh token lấy cặp token mới.
- `POST /api/auth/logout`: revoke refresh token.
- `GET /api/users/me`: lấy thông tin user hiện tại từ JWT.
- `GET /.well-known/jwks.json`: public JWK Set cho gateway/service khác xác thực JWT.

## Giải thích file

- `pom.xml`: khai báo Spring WebMVC, Spring Data JPA, Security, OAuth2 Resource Server, Validation, PostgreSQL, Flyway, Lombok và test dependency.
- `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`: Maven Wrapper.
- `.gitignore`, `.gitattributes`: cấu hình Git.
- `HELP.md`: file hướng dẫn mặc định của Spring Initializr.
- `src/main/java/com/driverapp/userservice/UserserviceApplication.java`: class main khởi động service.
- `config/JwtConfig.java`: tạo RSA key pair lúc runtime, cấu hình `JwtEncoder` và `JwtDecoder`.
- `config/JwtProperties.java`: bind cấu hình `app.jwt` gồm issuer, thời gian access token và refresh token.
- `config/OtpProperties.java`: bind cấu hình `app.otp` gồm thời gian OTP và secret ký challenge.
- `config/SecurityConfig.java`: cấu hình stateless security, password encoder BCrypt, public các endpoint auth/JWKS và yêu cầu JWT cho endpoint còn lại.
- `controller/AuthController.java`: REST controller cho đăng ký, đăng nhập, OTP, refresh, logout và `/api/users/me`.
- `controller/JwkController.java`: expose public key tại `/.well-known/jwks.json`.
- `dto/LoginRequest.java`: request đăng nhập bằng `phoneNumber` và `password`.
- `dto/LoginResponse.java`: response sau login gồm `challengeToken`, thời gian hết hạn và message.
- `dto/OtpChallengeResult.java`: kết quả nội bộ khi tạo OTP challenge, gồm token, OTP và TTL.
- `dto/RefreshRequest.java`: request refresh/logout gồm `refreshToken`.
- `dto/RegisterRequest.java`: request đăng ký, validate username, password tối thiểu 8 ký tự và số điện thoại.
- `dto/TokenResponse.java`: response token gồm access token, refresh token, token type và TTL.
- `dto/UserResponse.java`: response thông tin user gồm id, username, phone number và roles.
- `dto/VerifyOtpRequest.java`: request xác minh OTP 6 chữ số.
- `models/User.java`: entity bảng `users`, lưu username, password hash, phone, status, roles và timestamp.
- `models/Role.java`: entity bảng `roles`, lưu role code.
- `models/RoleCode.java`: enum `CUSTOMER`, `DRIVER`, `ADMIN`.
- `models/UserStatus.java`: enum trạng thái user `ACTIVE`, `BANNED`.
- `models/RefreshToken.java`: entity bảng `refresh_tokens`, lưu hash refresh token, hạn dùng và thời điểm revoke.
- `repository/UserRepository.java`: JPA repository cho user, tìm theo phone và kiểm tra trùng username/phone.
- `repository/RoleRepository.java`: JPA repository tìm role theo `RoleCode`.
- `repository/RefreshTokenRepository.java`: JPA repository tìm refresh token theo hash với pessimistic lock.
- `service/AuthService.java`: interface nghiệp vụ auth.
- `service/JwtService.java`: interface cấp token và hash SHA-256.
- `service/OtpChallengeService.java`: interface tạo/xác minh OTP challenge.
- `service/SmsSender.java`: interface gửi OTP.
- `service/impl/AuthServiceImpl.java`: hiện thực luồng register, login, verify OTP, refresh, logout và current user.
- `service/impl/JwtServiceImpl.java`: tạo JWT access token, tạo refresh token random, lưu hash refresh token.
- `service/impl/OtpChallengeServiceImpl.java`: tạo OTP 6 số, ký challenge bằng HMAC-SHA256 và xác minh challenge.
- `service/impl/LocalSmsSender.java`: sender local, ghi OTP ra log thay vì gửi SMS thật.
- `src/main/resources/application.yaml`: cấu hình port, datasource, JPA, Flyway, JWT và OTP.
- `src/main/resources/db/migration/V0__create_user_tables.sql`: tạo bảng users, roles, user_roles, refresh_tokens.
- `src/main/resources/db/migration/V1__insert_roles_table.sql`: seed 3 role mặc định.
- `src/test/java/com/driverapp/userservice/UserserviceApplicationTests.java`: test khởi tạo context mặc định.
- `target/`: thư mục build sinh ra bởi Maven.

## Cách chạy

```powershell
.\mvnw.cmd spring-boot:run
```
