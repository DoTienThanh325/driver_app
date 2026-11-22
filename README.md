# Technology Driver App Backend

Hệ thống backend của ứng dụng gọi xe, giao hàng và đặt món công nghệ (**Transit & Meal / Technology Driver App**) được xây dựng theo kiến trúc **Microservices** hiện đại, hướng sự kiện (**Event-Driven**) kết hợp mô hình điều phối giao dịch phân tán **SAGA Choreography**.

Mỗi service là một ứng dụng độc lập sử dụng **Java 21**, **Spring Boot 4.1.1**, **Spring Cloud 2025.1.3**, sở hữu cơ sở dữ liệu riêng biệt (**Database-per-Service**). Toàn bộ hệ thống đăng ký và phát hiện dịch vụ qua **Netflix Eureka Server**, client kết nối qua một cổng vào duy nhất là **Spring Cloud Gateway (API Gateway)** để giải mã JWT, kiểm tra phân quyền (RBAC) và cân bằng tải định tuyến.

---

## Kiến trúc Hệ thống Tổng thể

```text
                  +-----------------------------------+
                  |  Client (Mobile App / Web Client) |
                  +-----------------+-----------------+
                                    |
                                    v
                  +-----------------------------------+
                  |      API Gateway (Port 8080)      |  <--- CORS, Rate Limit, Giải mã JWT & RBAC
                  +-----------------+-----------------+
                                    | (LoadBalancer lb://)
          +-------------------------+-------------------------+-------------------------+
          |                         |                         |                         |
          v                         v                         v                         v
+-------------------+     +-------------------+     +-------------------+     +-------------------+
|   User Service    |     |  Driver Service   |     |  Booking Service  |     |  Payment Service  |
|    (Port 8081)    |     |    (Port 8082)    |     |    (Port 8083)    |     |    (Port 8084)    |
|    PostgreSQL     |     |PostgreSQL + MinIO |     | MongoDB + ES 9.0  |     |      MongoDB      |
+-------------------+     +-------------------+     +-------------------+     +-------------------+
          |                         |                         |                         |
          +-------------------------+-------------------------+-------------------------+
          |                                                   |
          v                                                   v
+-------------------+                               +-------------------+
| Feedback Service  |                               | Notification Svc  |
|    (Port 8085)    |                               |    (Port 8086)    |
|    PostgreSQL     |                               |    PostgreSQL     |
+-------------------+                               +-------------------+

   ══════════════════════════════════════════════════════════════════════════════════════
   Hạ tầng phụ trợ:
   - Service Discovery: Netflix Eureka Server (Port 8761)
   - Message Broker: RabbitMQ 3.13 (AMQP Port 5672, Management Port 15672)
   - Object Storage: MinIO S3 API (Port 9000, Web Console Port 9001)
   - Full-text Search Engine: Elasticsearch 9.0.0 (Port 9200)
   - In-memory Cache / Key-Value: Redis (Port 6379)
   ══════════════════════════════════════════════════════════════════════════════════════
```

---

## Các Nguyên lý & Thiết kế Then chốt

1. **Đồng nhất mã định danh tài xế (`driverId` = `userId`)**:
   - `driverId` trong toàn bộ hệ thống (`driverservice`, `bookingservice`, `paymentservice`, `feedbackservice`) chính là `userId` của tài xế (lấy trực tiếp từ claim `sub` của JWT Token).
   - Bảng `drivers` sử dụng `user_id UUID PRIMARY KEY`.
   - Loại bỏ hoàn toàn các lời gọi API phụ giữa các microservices để ánh xạ qua lại giữa `userId` và `driverId`, giúp tối đa hóa hiệu năng và đơn giản hóa kiến trúc.

2. **Cơ sở dữ liệu độc lập & Flyway Migration**:
   - Mỗi service quản lý cơ sở dữ liệu riêng:
     - **PostgreSQL**: `userservice`, `driverservice`, `feedbackservice`, `notificationservice`.
     - **MongoDB**: `bookingservice`, `paymentservice`.
   - Các service SQL áp dụng **Flyway Migration** để version hóa cấu trúc bảng, khởi tạo schema và seed dữ liệu mẫu an toàn.

