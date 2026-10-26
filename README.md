# T&M Driver App - Mobile Application 🛵🚗

Ứng dụng di động công nghệ (Gọi xe, Giao hàng, Quản lý tài xế) dành cho khách hàng và đối tác tài xế của hệ sinh thái **T&M**. Ứng dụng được xây dựng trên nền tảng **React Native** kết hợp **Expo SDK 58**, **Expo Router**, hỗ trợ đa nền tảng (iOS, Android) với trải nghiệm người dùng hiện đại và hiệu năng cao.

---

## 📱 Tính Năng Chính

### 1. Phân Quyền Người Dùng & Quản Lý Hồ Sơ
- **Khách hàng (`CUSTOMER` $\rightarrow$ KHÁCH HÀNG)**: Đặt chuyến, xem hoạt động, nhận ưu đãi.
- **Tài xế (`DRIVER` $\rightarrow$ TÀI XẾ)**: Mở khóa tab chuyên biệt **Tài xế**, xem và quản lý **Hồ sơ Tài xế**, theo dõi trạng thái hoạt động trực tuyến/ngoại tuyến.
- **Kinh doanh (`BUSINESS` $\rightarrow$ KINH DOANH)**: Dành cho đối tác doanh nghiệp, cửa hàng liên kết.
- Màn hình Tài khoản hiển thị trực quan thông tin người dùng cùng nhãn vai trò tương ứng và nút điều hướng ngữ cảnh:
  - Chưa là tài xế: Nút **"Đăng ký làm tài xế"** (kèm trạng thái xét duyệt: *Chờ duyệt*, *Bị từ chối* nếu đã nộp hồ sơ).
  - Đã có vai trò DRIVER: Nút **"Xem hồ sơ tài xế"** dẫn vào trang thông tin chi tiết.

### 2. Quy Trình Đăng Ký Tài Xế (Driver Registration)
- Thu thập đầy đủ hồ sơ pháp lý qua `multipart/form-data`:
  - **CCCD/CMND**: Ảnh chụp mặt trước & mặt sau.
  - **Giấy phép lái xe (GPLX)**: Ảnh chụp mặt trước & mặt sau.
  - **Thông tin phương tiện ban đầu**: Bộ chọn loại xe (🛵 Xe máy / 🚗 Ô tô), ảnh giấy đăng ký xe (Cà vẹt) và ảnh chụp biển số xe thực tế.
- Xem trước ảnh đã chọn ngay trên ứng dụng, hỗ trợ chụp lại hoặc xóa ảnh trước khi nộp.
- Tự động đồng bộ và theo dõi tiến trình phê duyệt hồ sơ từ hệ thống Admin.

### 3. Hồ Sơ Tài Xế & Quản Lý Phương Tiện Động
- Hiển thị trực tiếp các giấy tờ cá nhân đã được lưu trữ an toàn trên **MinIO Object Storage**.
- **Quản lý phương tiện thực tế:**
  - Loại bỏ hoàn toàn dữ liệu giả định (hardcoded). Hệ thống chỉ hiển thị đúng số lượng xe mà tài xế đã đăng ký và được duyệt.
  - Tự động đánh số thứ tự trực quan: **Xe 1**, **Xe 2**, **Xe 3**,...
  - Nút **"Xem giấy tờ xe"**: Mở modal hiển thị ảnh thực tế của giấy đăng ký xe và ảnh chụp biển số xe từ MinIO, không điền bừa thông tin.
  - Nút **"+ Thêm phương tiện mới"**: Mở modal cho phép tài xế đăng ký thêm xe máy hoặc ô tô kèm tải ảnh giấy tờ xe.

### 4. Giao Diện & Điều Hướng Chuẩn Hóa
- Hệ thống thanh điều hướng Bottom Tabs với tông màu thương hiệu **Teal `#00B5B8`**.
- Vector icons tự động chuyển đổi giữa dạng viền (*outline*) và dạng đặc (*filled*) theo trạng thái focus.
- Tự động nạp bộ font vector icons qua `useFonts` và `expo-splash-screen` ngăn chặn hoàn toàn lỗi vỡ glyph Unicode trên iOS/Android.

---

## 🛠️ Kiến Trúc Thư Mục (Project Structure)

Dự án áp dụng cấu trúc phân tách rõ ràng theo khuyến nghị của Expo Router:

```text
mobile/
├── assets/                  # Tài nguyên tĩnh (ảnh, logo, icons)
├── src/
│   ├── app/                 # File-based routing (Mỗi file là 1 màn hình)
│   │   ├── (tabs)/          # Bottom Tab Navigator
│   │   │   ├── _layout.jsx  # Cấu hình thanh điều hướng đáy (5 tabs)
│   │   │   ├── index.jsx    # Tab Trang chủ
│   │   │   ├── activity.jsx # Tab Hoạt động
│   │   │   ├── driver.jsx   # Tab Tài xế (Chỉ hiện khi có role DRIVER)
│   │   │   ├── promotions.jsx # Tab Ưu đãi
│   │   │   └── account.jsx  # Tab Tài khoản & Phân quyền
│   │   ├── _layout.jsx      # Root Stack Navigator, theme provider, nạp font
│   │   ├── login.jsx        # Màn hình Đăng nhập (OTP / Password)
│   │   ├── register.jsx     # Màn hình Đăng ký tài khoản
│   │   ├── driver-register.jsx # Màn hình Đăng ký tài xế
│   │   └── driver-profile.jsx  # Màn hình Hồ sơ tài xế & danh sách xe
│   ├── components/          # Reusable UI components
│   │   ├── themed-text.jsx  # Typography theo theme
│   │   ├── themed-view.jsx  # Container view theo theme
│   │   └── ui/
│   │       ├── sub-header.jsx           # Header chuẩn kèm nút quay lại
│   │       ├── image-upload-card.jsx    # Thẻ chọn & xem trước ảnh tải lên
│   │       ├── vehicle-document-modal.jsx # Modal xem chi tiết giấy tờ xe
│   │       └── add-vehicle-modal.jsx    # Modal đăng ký thêm phương tiện
│   ├── hooks/               # Custom hooks nghiệp vụ & state
│   │   ├── use-driver-profile.js        # Hook lấy hồ sơ & quản lý xe
│   │   ├── use-driver-registration.js   # Hook submit form đăng ký tài xế
│   │   ├── use-driver-availability.js   # Hook bật/tắt nhận chuyến
│   │   ├── use-login.js                 # Hook xử lý đăng nhập & JWT
│   │   └── use-register.js              # Hook xử lý đăng ký người dùng
│   ├── services/            # Tầng giao tiếp mạng & API backend
│   │   ├── api-client.js    # Fetch client (tự động gắn Bearer Token, FormData)
│   │   ├── auth.service.js  # API auth, token refresh, lưu profile
│   │   ├── driver.service.js# API hồ sơ tài xế, đăng ký, cập nhật hồ sơ
│   │   └── storage/
│   │       ├── token.storage.js # SecureStore lưu trữ Access/Refresh token
│   │       └── user.storage.js  # AsyncStorage lưu thông tin người dùng
│   ├── styles/              # Định nghĩa StyleSheet tách biệt cho từng màn hình
│   └── utils/               # Tiện ích bổ trợ
│       └── image-url.js     # Chuẩn hóa URL ảnh MinIO qua LAN IP / Gateway
├── .env                     # Cấu hình biến môi trường API Gateway
├── app.json                 # Cấu hình Expo App (ID, splash, icons, plugins)
└── package.json             # Danh sách dependencies (Expo SDK 58)
```

---

## 🌐 Tích Hợp API Backend & Object Storage

Ứng dụng kết nối tới hệ thống Microservices backend qua **Spring Cloud Gateway (Port 8080)**:

| Endpoint | Phương Thức | Mục Đích |
| :--- | :---: | :--- |
| `/api/auth/login` | `POST` | Đăng nhập tài khoản, nhận Access & Refresh Token |
| `/api/auth/register` | `POST` | Đăng ký tài khoản khách hàng mới |
| `/api/drivers/register` | `POST` | Nộp hồ sơ đăng ký tài xế (Multipart: CCCD, GPLX, Đăng ký xe, Biển số) |
| `/api/drivers/registration` | `PATCH` | Cập nhật / nộp lại hồ sơ khi có yêu cầu bổ sung |
| `/api/drivers/{driverId}` | `GET` | Lấy chi tiết hồ sơ tài xế (`driverId` $\equiv$ `userId`) & Presigned URLs MinIO |
| `/api/drivers/status` | `GET` | Kiểm tra trạng thái xét duyệt (`PENDING`, `APPROVED`, `REJECTED`) |
| `/api/drivers/availability` | `PUT` | Bật/tắt trạng thái trực tuyến sẵn sàng nhận chuyến |

### Xử Lý Ảnh MinIO Trên Thiết Bị Di Động
- Backend MinIO lưu trữ ảnh giấy tờ trong bucket `driver-documents` (chạy trên cổng `9000`).
- Helper `normalizeImageUrl` trong `src/utils/image-url.js` tự động chuyển đổi các địa chỉ `localhost:9000`, `127.0.0.1:9000` hoặc `minio:9000` sang IP thật của máy chủ mạng LAN (`EXPO_PUBLIC_API_URL`), giúp điện thoại thật và Expo Go tải ảnh trực tiếp mà không gặp lỗi kết nối hay xung đột chữ ký AWS SigV4.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Thử

### 1. Yêu cầu môi trường
- **Node.js**: Phiên bản 20 trở lên.
- **Expo CLI**: Đi kèm qua lệnh `npx expo`.
- **Ứng dụng Expo Go**: Cài đặt trên điện thoại di động (iOS App Store hoặc Android Google Play) hoặc sử dụng Xcode iOS Simulator / Android Studio Emulator.

### 2. Cài đặt dependencies
```bash
cd mobile
npm install
```

### 3. Cấu hình biến môi trường
Tạo hoặc kiểm tra file `.env` tại thư mục `mobile/`:
```env
# Địa chỉ IP của máy tính đang chạy backend (thay thế bằng IP mạng LAN thực tế của bạn)
EXPO_PUBLIC_API_URL=http://192.168.11.199:8080
```

### 4. Khởi chạy ứng dụng
```bash
# Khởi động Expo Dev Server
npx expo start

# Hoặc chạy trực tiếp trên iOS Simulator (yêu cầu macOS có Xcode)
npx expo start --ios

# Hoặc chạy trên Android Emulator
npx expo start --android
```

- Mở camera điện thoại (đối với iOS) hoặc ứng dụng Expo Go (đối với Android) để quét mã QR hiển thị trên terminal.

---

## 🔍 Kiểm Tra Mã Nguồn (Lint & Typecheck)

Trước khi đóng gói hoặc đẩy code lên kho lưu trữ:

```bash
# Kiểm tra định dạng và quy chuẩn mã nguồn
npx expo lint

# Chẩn đoán tính tương thích của dependencies với Expo SDK 58
npx expo-doctor
```

---

## 👥 Nhóm Phát Triển & Bản Quyền
- Dự án thuộc hệ thống **Technology Driver App (T&M)**.
- Phục vụ vận hành giải pháp công nghệ gọi xe, giao hàng và dịch vụ số.
