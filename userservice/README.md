# User Service

`userservice` là dịch vụ định danh và xác thực trung tâm (**Identity Provider / Auth Service**) của toàn bộ kiến trúc microservices. Dịch vụ này phụ trách đăng ký, đăng nhập bảo mật hai lớp (Mật khẩu + Xác thực OTP), cấp phát cặp Access Token / Refresh Token, quản lý quyền hạn (RBAC), và phân phối khóa công khai RSA thông qua chuẩn **JWKS Endpoint** (`/.well-known/jwks.json`).

---

## Cấu hình Chính

- **Port**: `8081`.
- **Database**: PostgreSQL `driverapp_user_db`.
- **Message Broker**: RabbitMQ `localhost:5672` (Topic Exchange).
- **JWT Issuer**: `http://localhost:8081`.
- **Thời hạn Access Token**: `15` phút (chuẩn JWT Nimbus JOSE, thuật toán ký RSA RS256).
- **Thời hạn Refresh Token**: `7` ngày (lưu mã hash SHA-256 trong database với pessimistic lock).
- **Thời hạn OTP Challenge**: `5` phút (mã hóa HMAC-SHA256).
- **Cơ chế OTP Development**: `LocalSmsSender` in mã OTP 6 số trực tiếp ra console log, hỗ trợ phát triển và chạy thử ngay mà không tốn phí SMS gateway.

---

## Hệ thống Vai trò (Roles & RBAC)

Hệ thống hỗ trợ 4 vai trò độc lập:
1. `CUSTOMER`: Vai trò mặc định của tất cả người dùng đăng ký mới (đặt chuyến xe, đặt đồ ăn, nhận voucher, khiếu nại).
2. `DRIVER`: Tài xế công nghệ (nhận cuốc xe, cập nhật trạng thái chuyến đi, cấu hình STK nhận tiền).
3. `BUSINESS`: Đối tác nhà hàng / quán ăn (quản lý thực đơn, chỉnh sửa thông tin quán).
4. `ADMIN`: Quản trị viên hệ thống (phê duyệt hồ sơ tài xế, duyệt đăng ký nhà hàng, phát hành voucher).

---

## Danh Sách Endpoint Hiện Có

### 1. Luồng Xác Thực & Quản Lý Phiên (`/api/auth`)

- **`POST /api/auth/register`**: Đăng ký tài khoản mới bằng số điện thoại, mật khẩu và họ tên (mặc định gán role `CUSTOMER`).
- **`POST /api/auth/login`**: Xác thực số điện thoại và mật khẩu. Nếu chính xác, hệ thống sinh mã OTP 6 số và trả về `challengeToken`.
- **`POST /api/auth/verify-otp`**: Xác thực mã OTP cùng với `challengeToken`. Khi thành công, cấp cặp `accessToken` (JWT) và `refreshToken`.
- **`POST /api/auth/resend-otp`**: Gửi lại mã OTP mới khi mã cũ hết hạn.
- **`POST /api/auth/refresh`**: Đổi `refreshToken` hợp lệ lấy cặp Access/Refresh token mới.
- **`POST /api/auth/logout`**: Thu hồi (revoke) `refreshToken` hiện tại để đăng xuất an toàn.

### 2. Thông Tin Người Dùng & Phân Quyền (`/api/users`)

- **`GET /api/users/me`**: Lấy thông tin tài khoản đang đăng nhập từ `JWT.sub` (ID, Username, Số điện thoại, Danh sách Roles).
- **`GET /api/users/{userId}`**: Tra cứu thông tin người dùng theo `userId`.
- **`POST /api/users/{userId}/roles`**: Cấp thêm quyền vai trò cho người dùng (ví dụ cấp thêm role `DRIVER` hoặc `BUSINESS`).
- **`DELETE /api/users/{userId}/roles/{roleCode}`**: Thu hồi một vai trò của người dùng.

### 3. Phân Phối Khóa Công Khai (JWKS Endpoint)

- **`GET /.well-known/jwks.json`**: Endpoint công khai không yêu cầu token, trả về JSON Web Key Set chứa RSA Public Key của hệ thống. API Gateway và các Resource Server dựa vào endpoint này để giải mã và xác minh tính toàn vẹn của mọi JWT token.

---

## Xử Lý Sự Kiện Bất Đồng Bộ (RabbitMQ Listeners)

1. **`DriverRoleGrantListener`**:
   - Lắng nghe sự kiện `driver.approved` từ `driverservice` khi Admin duyệt hồ sơ tài xế.
   - Tự động gán thêm role `DRIVER` cho tài khoản người dùng tương ứng mà không cần thao tác thủ công.
2. **`BusinessRoleGrantListener`**:
   - Lắng nghe sự kiện `business.approved` từ `bookingservice` khi Admin duyệt đơn đăng ký nhà hàng.
   - Tự động gán thêm role `BUSINESS` cho chủ quán ăn.
3. **`SmsOtpListener`**: Tiếp nhận sự kiện yêu cầu gửi tin nhắn OTP qua hàng đợi bất đồng bộ.
4. **Đảm bảo Idempotency**: Bảng `processed_events` lưu lịch sử các event đã tiêu thụ để ngăn chặn việc xử lý lặp khi có message retry từ RabbitMQ.

---

## Cơ Sở Dữ Liệu & Flyway Migration

Database PostgreSQL: `driverapp_user_db`

1. `V0__create_user_tables.sql`:
   - Bảng `users`: `id UUID PRIMARY KEY`, `username`, `password`, `phone_number`, `status` (`ACTIVE`, `BANNED`), `created_at`, `updated_at`.
   - Bảng `roles`: `id UUID PRIMARY KEY`, `role_code` (`CUSTOMER`, `DRIVER`, `ADMIN`, `BUSINESS`).
   - Bảng `user_roles`: Khóa ngoại liên kết `user_id` và `role_id`.
   - Bảng `refresh_tokens`: Lưu vết phiên refresh token có hash SHA-256.
   - Khởi tạo sẵn 4 roles và 2 tài khoản quản trị mặc định: `admin1` (`0900000001`) và `admin2` (`0900000002`) với mật khẩu `admin123`.
2. `V1__create_processed_events.sql`:
   - Bảng `processed_events`: Lưu `event_id`, `event_type`, `consumer_name`, `processed_at` phục vụ kiểm tra chống trùng lặp sự kiện.

---

## Hướng Dẫn Chạy

```bash
cd userservice
./mvnw spring-boot:run
```
*(Cần PostgreSQL và RabbitMQ đang hoạt động trước khi chạy service)*.