3. **Bảo mật & Cấp quyền tập trung (JWKS & RBAC)**:
   - `userservice` đóng vai trò Identity Provider / JWT Issuer, phát hành cặp khóa RSA và expose public key tại endpoint chuẩn `/.well-known/jwks.json`.
   - `apigateway` xác thực chữ ký token qua JWKS, chuyển claim `roles` thành `ROLE_<ROLE_NAME>` và thực hiện phân quyền cấp Gateway trước khi forward request.
   - Hỗ trợ 4 vai trò chính:
     - `CUSTOMER`: Khách hàng (đặt xe, đặt món ăn, hủy cuốc, đánh giá, khiếu nại, nhận voucher, đăng ký kinh doanh/tài xế).
     - `DRIVER`: Tài xế (nhận chuyến, cập nhật trạng thái cuốc xe, xác nhận nhận tiền, cấu hình STK).
     - `BUSINESS`: Đối tác nhà hàng (quản lý thực đơn, cập nhật thông tin quán ăn).
     - `ADMIN`: Quản trị viên (duyệt hồ sơ tài xế, duyệt hồ sơ kinh doanh nhà hàng, phát hành voucher).

4. **Kiến trúc Bất đồng bộ & SAGA Choreography qua RabbitMQ**:
   - Sử dụng **RabbitMQ Topic Exchange** (`trip.topic.exchange`, `saga.compensation.exchange`, ...).
   - **Giao dịch bù trừ (Compensating Transactions)**: Nếu bước tiếp theo trong chuỗi nghiệp vụ thất bại (ví dụ: tạo thanh toán chuyến đi không thành công hoặc gán quyền role thất bại), các event bù trừ sẽ được gửi đi để rollback trạng thái:
     - Khởi tạo thanh toán lỗi $\rightarrow$ `bookingservice` tự động hard-delete cuốc xe và thông báo cho khách đặt lại.
     - Cấp quyền tài xế / nhà hàng thất bại $\rightarrow$ rollback trạng thái hồ sơ về `PENDING` hoặc ghi nhận log vào bảng `saga_compensation_log`.
   - **Chống trùng lặp (Idempotent Consumer)**: Các service lưu `event_id` vào bảng `processed_events` để đảm bảo mỗi sự kiện chỉ được xử lý đúng một lần duy nhất (Exactly-once semantic).

5. **Tìm kiếm Món ăn Hiệu năng cao với Elasticsearch 9.0.0**:
   - `bookingservice` tích hợp Elasticsearch lưu trữ chỉ mục `foods`.
   - Hỗ trợ tìm kiếm tiếng Việt không dấu/có dấu (Edge NGram / Fuzzy Match), gợi ý từ khóa tự động (**Autocomplete Suggest**).
   - Sắp xếp kết quả kết hợp theo **tọa độ khoảng cách địa lý (`geo_distance`)** từ vị trí hiện tại của người dùng đến nhà hàng.
   - Cơ chế tự động đồng bộ dữ liệu MongoDB $\rightarrow$ Elasticsearch khi khởi động (`FoodDataSyncRunner`) và endpoint quản trị `/sync-all`.

6. **Lưu trữ Giấy tờ & Hình ảnh với MinIO (S3 Compatible)**:
   - Hồ sơ tài xế (CCCD, GPLX xe máy/ô tô, cavet xe, biển số) và hồ sơ giấy phép kinh doanh nhà hàng được lưu trữ dạng Object trên MinIO.
   - **Đa định dạng & Kiểm tra Magic Bytes**: Hỗ trợ JPG, PNG, WEBP, HEIC, HEIF, PDF, GIF, BMP. Xác thực tệp tin an toàn từ header bytes (`magic bytes`), chống giả mạo định dạng file.
   - **Hỗ trợ tệp dung lượng lớn**: Hỗ trợ upload tệp lên đến 15MB/file và 50MB/request; API Gateway cấu hình bộ nhớ đệm `max-in-memory-size: 50MB` phục vụ upload tài liệu chất lượng cao, file PDF nhiều trang.
   - **Tách biệt bằng lái & Trạng thái xe độc lập**:
     - Phân định rõ bằng lái xe máy (`DRIVER_LICENSE_MOTORBIKE`) và ô tô (`DRIVER_LICENSE_CAR`), cho phép tài xế sở hữu và quản lý đồng thời cả hai loại bằng.
     - Bảng `driver_vehicles` có trạng thái duyệt độc lập (`PENDING`, `APPROVED`, `REJECTED`) cho từng phương tiện.
   - Chỉ lưu URI `s3://...` vào cơ sở dữ liệu. Khi truy xuất qua API, hệ thống sinh **Pre-signed URL** an toàn có thời hạn để client xem trực tiếp.
   - Tự động dọn dẹp file rác trên MinIO nếu transaction database thất bại.

