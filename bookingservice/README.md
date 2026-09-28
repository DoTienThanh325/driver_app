# Booking Service

`bookingservice` lưu dữ liệu đặt chuyến, nhà hàng, món ăn và offer ghép tài xế. Service này dùng MongoDB và yêu cầu JWT hợp lệ từ `userservice`.

## Cấu hình chính

- Port mặc định: `8083`, có thể đổi bằng `BOOKING_SERVICE_PORT`.
- Database: MongoDB `driverapp_booking_db`.
- JWT issuer/JWKS: mặc định `http://localhost:8081`.

## Giải thích file

- `pom.xml`: khai báo Spring WebMVC, Spring Data MongoDB, Security, OAuth2 Resource Server, Validation, Lombok và test dependency.
- `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`: Maven Wrapper.
- `.gitignore`, `.gitattributes`: cấu hình Git.
- `HELP.md`: file hướng dẫn mặc định của Spring Initializr.
- `src/main/java/com/driverapp/bookingservice/BookingserviceApplication.java`: class main khởi động service.
- `config/SecurityConfig.java`: tắt CSRF, dùng session stateless và yêu cầu JWT cho mọi request.
- `models/Trip.java`: Mongo document `trips`, lưu tọa độ/điểm đón, điểm đến, loại giao hàng, loại xe, customer, driver, food, phí giao hàng và trạng thái chuyến.
- `models/Restaurant.java`: Mongo document `restaurants`, lưu tên nhà hàng, địa chỉ và tọa độ.
- `models/Food.java`: Mongo document `foods`, lưu tên món, danh sách option và restaurant id.
- `models/FoodOption.java`: object lồng trong `Food`, lưu kích cỡ và giá.
- `models/MatchingOffer.java`: Mongo document `matching_offers`, lưu offer gửi cho tài xế theo trip và trạng thái offer.
- `models/enums/ShippingType.java`: enum `PASSENGER`, `PARCEL_DELIVERY`, `FOOD_DELIVERY`.
- `models/enums/VehicleType.java`: enum `MOTORBIKE`, `CAR`.
- `models/enums/TripStatus.java`: enum vòng đời chuyến, từ `REQUESTED` đến `COMPLETED`, `CANCELLED` hoặc `NO_DRIVER_FOUND`.
- `models/enums/MatchingOfferStatus.java`: enum `ACCEPTED`, `REJECTED`, `EXPIRED`, `CANCELLED`.
- `repository/TripRepository.java`: Mongo repository cho `Trip`.
- `repository/RestaurantRepository.java`: Mongo repository cho `Restaurant`.
- `repository/FoodRepository.java`: Mongo repository cho `Food`.
- `repository/MatchingOfferRepository.java`: Mongo repository cho `MatchingOffer`.
- `src/main/resources/application.yaml`: cấu hình port, MongoDB URI, UUID representation và JWT resource server.
- `src/test/java/com/driverapp/bookingservice/BookingserviceApplicationTests.java`: test khởi tạo context mặc định.
- `target/`: thư mục build sinh ra bởi Maven.

## Cách chạy

```powershell
.\mvnw.cmd spring-boot:run
```
