# Tài liệu và dữ liệu mẫu

Thư mục này dùng cho tài liệu kỹ thuật, bộ yêu cầu HTTP và dữ liệu mẫu kiểm tra nghiệp vụ. Các tệp bên dưới có thể được lưu riêng trong bản làm việc local.

| Tệp | Nội dung |
| --- | --- |
| `elasticsearch-food-search.md` | Thiết kế và hướng dẫn tìm kiếm món ăn |
| `test-food-search.http` | Yêu cầu đồng bộ chỉ mục, tìm kiếm và gợi ý từ khóa |
| `foods.json` | Dữ liệu món ăn mẫu |
| `restaurants.json` | Dữ liệu nhà hàng mẫu |
| `vouchers.json` | Dữ liệu voucher mẫu |

Để kiểm tra từ phía client, gửi yêu cầu qua Gateway ở `http://localhost:8080` và thêm header `Authorization: Bearer <token>` với vai trò phù hợp. Endpoint đồng bộ toàn bộ chỉ mục yêu cầu vai trò `ADMIN`. Xem API và hướng dẫn chạy trong [Booking Service](../bookingservice/README.md).