7. **Quy trình Thanh toán Tự động & Chuyển đổi Linh hoạt**:
   - **Khởi tạo tự động**: Khi khách tạo cuốc xe, hệ thống tự động sinh bản ghi thanh toán mặc định `PAY_DIRECTLY` (tiền mặt / thanh toán trực tiếp).
   - **Chuyển đổi sang `PAY_BEFORE`**: Sau khi tài xế nhận chuyến, khách hàng có thể chuyển sang trả trước. Hệ thống tự động lấy STK ngân hàng của tài xế và sinh mã ảnh **VietQR Napas 24/7** có hiệu lực trong 15 phút.

---

## Danh mục Dịch vụ & Cổng Mặc định

| Dịch vụ | Port | Công nghệ & DB | Vai trò chính |
| :--- | :---: | :--- | :--- |
| **eureka** | `8761` | Spring Cloud Netflix Eureka | Service Discovery & Registry Server |
| **apigateway** | `8080` | Spring Cloud Gateway WebFlux | Reverse proxy, cân bằng tải, CORS, giải mã JWT và RBAC |
| **userservice** | `8081` | Spring Boot, PostgreSQL (`driverapp_user_db`) | Quản lý tài khoản, mật khẩu, xác thực OTP, cấp JWT, JWKS public key |
| **driverservice** | `8082` | Spring Boot, PostgreSQL (`driverapp_driver_db`), Redis, MinIO | Đăng ký tài xế, duyệt hồ sơ, phương tiện, availability, rating trung bình |
| **bookingservice** | `8083` | Spring Boot, MongoDB (`driverapp_booking_db`), Elasticsearch 9.0 | Đặt chuyến xe, nhận chuyến, nhà hàng, món ăn, tìm kiếm Food ES, SAGA |
| **paymentservice** | `8084` | Spring Boot, MongoDB (`driverapp_payment_db`), RabbitMQ | Tự động tạo thanh toán `PAY_DIRECTLY`, VietQR `PAY_BEFORE`, STK tài xế, voucher |
| **feedbackservice** | `8085` | Spring Boot, PostgreSQL (`driverapp_feedback_db`) | Đánh giá sao tài xế, tạo khiếu nại báo cáo vi phạm chuyến đi |
| **aimatchingservice** | `8087` | Python, FastAPI, LightGBM | Xếp hạng tài xế và gợi ý món ăn |
| **notificationservice** | `8086` | Spring Boot, PostgreSQL (`driverapp_notification_db`), RabbitMQ | Nhận event và lưu trữ thông báo cho người dùng (hết hạn sau 15p) |

---

## Bảng Định tuyến & Phân quyền qua API Gateway (`:8080`)

