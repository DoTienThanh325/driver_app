# Booking Service

`bookingservice` là dịch vụ trung tâm quản lý toàn bộ vòng đời cuốc xe (Trip Lifecycle), đối tác kinh doanh nhà hàng/quán ăn (Business/Restaurant), quản lý thực đơn món ăn (Food Menu) và công cụ tìm kiếm món ăn thông minh bằng **Elasticsearch 9.0**.

Service này sử dụng **MongoDB** làm cơ sở dữ liệu chính, **Elasticsearch** làm công cụ tìm kiếm toàn văn và địa lý, **RabbitMQ** để gửi nhận sự kiện theo mô hình **SAGA Choreography**.

> **Lưu ý kiến trúc**: Định danh tài xế (`driverId`) đồng nhất với `userId` (lấy từ JWT subject `sub`). Booking Service không cần gọi API phụ để tra cứu `driverId` từ `userId`.

---

## Cấu hình Chính

- **Port mặc định**: `8083` (biến môi trường `BOOKING_SERVICE_PORT`).
- **Database**: MongoDB `driverapp_booking_db` (`mongodb://localhost:27017/driverapp_booking_db`).
- **Elasticsearch**: `http://localhost:9200` (Index `foods`).
- **RabbitMQ**: `localhost:5672` (Topic Exchange `trip.topic.exchange`, SAGA Exchange `saga.compensation.exchange`).
- **JWT Issuer/JWKS**: `http://localhost:8081`.

---

## Danh Sách Endpoint & Nghiệp Vụ

### 1. Quản Lý Cuốc Xe (`/api/trips`)

#### `POST /api/trips` — Khách hàng đặt chuyến xe
- **Method**: `POST`
- **Xác thực**: Bearer JWT (`ROLE_CUSTOMER`). `customerId` được lấy tự động từ `JWT.sub`.
- **Request Body**:
  ```json
  {
    "pickupAddress": "123 Đường Lê Duẩn, Quận 1, TP.HCM",
    "pickupLatitude": 10.7769,
    "pickupLongitude": 106.6956,
    "dropoffAddress": "456 Đường Nguyễn Huệ, Quận 1, TP.HCM",
    "dropoffLatitude": 10.7735,
    "dropoffLongitude": 106.7042,
    "vehicleType": "MOTORBIKE",
    "fare": 35000.0,
    "distanceKm": 2.5
  }
  ```
- **Xử lý**: Lưu chuyến đi ở trạng thái `REQUESTED`, phát sinh sự kiện `trip.created` lên RabbitMQ để `paymentservice` tự động tạo bản ghi thanh toán mặc định `PAY_DIRECTLY`.

#### `POST /api/trips/{tripId}/accept` — Tài xế nhận cuốc xe
- **Method**: `POST`
- **Xác thực**: Bearer JWT (`ROLE_DRIVER`). `driverId` lấy tự động từ `JWT.sub`.
- **Xử lý**: 
  - Kiểm tra trạng thái cuốc xe đang là `REQUESTED`.
  - Gọi nội bộ Driver Service để xác minh tài xế đang `AVAILABLE`.
  - Cập nhật trạng thái chuyến sang `ACCEPTED`, gán `driverId`.
  - Phát sinh sự kiện `trip.driver-assigned` qua RabbitMQ để `paymentservice` và `notificationservice` cập nhật.

#### `PATCH /api/trips/status` — Tài xế cập nhật tiến trình chuyến đi
- **Method**: `PATCH`
- **Xác thực**: Bearer JWT (`ROLE_DRIVER`).
- **Request Body**:
  ```json
  {
    "tripId": "651f8a7e2b3c4d5e6f7a8b9c",
    "status": "IN_PROGRESS"
  }
  ```
- **Quy tắc chuyển đổi trạng thái**:
  `ACCEPTED` $\rightarrow$ `DRIVER_ARRIVING` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `COMPLETED`.
  *(Tài xế bị cấm gửi trạng thái `CANCELLED`)*.
- **Khi hoàn tất (`COMPLETED`)**:
  - Tự động phát sinh event `trip.completed` để `driverservice` cập nhật availability về `AVAILABLE`, `paymentservice` hoàn tất thanh toán trực tiếp, và `notificationservice` gửi thông báo.

#### `PATCH /api/trips/{tripId}/cancel` — Khách hàng hủy chuyến đi
- **Method**: `PATCH`
- **Xác thực**: Bearer JWT (`ROLE_CUSTOMER`).
- **Request Body**:
  ```json
  {
    "status": "CANCELLED",
    "cancelReason": "Tôi đổi ý không muốn đi nữa"
  }
  ```
- **Điều kiện**: Chỉ được hủy khi cuốc xe chưa có tài xế nhận (`status == REQUESTED`).

---

### 2. Tìm Kiếm Món Ăn Bằng Elasticsearch (`/api/bookings/foods/search`)

Tích hợp **Elasticsearch 9.0** giúp tìm kiếm món ăn cực nhanh với khả năng hiểu tiếng Việt không dấu/có dấu, sắp xếp theo khoảng cách địa lý và tự động gợi ý từ khóa.

#### `GET /api/bookings/foods/search` — Tìm kiếm món ăn
- **Params**:
  - `name`: Tên món ăn cần tìm (vd: `cơm gà`, `trà sữa`).
  - `latitude`, `longitude`: Tọa độ hiện tại của người dùng để tính khoảng cách và sắp xếp quán ăn từ gần đến xa.
  - `radiusKm`: Bán kính tìm kiếm (mặc định 10km).
  - `page`, `size`: Phân trang.
