# Eureka

Eureka quản lý danh sách instance của các service Java trên cổng `8761`. Các service đăng ký tại `/eureka/`, còn API Gateway tra cứu instance theo tên dịch vụ qua các route `lb://`.

## Khởi động

Chạy từ thư mục gốc backend với Java 21. Khởi động Eureka trước các service Java khác.

```bash
cd eureka
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Để chạy bằng Docker Compose, dùng [hướng dẫn chạy backend](../README.md#cấu-hình-và-chạy-backend). Mở dashboard ở `http://localhost:8761/` để kiểm tra các instance đăng ký.

Các service chạy trên máy host dùng `EUREKA_DEFAULT_ZONE=http://localhost:8761/eureka/`. Trong mạng Compose, dùng `http://eureka:8761/eureka/`.
