# Booking Service

`bookingservice` quản lý dữ liệu chuyến đi, đặt giao hàng/đồ ăn, danh sách nhà hàng, món ăn và ghép tài xế. Service này sử dụng MongoDB và yêu cầu JWT hợp lệ từ `userservice`.

## Cấu hình chính

- Port mặc định: `8083`, có thể cấu hình bằng `BOOKING_SERVICE_PORT`.
- Database: MongoDB `driverapp_booking_db`.
- JWT issuer/JWKS: mặc định `http://localhost:8081`.
- Service Discovery: Đăng ký với Eureka Server.

## Endpoint hiện có

- `POST /api/restaurants`: Thêm mới nhà hàng (tên, địa chỉ, tọa độ).
- `GET /api/restaurants`: Lấy danh sách tất cả nhà hàng.
- `GET /api/restaurants/{id}`: Lấy chi tiết thông tin nhà hàng theo ID.

## Cấu trúc thư mục & Giải thích file

- `pom.xml`: Khai báo Spring Web, Spring Data MongoDB, Security, OAuth2 Resource Server, Eureka Client, Lombok...
- `src/main/java/com/driverapp/bookingservice/`:
  - `BookingserviceApplication.java`: Class main khởi động service.
  - `config/SecurityConfig.java`: Cấu hình JWT resource server security.
  - `controller/`:
    - `RestaurantController.java`: REST controller quản lý thông tin nhà hàng.
  - `dto/request/`:
    - `RestaurantRequest.java`: DTO chứa thông tin tên nhà hàng, địa chỉ, lat, lng.
  - `models/`:
    - `Trip.java`: Mongo document `trips` (lưu điểm đón, điểm đến, customer, driver, phí giao hàng, trạng thái...).
    - `Restaurant.java`: Mongo document `restaurants` (lưu thông tin nhà hàng & vị trí tọa độ).
    - `Food.java`: Mongo document `foods` (món ăn và tùy chọn theo nhà hàng).
    - `FoodOption.java`: Sub-document trong `Food` (kích cỡ, giá).
    - `MatchingOffer.java`: Mongo document `matching_offers` (offer ghép chuyến gửi tài xế).
    - `enums/`:
      - `ShippingType.java`: Enum `PASSENGER`, `PARCEL_DELIVERY`, `FOOD_DELIVERY`.
      - `VehicleType.java`: Enum `MOTORBIKE`, `CAR`.
      - `TripStatus.java`: Enum vòng đời chuyến đi (`REQUESTED`, `ACCEPTED`, `ARRIVED_AT_PICKUP`, `PICKED_UP`, `IN_TRANSIT`, `COMPLETED`, `CANCELLED`, `NO_DRIVER_FOUND`).
      - `MatchingOfferStatus.java`: Enum `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`.
  - `repository/`:
    - `TripRepository.java`: Mongo repository cho `Trip`.
    - `RestaurantRepository.java`: Mongo repository cho `Restaurant`.
    - `FoodRepository.java`: Mongo repository cho `Food`.
    - `MatchingOfferRepository.java`: Mongo repository cho `MatchingOffer`.
  - `service/`:
    - `RestaurantService.java` & `impl/RestaurantServiceImpl.java`: Nghiệp vụ thêm, sửa, truy vấn thông tin nhà hàng.
- `src/main/resources/`:
  - `application.yaml`: Cấu hình port, MongoDB URI, UUID representation và Eureka Client.

## Cách chạy

```powershell
.\mvnw.cmd spring-boot:run
```