- **Ví dụ**:
  ```http
  GET /api/bookings/foods/search?name=cơm&latitude=10.7769&longitude=106.6956&page=0&size=10
  ```

#### `GET /api/bookings/foods/search/suggest` — Gợi ý từ khóa tự động (Autocomplete)
- **Params**: `prefix` (ví dụ: `bu` $\rightarrow$ gợi ý: `Bún bò Huế`, `Bún chả`, `Bún thịt nướng`).

#### `POST /api/bookings/foods/search/sync-all` — Quản trị đồng bộ dữ liệu
- Đồng bộ toàn bộ dữ liệu món ăn từ MongoDB sang Elasticsearch (được bảo vệ quyền Admin).
- Ngoài ra, hệ thống tích hợp `FoodDataSyncRunner` tự động kiểm tra và đồng bộ chỉ mục khi khởi động service nếu chỉ mục còn trống.

---

### 3. Quản Lý Đối Tác Kinh Doanh Nhà Hàng (`/api/businesses`, `/api/bookings/restaurants`)

- `POST /api/businesses/registration`: Khách hàng gửi hồ sơ đăng ký kinh doanh quán ăn (`multipart/form-data` kèm tên quán, tọa độ, địa chỉ và ảnh giấy phép kinh doanh tải lên MinIO).
- `GET /api/businesses/me`: Chủ nhà hàng xem thông tin quán ăn của mình.
- `GET /api/businesses`: Quản trị viên (`ROLE_ADMIN`) lấy danh sách đơn đăng ký.
- `PATCH /api/businesses/{id}/status`: Admin duyệt (`APPROVED`) hoặc từ chối (`REJECTED`) đơn đăng ký kinh doanh. Khi duyệt thành công, phát sinh sự kiện cấp role `BUSINESS` cho chủ quán.
- `PATCH /api/bookings/restaurants/{restaurantId}`: Đối tác cập nhật thông tin nhà hàng (`ROLE_BUSINESS`).
- `DELETE /api/bookings/restaurants/{restaurantId}`: Xóa nhà hàng và tự động cascade xóa toàn bộ món ăn liên quan trong cả MongoDB lẫn Elasticsearch.

---

### 4. Quản Lý Thực Đơn Món Ăn (`/api/bookings/foods`)

- `POST /api/bookings/foods`: Đối tác nhà hàng (`ROLE_BUSINESS`) thêm món ăn mới. Dữ liệu tự động lưu vào MongoDB và đồng bộ sang Elasticsearch.
- `PATCH /api/bookings/foods/{id}`: Cập nhật thông tin món ăn, giá tiền, ảnh.
- `DELETE /api/bookings/foods/{id}`: Xóa món ăn khỏi thực đơn và xóa document khỏi Elasticsearch.

---

### 5. Kiến Trúc SAGA Choreography & Giao Dịch Bù Trừ

`bookingservice` tích hợp các Listener xử lý bù trừ khi quy trình phân tán gặp sự cố:
1. **`TripPaymentInitRollbackListener`**: Lắng nghe `trip.payment-init.failed`. Nếu `paymentservice` không tạo được bản ghi thanh toán sau khi retry qua DLQ, listener này sẽ tự động **Hard-Delete (xóa vĩnh viễn) cuốc xe** khỏi MongoDB để giải phóng trạng thái cho khách hàng.
2. **`DriverAvailabilityRollbackListener`**: Lắng nghe rollback giải phóng tài xế khi nhận chuyến gặp lỗi downstream.
3. **`BusinessRoleRollbackListener`**: Lắng nghe rollback trạng thái phê duyệt nhà hàng nếu bước cấp quyền role `BUSINESS` bên `userservice` thất bại.
4. **`PaymentInconsistencyListener`**: Bắt các sai lệch trạng thái thanh toán và thông báo kiểm toán.

---

## Cấu Trúc Mã Nguồn

```text
bookingservice/src/main/java/com/driverapp/bookingservice/
├── config/                         # Cấu hình MongoDB, RabbitMQ, Security, Elasticsearch
├── controller/                     # REST Controllers (Trip, Food, Restaurant, Business, FoodSearch)
├── dto/                            # Data Transfer Objects (Request/Response)
├── elasticsearch/                  # Document, Repository & Index Settings Elasticsearch
│   ├── document/                   # FoodDocument, FoodOptionSubDoc
│   └── repository/                 # FoodSearchRepository
├── event/                          # Payload domain event & SAGA compensation
├── listener/saga/                  # Các SAGA compensation listeners (Rollback)
├── models/                         # MongoDB Documents (Trip, Restaurant, Food, Business)
├── repository/                     # Spring Data MongoDB Repositories
├── runner/                         # FoodDataSyncRunner (Sync MongoDB -> ES lúc khởi động)
└── service/                        # Interface & Implementations nghiệp vụ
```

---

## Cách Chạy Dịch Vụ

```bash
cd bookingservice
./mvnw spring-boot:run
```
*(Yêu cầu MongoDB tại `:27017`, RabbitMQ tại `:5672`, Elasticsearch tại `:9200` và Eureka Server `:8761` đang hoạt động)*.
