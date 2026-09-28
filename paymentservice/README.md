# Payment Service

`paymentservice` lưu dữ liệu thanh toán chuyến đi, voucher hệ thống và voucher của từng người dùng. Service này dùng MongoDB và yêu cầu JWT hợp lệ từ `userservice`.

## Cấu hình chính

- Port mặc định trong file cấu hình: `8084`. Tên biến đang dùng là `BOOKING_SERVICE_PORT`.
- Database: MongoDB `driverapp_payment_db`.
- JWT issuer/JWKS: mặc định `http://localhost:8081`.

## Giải thích file

- `pom.xml`: khai báo Spring WebMVC, Spring Data MongoDB, Security, OAuth2 Resource Server, Validation, Lombok và test dependency.
- `mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties`: Maven Wrapper.
- `.gitignore`, `.gitattributes`: cấu hình Git.
- `HELP.md`: file hướng dẫn mặc định của Spring Initializr.
- `src/main/java/com/driverapp/paymentservice/PaymentserviceApplication.java`: class main khởi động service.
- `config/SecurityConfig.java`: tắt CSRF, dùng session stateless và yêu cầu JWT cho mọi request.
- `models/TripPayment.java`: Mongo document `trip_payments`, lưu trip id, phương thức thanh toán và voucher áp dụng.
- `models/TripPaymentVoucher.java`: object lồng trong `TripPayment`, lưu `voucherId`.
- `models/Voucher.java`: Mongo document `vouchers`, lưu mức giảm giá, giảm tối đa, giá trị đơn tối thiểu và thời gian hết hạn.
- `models/UserVoucher.java`: Mongo document `user_vouchers`, lưu danh sách voucher của một user.
- `models/UserVoucherItem.java`: object lồng trong `UserVoucher`, lưu voucher id và số lượng.
- `models/enums/PaymentMethod.java`: enum `PAY_AFTER`, `PAY_BEFORE`.
- `repository/TripPaymentRepository.java`: Mongo repository cho `TripPayment`.
- `repository/VoucherRepository.java`: Mongo repository cho `Voucher`.
- `repository/UserVoucherRepository.java`: Mongo repository cho `UserVoucher`.
- `src/main/resources/application.yaml`: cấu hình port, MongoDB URI, UUID representation và JWT resource server.
- `src/test/java/com/driverapp/paymentservice/PaymentserviceApplicationTests.java`: test khởi tạo context mặc định.
- `target/`: thư mục build sinh ra bởi Maven.

## Cách chạy

```powershell
.\mvnw.cmd spring-boot:run
```
