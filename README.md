# T&M Driver App

Ứng dụng Transit & Meal dành cho khách hàng, tài xế và đối tác nhà hàng. Dự án sử dụng React Native, Expo SDK 58 và Expo Router, chạy trên Android, iOS và web.

## Tính năng

| Vai trò | Tính năng |
| --- | --- |
| Khách hàng | Đặt chuyến, theo dõi hoạt động, tìm món ăn và xem ưu đãi. |
| Tài xế | Nộp hồ sơ, quản lý giấy tờ và phương tiện, bật trạng thái nhận chuyến, xử lý và xem lịch sử chuyến đi. |
| Đối tác nhà hàng | Đăng ký kinh doanh, cập nhật hồ sơ nhà hàng, quản lý món ăn và tạo voucher. |

Khi thêm phương tiện thuộc loại xe chưa có giấy phép lái xe trong hồ sơ, tài xế cần bổ sung ảnh hai mặt giấy phép. Giấy phép xe máy và ô tô được quản lý riêng. Ảnh giấy tờ được chuẩn hóa sang JPEG trước khi tải lên qua API.

## Chạy trên máy phát triển

Cài Node.js 24 LTS và npm. Chạy các lệnh sau từ thư mục chứa `package.json`. Khởi động Spring Cloud Gateway để sử dụng các chức năng cần backend.

```bash
npm ci
npm start
```

Metro chạy ở cổng `8088`. Quét mã QR bằng Expo Go để mở ứng dụng trên điện thoại. Có thể dùng các lệnh sau khi đã cài đặt trình giả lập tương ứng hoặc muốn mở bản web.

| Lệnh | Mục đích |
| --- | --- |
| `npm run android` | Mở trên Android Emulator. |
| `npm run ios` | Mở trên iOS Simulator trên macOS. |
| `npm run web` | Chạy bản web ở chế độ phát triển. |

### Kết nối Gateway

Khi để trống `EXPO_PUBLIC_API_URL`, ứng dụng di động ưu tiên lấy host từ Metro và gọi Gateway ở cổng `8080`. Địa chỉ dự phòng là `10.0.2.2` trên Android và `localhost` trên iOS. Bản web dùng giao thức và host của trang đang mở, với cổng Gateway `8080`.

Nếu Gateway chạy trên máy khác, dùng cổng khác hoặc Metro chạy qua tunnel, đặt URL Gateway mà thiết bị có thể truy cập trong `.env`, rồi khởi động lại Expo. Ví dụ trên thiết bị cùng mạng LAN:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.10:8080
```

## Chạy bản web bằng Docker

Sau khi Gateway sẵn sàng, chạy từ thư mục chứa `docker-compose.yml`:

```bash
docker compose up -d --build
```

Mở `http://localhost:8088` hoặc dùng địa chỉ LAN của máy chủ khi truy cập từ thiết bị khác. Đặt `MOBILE_WEB_PORT` trong `.env` nếu cần đổi cổng web, chẳng hạn khi Metro đang dùng cổng `8088`. Cấu hình `MOBILE_FE_ORIGIN` phía backend khớp với origin của trang web, gồm giao thức, host và cổng. Nếu thay đổi `EXPO_PUBLIC_API_URL`, chạy lại lệnh Compose trên để build lại bản web.

## Thông báo thời gian thực

Android và iOS nhận thông báo cá nhân qua STOMP khi người dùng đã đăng nhập và ứng dụng đang mở ở tiền cảnh. Nút chuông ở Trang chủ và Tài xế mở danh sách và hiển thị số mục chưa đọc. Ứng dụng lưu tối đa 200 thông báo trên thiết bị theo từng tài khoản và xóa dữ liệu thông báo khi đăng xuất.

Nếu người dùng cấp quyền thông báo hệ thống, ứng dụng có thể hiển thị thông báo mới trong trung tâm thông báo của thiết bị. Luồng OTP dùng thông báo cục bộ riêng. Trạng thái đã đọc được lưu trên từng thiết bị. Bản web hiện chỉ hỗ trợ danh sách cục bộ. Các sự kiện phát sinh khi ứng dụng đóng, chạy nền hoặc mất mạng hiện không được nhận bù.

Client mặc định kết nối tới `/ws/notifications` trên Gateway, dùng `ws://` hoặc `wss://` tương ứng với giao thức API, gửi JWT khi mở WebSocket và khi gửi STOMP CONNECT, rồi đăng ký `/user/queue/notifications`. Nếu cần kết nối trực tiếp tới dịch vụ thông báo, đặt URL đầy đủ trong `.env` và khởi động lại Expo. Dùng `wss://` trên môi trường triển khai.

```dotenv
EXPO_PUBLIC_NOTIFICATION_WS_URL=ws://192.168.1.10:8086/ws/notifications
```

### Kiểm thử trên thiết bị

1. Đăng nhập và xác nhận WebSocket nhận HTTP `101 Switching Protocols`, sau đó STOMP nhận `CONNECTED`.
2. Phát một sự kiện chuyến đi cho tài khoản đang kiểm thử. Kiểm tra danh sách, số mục chưa đọc và thông báo hệ thống khi đã cấp quyền. Kiểm tra bằng tài khoản khác để xác nhận thông báo chỉ đến người nhận.
3. Đánh dấu một mục và tất cả mục là đã đọc. Mở lại ứng dụng để kiểm tra trạng thái đã lưu.
4. Thử mất mạng, khởi động lại dịch vụ hoặc đưa ứng dụng trở lại tiền cảnh. Xác nhận kết nối được thiết lập lại và mỗi sự kiện chỉ xuất hiện một lần.
5. Kiểm tra token hết hạn, làm mới token thất bại và đăng xuất hoặc đổi tài khoản trong lúc kết nối lại. Xác nhận danh sách chỉ hiển thị thông báo của tài khoản hiện tại.

## Cấu trúc dự án

| Đường dẫn | Nội dung |
| --- | --- |
| `src/app/` | Màn hình và cấu hình điều hướng Expo Router. Nhóm `(tabs)` chứa các tab chính, gồm tab Tài xế và Nhà hàng theo vai trò. |
| `src/components/`, `src/styles/` | Thành phần giao diện dùng lại và kiểu trình bày theo màn hình. |
| `src/hooks/`, `src/providers/` | Logic nghiệp vụ và trạng thái dùng chung. |
| `src/services/`, `src/services/storage/` | Client API, tích hợp dịch vụ backend và lưu trữ cục bộ. |
| `src/constants/api.js` | Cấu hình URL Gateway. |
| `src/utils/` | Tiện ích xử lý ảnh, địa chỉ và thông báo. |
| `app.json`, `app.config.js` | Cấu hình Expo và cấu hình xuất bản web cho Docker. |
| `tests/` | Kiểm thử luồng thông báo. |

## Kiểm tra mã nguồn

```bash
npm run lint
npm run typecheck
npm test
```

Xem [LICENSE](LICENSE) để biết điều khoản giấy phép.