| Route Pattern | Service Đích | Phương thức & Quyền Yêu Cầu | Chức năng nghiệp vụ |
| :--- | :--- | :--- | :--- |
| `/api/auth/register`, `/api/auth/login`, `/api/auth/verify-otp`, `/api/auth/refresh`, `/api/auth/logout`, `/api/auth/resend-otp` | `lb://userservice` | `POST` (Public `permitAll()`) | Đăng ký, đăng nhập OTP, refresh, logout |
| `/.well-known/jwks.json` | `lb://userservice` | `GET` (Public `permitAll()`) | Expose JWK Set chứa RSA public key |
| `/api/users/me` | `lb://userservice` | `GET` (Authenticated) | Xem thông tin tài khoản hiện tại |
| `/api/users/{userId}` | `lb://userservice` | `GET` (Authenticated) | Tra cứu thông tin người dùng theo ID |
| `/api/drivers/register`, `/api/drivers/test` | `lb://driverservice` | `POST`/`GET` (`ROLE_CUSTOMER`) | Khách hàng đăng ký trở thành tài xế (CCCD, bằng lái xe máy/ô tô, cavet, biển số) |
| `/api/drivers/registration` | `lb://driverservice` | `PATCH` (`ROLE_CUSTOMER`, `ROLE_DRIVER`) | Cập nhật lại giấy tờ khi hồ sơ bị từ chối hoặc bổ sung bằng lái |
| `/api/drivers/candidates` | `lb://driverservice` | `GET` (`ROLE_ADMIN`) | Lấy danh sách hồ sơ tài xế chờ xét duyệt |
| `/api/drivers/{driverId}` | `lb://driverservice` | `GET` (`ADMIN`, `DRIVER`, `CUSTOMER`) | Xem chi tiết hồ sơ tài xế kèm link ảnh giấy tờ và các loại bằng lái |
| `/api/drivers/{driverId}/verification-status` | `lb://driverservice` | `PATCH` (`ROLE_ADMIN`) | Admin phê duyệt hoặc từ chối hồ sơ tài xế |
| `/api/vehicles`, `/api/vehicles/**` | `lb://driverservice` | `POST` (`ROLE_CUSTOMER`, `ROLE_DRIVER`) | Đăng ký thêm phương tiện mới (kèm giấy tờ xe và bằng lái tương ứng) |
| `/api/trips` | `lb://bookingservice` | `POST` (`ROLE_CUSTOMER`) | Đặt chuyến xe mới |
| `/api/trips/{tripId}/accept` | `lb://bookingservice` | `POST` (`ROLE_DRIVER`) | Tài xế nhận cuốc xe |
| `/api/trips/driver/current` | `lb://bookingservice` | `GET` (`DRIVER`) | Xem chuyến hiện tại và chuyến tiếp theo đã nhận |
| `/api/trips/{tripId}/counterparty` | `lb://bookingservice` | `GET` (`CUSTOMER`, `DRIVER`) | Xem thông tin liên hệ của bên còn lại trong chuyến |
| `/api/trips/status` | `lb://bookingservice` | `PATCH` (`ROLE_DRIVER`) | Tài xế cập nhật trạng thái tiến trình chuyến đi |
| `/api/trips/{tripId}/cancel` | `lb://bookingservice` | `PATCH` (`ROLE_CUSTOMER`) | Khách hàng hủy chuyến khi chưa có tài xế |
| `/api/businesses/registration` | `lb://bookingservice` | `POST` (`ROLE_CUSTOMER`) | Đăng ký kinh doanh quán ăn/nhà hàng |
| `/api/businesses/me` | `lb://bookingservice` | `GET` (Authenticated) | Xem thông tin quán ăn của tài khoản |
| `/api/businesses/{id}/status` | `lb://bookingservice` | `PATCH` (`ROLE_ADMIN`) | Admin duyệt hồ sơ kinh doanh nhà hàng |
| `/api/bookings/foods/**` | `lb://bookingservice` | `POST`, `PATCH`, `DELETE` (`ROLE_BUSINESS`) | Quản lý món ăn thực đơn |
| `/api/bookings/restaurants/**` | `lb://bookingservice` | `PATCH`, `DELETE` (`ROLE_BUSINESS`) | Quản lý thông tin nhà hàng |
| `/api/bookings/foods/search/**` | `lb://bookingservice` | `GET` (`CUSTOMER`, `BUSINESS`), `POST` (`ADMIN`) | Tìm kiếm món ăn Elasticsearch & gợi ý |
| `/api/payments/trip/{tripId}/pay-before` | `lb://paymentservice` | `PATCH` (`ROLE_CUSTOMER`) | Chuyển sang trả trước bằng mã VietQR |
| `/api/payments/trip/{tripId}` | `lb://paymentservice` | `GET` (`CUSTOMER`, `DRIVER`) | Xem thông tin thanh toán chuyến đi |
| `/api/payments/trip/{tripPaymentId}/confirm` | `lb://paymentservice` | `PATCH` (`ROLE_DRIVER`) | Tài xế xác nhận nhận tiền chuyển khoản |
| `/api/payments/driver-payment-info` | `lb://paymentservice` | `POST`/`PUT` (`ROLE_DRIVER`) | Đăng ký/cập nhật STK ngân hàng nhận tiền |
| `/api/vouchers`, `/api/vouchers/**` | `lb://paymentservice` | `POST` (`ADMIN`, `BUSINESS`) | Phát hành voucher khuyến mãi |
| `/api/vouchers/claim` | `lb://paymentservice` | `POST` (`ROLE_CUSTOMER`) | Khách nhận voucher vào ví |
| `/api/vouchers/app`, `/api/vouchers/restaurants/*` | `lb://paymentservice` | `GET` (`CUSTOMER`, `BUSINESS`) | Tra cứu danh sách voucher |
| `/api/feedbacks`, `/api/feedbacks/**` | `lb://feedbackservice` | `POST` (`ROLE_CUSTOMER`) | Gửi đánh giá sao & nhận xét tài xế |
| `/api/complaints`, `/api/complaints/**` | `lb://feedbackservice` | `POST` (`CUSTOMER`, `DRIVER`) | Gửi báo cáo vi phạm / khiếu nại chuyến đi |
| `/api/notifications/**` | `lb://notificationservice` | `POST` (Internal/Authenticated) | Tạo thông báo |

