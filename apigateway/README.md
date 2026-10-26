# API Gateway

`apigateway` là cửa ngõ tập trung duy nhất (**Single Entry Point / Reverse Proxy**) của toàn bộ kiến trúc microservices. Dịch vụ này sử dụng **Spring Cloud Gateway WebFlux** để cân bằng tải và định tuyến các request từ client đến từng microservice thông qua Service Registry (**Eureka Server**), kiểm soát CORS, giải mã và xác thực chữ ký số JWT từ `userservice`, đồng thời thực thi kiểm tra phân quyền theo vai trò (**RBAC**) ở tầng Gateway.

---

## Cấu hình Chính

- **Port**: `8080`.
- **Service Registry**: Đăng ký và phân giải tên dịch vụ qua Eureka Server (`http://localhost:8761/eureka/`).
- **Xác thực JWT**: Lấy public key từ `userservice` qua endpoint `http://localhost:8081/.well-known/jwks.json`.
- **Chuyển đổi Role**: Tự động chuyển đổi claim `roles` từ JWT thành các Granted Authorities dạng `ROLE_<ROLE_NAME>`.

---

## Bảng Ánh Xạ Tuyến Đường (Routing Rules)

| Tuyến đường (Path Pattern) | Service Đích | Mục đích nghiệp vụ |
| :--- | :--- | :--- |
| `/api/auth/**`, `/api/users/**`, `/.well-known/jwks.json` | `lb://userservice` | Đăng ký, đăng nhập OTP, token, thông tin user, JWKS |
| `/api/drivers/**`, `/api/vehicles/**` | `lb://driverservice` | Hồ sơ tài xế, thẩm định hồ sơ, phương tiện, availability |
| `/api/trips/**`, `/api/bookings/**`, `/api/businesses/**`, `/api/business-documents/**` | `lb://bookingservice` | Đặt chuyến, nhận cuốc, nhà hàng, món ăn, đăng ký kinh doanh |
| `/api/payments/**`, `/api/vouchers/**` | `lb://paymentservice` | Thanh toán VietQR Napas, đổi trả trước, STK tài xế, voucher |
| `/api/notifications/**` | `lb://notificationservice` | Tạo thông báo và truy vấn thông báo |
| `/api/feedback/**`, `/api/feedbacks/**`, `/api/complaints/**` | `lb://feedbackservice` | Đánh giá sao tài xế và khiếu nại sự cố chuyến đi |

---

## Quy Tắc Phân Quyền (RBAC Security Rules)

Cấu hình trong `SecurityConfig.java`:

| Phương thức | Endpoint Pattern | Quyền truy cập yêu cầu | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `OPTIONS` | `/**` | `permitAll()` | Cho phép Preflight CORS |
| `POST` | `/api/auth/register`, `/api/auth/login`, `/api/auth/verify-otp`, `/api/auth/refresh`, `/api/auth/logout` | `permitAll()` | Luồng đăng ký, đăng nhập bảo mật |
| `GET` / `POST` | `/api/drivers/test`, `/api/drivers/register` | `ROLE_CUSTOMER` | Đăng ký trở thành tài xế |
| `PATCH` | `/api/drivers/registration` | `ROLE_CUSTOMER` | Bổ sung lại giấy tờ tài xế bị từ chối |
| `*` | `/api/bookings/foods`, `/api/bookings/restaurants/**` | `ROLE_BUSINESS` | Quản lý quán ăn và thực đơn món ăn |
| `PATCH` | `/api/trips/status` | `ROLE_DRIVER` | Tài xế cập nhật tiến trình cuốc xe |
| `PATCH` | `/api/trips/*/cancel` | `ROLE_CUSTOMER` | Khách hàng hủy cuốc xe |
| `*` | `/api/trips` | `ROLE_CUSTOMER`, `ROLE_DRIVER` | Đặt cuốc hoặc nhận cuốc xe |
| `POST` | `/api/businesses/registration` | `ROLE_CUSTOMER` | Đăng ký mở quán ăn / nhà hàng |
| `*` | `/api/businesses/*/review` | `ROLE_ADMIN` | Quản trị viên duyệt hồ sơ nhà hàng |
| `*` | `/api/drivers/*/verification-status`, `/api/drivers/candidates` | `ROLE_ADMIN` | Quản trị viên duyệt hồ sơ tài xế |
| `GET` | `/api/drivers/{driverId}` | `ROLE_ADMIN`, `ROLE_DRIVER`, `ROLE_CUSTOMER` | Xem thông tin chi tiết tài xế |
| `POST` | `/api/vouchers/claim` | `ROLE_CUSTOMER` | Khách hàng lưu voucher vào ví |
| `POST` | `/api/vouchers`, `/api/vouchers/**` | `ROLE_ADMIN`, `ROLE_BUSINESS` | Phát hành voucher mới |
| `GET` | `/api/vouchers/app` | `ROLE_CUSTOMER` | Xem danh sách voucher hệ thống |
| `GET` | `/api/vouchers/restaurants/*` | `ROLE_CUSTOMER`, `ROLE_BUSINESS` | Xem voucher của nhà hàng |
| `POST` | `/api/payments/trip` | `ROLE_CUSTOMER` | Khách hàng tạo thanh toán chuyến đi |
| `PATCH` | `/api/payments/trip/*/confirm` | `ROLE_DRIVER` | Tài xế xác nhận đã nhận tiền thanh toán |
| `POST` / `PUT` | `/api/payments/driver-payment-info` | `ROLE_DRIVER` | Tài xế đăng ký / cập nhật STK nhận tiền |
| `POST` | `/api/feedbacks`, `/api/feedbacks/**` | `ROLE_CUSTOMER` | Đánh giá sao tài xế |
| `POST` | `/api/complaints`, `/api/complaints/**` | `ROLE_CUSTOMER`, `ROLE_DRIVER` | Gửi báo cáo khiếu nại chuyến đi |
| `*` | `/api/bookings/foods/search/**` | `ROLE_CUSTOMER`, `ROLE_BUSINESS` | Tìm kiếm món ăn Elasticsearch |
| Mọi request khác | `/**` | `authenticated()` | Yêu cầu JWT token hợp lệ |

---

## Hướng Dẫn Kết Nối từ Thiết Bị Di Động (Mobile App)

Khi kết nối ứng dụng điện thoại (Android / iOS) tới API Gateway:
1. **Tuyệt đối không dùng `localhost:8080`**: Trên điện thoại, `localhost` trỏ về chính thiết bị đó.
   - **Máy thật**: Phải dùng địa chỉ IP LAN của máy tính chạy backend (ví dụ: `http://192.168.x.x:8080`).
   - **Android Emulator**: Dùng `http://10.0.2.2:8080`.
2. **Cho phép Cleartext HTTP**: Trên Android, thêm `android:usesCleartextTraffic="true"` vào `AndroidManifest.xml` nếu gọi qua giao thức HTTP thường.
3. **Mở Tường Lửa (Firewall)**: Nếu điện thoại không kết nối được, chạy lệnh trên máy host:
   ```bash
   sudo ufw allow 8080/tcp
   ```

---

## Hướng Dẫn Chạy

```bash
cd apigateway
./mvnw spring-boot:run
```
*(Cần khởi động `eureka` và `userservice` trước để Gateway đăng ký và tải bộ khóa JWKS thành công)*.