---

## Cấu hình và chạy backend

Tám service Java dùng ba file trong `src/main/resources`: `application.yaml` chứa cấu hình chung, `application-dev.yaml` chạy Maven trên máy host, và `application-pod.yaml` chạy trong container. Chọn profile bằng `SPRING_PROFILES_ACTIVE`. `EUREKA_DEFAULT_ZONE` và `JWT_JWK_SET_URI` được truyền qua biến môi trường cho các service có dùng chúng.

Compose khởi động PostgreSQL và MongoDB. Khi volume PostgreSQL được khởi tạo lần đầu, [init-postgres.sql](init-postgres.sql) tạo bốn database cho User, Driver, Feedback và Notification. Booking và Payment dùng hai database MongoDB riêng. Nếu dùng database bên ngoài, tạo các database PostgreSQL trước và đặt URL có thể truy cập từ nơi chạy service.

### Tạo file môi trường cho thông tin nhạy cảm

Tạo `.env` để chạy Java bằng Maven trên máy host hoặc `.env.pod` để chạy bằng Docker Compose. Đặt file ở thư mục gốc `backend`. Git đã bỏ qua cả hai file. Thay các giá trị `THAY_...` bằng thông tin thật của môi trường chạy.

Thêm các biến sau vào file bạn dùng. Nếu chạy PostgreSQL bằng Compose, giữ user `postgres` theo `init-postgres.sql` và dùng cùng mật khẩu cho `POSTGRES_PASSWORD` và bốn biến `*_DB_PASSWORD`. Nếu dùng PostgreSQL riêng, điền tên người dùng và mật khẩu tương ứng cho từng database.

```dotenv
POSTGRES_USER=postgres
POSTGRES_PASSWORD='THAY_MAT_KHAU_POSTGRES'

USER_DB_USERNAME=postgres
USER_DB_PASSWORD='THAY_MAT_KHAU_POSTGRES'
DRIVER_DB_USERNAME=postgres
DRIVER_DB_PASSWORD='THAY_MAT_KHAU_POSTGRES'
FEEDBACK_DB_USERNAME=postgres
FEEDBACK_DB_PASSWORD='THAY_MAT_KHAU_POSTGRES'
NOTIFICATION_DB_USERNAME=postgres
NOTIFICATION_DB_PASSWORD='THAY_MAT_KHAU_POSTGRES'

RABBITMQ_USERNAME=driverapp
RABBITMQ_PASSWORD='THAY_MAT_KHAU_RABBITMQ'
STORAGE_ACCESS_KEY='THAY_ACCESS_KEY_MINIO'
STORAGE_SECRET_KEY='THAY_SECRET_KEY_MINIO'
OTP_CHALLENGE_SECRET='THAY_CHUOI_BI_MAT_NGAU_NHIEN'
```

Dùng `openssl rand -hex 32` để tạo giá trị cho `OTP_CHALLENGE_SECRET`, rồi dán kết quả vào file. Nếu MongoDB yêu cầu xác thực, lưu URI đầy đủ chứa thông tin đăng nhập trong `BOOKING_MONGODB_URI` và `PAYMENT_MONGODB_URI`.

**Chạy Maven trên máy host** — thêm vào `.env`. Ví dụ dùng PostgreSQL và MongoDB từ Compose.

```dotenv
SPRING_PROFILES_ACTIVE=dev
EUREKA_DEFAULT_ZONE=http://localhost:8761/eureka/
JWT_ISSUER_URI=http://localhost:8081
JWT_JWK_SET_URI=http://localhost:8081/.well-known/jwks.json
STORAGE_PUBLIC_ENDPOINT=http://localhost:9000

USER_DB_URL=jdbc:postgresql://localhost:5433/driverapp_user_db
DRIVER_DB_URL=jdbc:postgresql://localhost:5433/driverapp_driver_db
FEEDBACK_DB_URL=jdbc:postgresql://localhost:5433/driverapp_feedback_db
NOTIFICATION_DB_URL=jdbc:postgresql://localhost:5433/driverapp_notification_db
BOOKING_MONGODB_URI=mongodb://localhost:27017/driverapp_booking_db
PAYMENT_MONGODB_URI=mongodb://localhost:27017/driverapp_payment_db
```

**Chạy bằng Docker Compose** — thêm vào `.env.pod`. Compose đặt profile `pod` cho các service Java. URL nội bộ dùng tên service trong mạng Compose.

```dotenv
EUREKA_DEFAULT_ZONE=http://eureka:8761/eureka/
JWT_ISSUER_URI=http://localhost:8080
JWT_JWK_SET_URI=http://userservice:8081/.well-known/jwks.json
STORAGE_PUBLIC_ENDPOINT=http://localhost:9000

USER_DB_URL=jdbc:postgresql://postgres:5432/driverapp_user_db
DRIVER_DB_URL=jdbc:postgresql://postgres:5432/driverapp_driver_db
FEEDBACK_DB_URL=jdbc:postgresql://postgres:5432/driverapp_feedback_db
NOTIFICATION_DB_URL=jdbc:postgresql://postgres:5432/driverapp_notification_db
BOOKING_MONGODB_URI=mongodb://mongodb:27017/driverapp_booking_db
PAYMENT_MONGODB_URI=mongodb://mongodb:27017/driverapp_payment_db
```

### Chạy toàn bộ backend với Docker

Từ thư mục `backend`, dùng file `.env.pod` đã tạo ở trên.

```bash
./start-backend.sh --build
docker compose --env-file .env.pod ps
```

### Cập nhật IP LAN khi đổi Wi-Fi hoặc mạng

Chạy lại script từ thư mục `backend`:

```bash
./start-backend.sh
```

Script lấy IP theo tuyến mạng đến `1.1.1.1` và in địa chỉ đã chọn. Nếu không lấy được IP, script có thể dùng `localhost`. Để điện thoại dùng được URL MinIO, kiểm tra địa chỉ được in ra là IP LAN mà điện thoại truy cập được.

Script thay giá trị của dòng `STORAGE_PUBLIC_ENDPOINT=` trong `.env` và `.env.pod` nếu các file và dòng này đã tồn tại, sau đó chạy `docker compose up -d` với endpoint mới `http://<IP_LAN>:9000`. Nếu có `.env.pod`, script ưu tiên file đó cho Compose. Các đối số như `--build` được chuyển tiếp vào lệnh `up`.

Trên điện thoại cùng mạng, cập nhật URL API Gateway thành `http://<IP_LAN>:8080` trong cấu hình ứng dụng. Nếu điện thoại gọi được API nhưng không tải được tệp từ MinIO, kiểm tra điện thoại có truy cập được cổng `9000` trên máy host hay không.

### Cấu hình Docker Compose

Compose dùng file env để nội suy và chỉ truyền các biến được khai báo cho mỗi container. Giữ các file có giá trị thật ngoài Git. Khi dùng volume RabbitMQ hoặc MinIO đã có dữ liệu, chọn credential phù hợp với tài khoản trên volume đó. Với RabbitMQ, dùng tài khoản có quyền truy cập qua mạng container.

Gateway mặc định ở `http://localhost:8080`; Eureka Dashboard ở `http://localhost:8761` trên máy host. `JWT_ISSUER_URI` phải giống nhau ở User Service và các service xác thực token. Khi đổi domain hoặc cổng phía client, cập nhật `ADMIN_FE_ORIGIN`, `MOBILE_FE_ORIGIN`, `WS_ALLOWED_ORIGINS` và URL Gateway dùng để build frontend. `STORAGE_PUBLIC_ENDPOINT` phải là URL MinIO mà trình duyệt hoặc điện thoại có thể truy cập. Tạo bucket `driver-documents` và `business-documents` nếu chúng chưa tồn tại.

OSRM cần dữ liệu bản đồ `bookingservice/osrm/data/hanoi.osrm` và các tệp MLD liên quan. Bật bằng `docker compose --env-file .env.pod --profile routing up -d` sau khi chuẩn bị bản đồ. Có thể đặt `OSRM_URL` để dùng một máy chủ định tuyến riêng.

### Chạy các service Java trên máy local

Dùng file `.env` đã tạo ở trên. Nếu cơ sở dữ liệu nằm ngoài Compose, sửa URL theo địa chỉ truy cập từ máy host. Khởi động hạ tầng bằng lệnh dưới đây. Thêm `osrm` khi đã chuẩn bị dữ liệu bản đồ.

```bash
docker compose up -d postgres mongodb minio rabbitmq elasticsearch redis aimatchingservice
```

Chạy Java 21. Từ thư mục `backend`, nạp biến trong **mỗi terminal** trước khi chạy Maven. Dùng file `.env` do bạn quản lý, với giá trị được quote theo cú pháp shell khi cần.

```bash
set -a
. ./.env
set +a
cd eureka
./mvnw spring-boot:run
```

Lặp lại cách nạp biến và chạy Maven trong các thư mục `userservice`, `driverservice`, `bookingservice`, `paymentservice`, `feedbackservice`, `notificationservice` và `apigateway`. Khởi động Eureka và User Service trước để service khác đăng ký và lấy JWKS.

---

## Lưu ý Khi Kết nối từ Thiết bị Di động (Mobile App)

Khi kết nối ứng dụng Mobile (React Native / Flutter / Android / iOS) với API Gateway (`:8080`):
1. **Không gọi `localhost` hoặc `127.0.0.1`**: Trên điện thoại, `localhost` trỏ về chính thiết bị di động.
   - **Máy thật (cùng Wi-Fi)**: Sử dụng IP LAN máy tính backend (ví dụ: `http://192.168.x.x:8080`).
   - **Android Emulator**: Sử dụng `http://10.0.2.2:8080`.
2. **Cho phép Cleartext Traffic (HTTP)**: Cấu hình `android:usesCleartextTraffic="true"` trong `AndroidManifest.xml` của app mobile nếu kết nối qua HTTP không mã hóa.
3. **Mở Tường lửa máy chủ (Linux Host)**: Nếu điện thoại không gọi được, mở port tường lửa:
   ```bash
   sudo ufw allow 8080/tcp
   ```

---

## Cấu trúc Thư mục Toàn bộ Mã nguồn

```text
backend/
├── docker-compose.yml              # Khởi chạy MinIO, RabbitMQ, Elasticsearch
├── README.md                       # Tài liệu tổng quan toàn bộ hệ thống
├── document/                       # Tài liệu và dữ liệu mẫu cho tìm kiếm món ăn
├── aimatchingservice/              # Xếp hạng tài xế và gợi ý món ăn (Port 8087)
├── eureka/                         # Service Discovery (Port 8761)
├── apigateway/                     # Spring Cloud Gateway WebFlux, CORS, JWT & RBAC (Port 8080)
├── userservice/                    # Auth, Roles, OTP, JWT Issuer, JWKS (Port 8081)
├── driverservice/                  # Hồ sơ tài xế, GPLX/CCCD, MinIO, Phương tiện, Availability (Port 8082)
├── bookingservice/                 # Cuốc xe, nhà hàng, món ăn, tìm kiếm Food Elasticsearch 9.0 (Port 8083)
├── paymentservice/                 # Thanh toán VietQR Napas, STK tài xế, Voucher, SAGA DLQ (Port 8084)
├── feedbackservice/                # Đánh giá sao, báo cáo khiếu nại vi phạm (Port 8085)
└── notificationservice/            # Lưu trữ và gửi thông báo hệ thống qua RabbitMQ (Port 8086)
```

---

## Chi tiết Tài liệu Từng Dịch vụ

- [Eureka](eureka/README.md)
- [AI Matching Service](aimatchingservice/README.md)
- [OSRM](bookingservice/osrm/README.md)
- [Tài liệu và dữ liệu mẫu](document/README.md)
- 📘 [API Gateway](apigateway/README.md)
- 👤 [User Service](userservice/README.md)
- 🚗 [Driver Service](driverservice/README.md)
- 🛵 [Booking Service](bookingservice/README.md)
- 💳 [Payment Service](paymentservice/README.md)
- ⭐ [Feedback Service](feedbackservice/README.md)
- 🔔 [Notification Service](notificationservice/README.md)


## Cấu hình timeout và OTP

Xem timeout và giới hạn tài nguyên trong cấu hình của [Gateway](apigateway/src/main/resources/application.yaml), [Booking](bookingservice/src/main/resources/application.yaml) và [User](userservice/src/main/resources/application.yaml). Với demo OTP trên máy local, dùng `AUTH_EXPOSE_OTP=true`. Khi triển khai production, cấu hình dịch vụ gửi SMS.
