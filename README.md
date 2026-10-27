# T&M Driver App - Mobile Application 🛵🚗

Ứng dụng di động công nghệ (Gọi xe, Giao hàng, Quản lý tài xế) dành cho khách hàng và đối tác tài xế của hệ sinh thái **T&M**. Ứng dụng được xây dựng trên nền tảng **React Native** kết hợp **Expo SDK 58**, **Expo Router**, hỗ trợ đa nền tảng (iOS, Android) với trải nghiệm người dùng hiện đại và hiệu năng cao.

---

## 📱 Tính Năng Chính

### 1. Phân Quyền Người Dùng & Quản Lý Hồ Sơ
- **Khách hàng (`CUSTOMER` $\rightarrow$ KHÁCH HÀNG)**: Đặt chuyến, xem hoạt động, nhận ưu đãi.
- **Tài xế (`DRIVER` $\rightarrow$ TÀI XẾ)**: Mở khóa tab chuyên biệt **Tài xế**, xem và quản lý **Hồ sơ Tài xế**, theo dõi trạng thái hoạt động trực tuyến/ngoại tuyến.
- **Kinh doanh (`BUSINESS` $\rightarrow$ KINH DOANH)**: Dành cho đối tác doanh nghiệp, cửa hàng liên kết.
- **Điều hướng thông minh tại màn hình Tài khoản**:
  - **Tài khoản đã gửi hồ sơ** (`PENDING`, `APPROVED`, `REJECTED`):
    - Mục *Hồ sơ của bạn* hiển thị **Hồ sơ Tài xế** kèm huy hiệu trạng thái trực quan: **Chờ duyệt** (vàng cam) hoặc **Cần bổ sung** (đỏ). Bấm vào sẽ mở màn hình Hồ sơ Tài xế chi tiết.
    - Mục *Mở rộng* tự động **ẩn mục Đăng ký Tài xế**, ngăn người dùng nộp trùng lặp form đăng ký ban đầu (tránh lỗi xung đột HTTP 409).
  - **Tài khoản hoàn toàn chưa đăng ký** (`NOT_REGISTERED`):
    - Mục *Mở rộng* hiển thị **Đăng ký Tài xế** kèm mô tả *"Gửi hồ sơ xác minh để nhận chuyến"*.

### 2. Quy Trình Đăng Ký Tài Xế (Driver Registration)
- Cấu trúc form nộp hồ sơ được gom nhóm logic và trực quan:
  - **Mục 1: Giấy tờ tùy thân**: Căn cước công dân (CCCD/CMND) mặt trước & mặt sau.
  - **Mục 2: Thông tin phương tiện & Giấy tờ lái xe**: Đặt bộ chọn loại phương tiện (`🛵 Xe máy` / `🚗 Ô tô`) lên đầu; tất cả các ô tải ảnh giấy tờ liên quan tự động cập nhật nhãn tương ứng theo loại xe đã chọn:
    - GPLX mặt trước & mặt sau (GPLX Xe máy / GPLX Ô tô).
    - Giấy đăng ký xe mặt trước (Cà vẹt xe máy / Cà vẹt ô tô).
    - Ảnh chụp biển số xe thực tế (Biển số xe máy / Biển số xe ô tô).
- **Xử lý ảnh & kết nối**:
  - Tự động nén và chuẩn hóa định dạng ảnh (`JPEG`) qua `expo-image-manipulator` giúp giảm dung lượng mạng và tăng tốc độ tải lên MinIO.
  - Tự động nhận diện tài khoản đã tồn tại hồ sơ để hướng dẫn chuyển sang Hồ sơ Tài xế thay vì hiển thị mã lỗi thô.

### 3. Hồ Sơ Tài Xế & Quản Lý Phương Tiện Đa Năng
- **Lưu trữ & Tách biệt Giấy phép lái xe theo loại xe trên MinIO**:
  - Tài xế có thể sở hữu đồng thời cả xe máy và ô tô.
  - Hệ thống lưu trữ và hiển thị độc lập cả hai loại GPLX bên cạnh nhau:
    - GPLX Ô tô: `license_car_front`, `license_car_back` (loại `DRIVER_LICENSE_CAR`).
    - GPLX Xe máy: `license_motorbike_front`, `license_motorbike_back` (loại `DRIVER_LICENSE_MOTORBIKE`).
    - Cập nhật một bằng lái hoàn toàn không ảnh hưởng hoặc ghi đè lên bằng lái của loại phương tiện còn lại.
- **Quản lý danh sách phương tiện động**:
  - Hiển thị danh sách phương tiện thực tế từ cơ sở dữ liệu (`Xe máy 1`, `Ô tô 2`,...), không sử dụng dữ liệu giả định.
  - Nút **"Xem giấy tờ xe"**: Mở modal hiển thị ảnh Cà vẹt và ảnh Biển số xe thực tế đã lưu trên MinIO.
- **Thêm phương tiện thông minh (`+ Thêm phương tiện`)**:
  - Cho phép tài xế đăng ký thêm xe máy hoặc ô tô vào tài khoản đang hoạt động.
  - **Tự động yêu cầu bổ sung bằng lái**: Nếu tài xế đăng ký loại xe mà mình chưa từng có bằng lái (ví dụ: đã có ô tô nhưng muốn thêm xe máy), form sẽ tự động hiển thị thêm 2 ô bắt buộc chụp **GPLX mặt trước & mặt sau** của phương tiện đó.
  - Phương tiện mới thêm vào sẽ có trạng thái `Chờ duyệt` (`PENDING`) độc lập để quản trị viên kiểm tra.
- **Xem chi tiết (Zoom) & Chỉnh sửa (Edit) ảnh giấy tờ**:
  - **Phóng to**: Bấm vào ảnh để mở modal xem ảnh toàn màn hình với hiệu ứng làm mờ nền và kích thước rõ nét.
  - **Chỉnh sửa**: Chuyển đổi linh hoạt chế độ Chỉnh sửa hồ sơ, hỗ trợ chọn ảnh từ Thư viện hoặc Chụp ảnh trực tiếp từ Camera, xem trước ảnh nháp và lưu cập nhật lên MinIO/Backend.

---

## 🛠️ Kiến Trúc Thư Mục (Project Structure)

Dự án áp dụng cấu trúc phân tách rõ ràng theo chuẩn **Expo Router**:

```text
mobile/
├── assets/                          # Tài nguyên tĩnh (ảnh, logo, icons)
├── src/
│   ├── app/                         # File-based routing (Mỗi file là 1 màn hình)
│   │   ├── (tabs)/                  # Bottom Tab Navigator
│   │   │   ├── _layout.jsx          # Cấu hình thanh điều hướng đáy (5 tabs)
│   │   │   ├── index.jsx            # Tab Trang chủ
│   │   │   ├── activity.jsx         # Tab Hoạt động
│   │   │   ├── driver.jsx           # Tab Tài xế (Chỉ hiện khi có role DRIVER)
│   │   │   ├── promotions.jsx       # Tab Ưu đãi
│   │   │   └── account.jsx          # Tab Tài khoản & Phân quyền ngữ cảnh
│   │   ├── _layout.jsx              # Root Stack Navigator, theme provider, nạp font
│   │   ├── login.jsx                # Màn hình Đăng nhập (OTP / Password)
│   │   ├── register.jsx             # Màn hình Đăng ký tài khoản khách hàng
│   │   ├── driver-register.jsx      # Màn hình Đăng ký tài xế (Nhóm theo phương tiện)
│   │   └── driver-profile.jsx       # Màn hình Hồ sơ tài xế & quản lý phương tiện
│   ├── components/                  # Reusable UI components
│   │   ├── themed-text.jsx          # Typography theo theme
│   │   ├── themed-view.jsx          # Container view theo theme
│   │   └── ui/
│   │       ├── sub-header.jsx               # Header chuẩn kèm nút quay lại
│   │       ├── image-upload-card.jsx        # Thẻ hiển thị & tương tác ảnh (Xem / Sửa)
│   │       ├── image-source-modal.jsx       # Modal chọn ảnh: Máy ảnh hoặc Thư viện
│   │       ├── zoomable-image-modal.jsx     # Modal phóng to chi tiết ảnh toàn màn hình
│   │       ├── vehicle-document-modal.jsx   # Modal xem chi tiết giấy tờ xe & chỉnh sửa
│   │       └── add-vehicle-modal.jsx        # Modal thêm phương tiện động kèm GPLX
│   ├── hooks/                       # Custom hooks nghiệp vụ & state
│   │   ├── use-driver-profile.js            # Hook lấy hồ sơ, zoom, edit ảnh & quản lý xe
│   │   ├── use-driver-registration.js       # Hook submit form đăng ký & chống lặp hồ sơ
│   │   ├── use-driver-availability.js       # Hook bật/tắt nhận chuyến
│   │   ├── use-login.js                     # Hook xử lý đăng nhập & JWT
│   │   └── use-register.js                  # Hook xử lý đăng ký người dùng
│   ├── services/                    # Tầng giao tiếp mạng & API backend
│   │   ├── api-client.js            # Fetch client & sendMultipartXHR (Upload đa phần)
│   │   ├── auth.service.js          # API auth, token refresh, lưu profile
│   │   ├── driver.service.js        # API hồ sơ tài xế, thêm xe, nộp giấy tờ
│   │   └── storage/
│   │       ├── token.storage.js     # SecureStore lưu trữ Access/Refresh token
│   │       └── user.storage.js      # AsyncStorage lưu thông tin người dùng
│   ├── styles/                      # Định nghĩa StyleSheet tách biệt cho từng màn hình
│   └── utils/                       # Tiện ích bổ trợ
│       ├── image-processor.js       # Nén ảnh, định dạng JPEG chuẩn trước khi upload
│       └── image-url.js             # Chuẩn hóa URL ảnh MinIO qua LAN IP / Gateway
├── .env                             # Cấu hình biến môi trường API Gateway
├── app.json                         # Cấu hình Expo App (ID, splash, icons, plugins)
└── package.json                     # Danh sách dependencies (Expo SDK 58)
```

---

## 🌐 Tích Hợp API Backend & Object Storage

Ứng dụng kết nối tới hệ thống Microservices backend qua **Spring Cloud Gateway (Port 8080)**:

| Endpoint | Phương Thức | Mục Đích |
| :--- | :---: | :--- |
| `/api/auth/login` | `POST` | Đăng nhập tài khoản, nhận Access & Refresh Token |
| `/api/auth/register` | `POST` | Đăng ký tài khoản khách hàng mới |
| `/api/drivers/register?vehicleType={type}` | `POST` | Nộp hồ sơ đăng ký tài xế lần đầu (Multipart: CCCD, GPLX, Đăng ký xe, Biển số) |
| `/api/drivers/registration` | `PATCH` | Cập nhật / thay đổi ảnh hồ sơ tài xế (`driverLicenseMotorbikeFront/Back`, `driverLicenseCarFront/Back`, `idCardFront/Back`) |
| `/api/vehicles?vehicleType={type}` | `POST` | Thêm phương tiện mới cho tài xế (Multipart: Cà vẹt, Biển số, kèm GPLX nếu chưa có) |
| `/api/drivers/{driverId}` | `GET` | Lấy chi tiết hồ sơ tài xế (`driverId` $\equiv$ `userId`) & Presigned URLs MinIO |
| `/api/drivers/check-available/{driverId}` | `GET` | Kiểm tra trạng thái khả dụng của tài xế |
| `/api/drivers/availability` | `PATCH` | Bật/tắt trạng thái trực tuyến sẵn sàng nhận chuyến |

### Xử Lý Ảnh MinIO & Upload Đa Phần (Multipart)
- **MinIO Object Storage**: Lưu trữ an toàn trong bucket `driver-documents`.
- **Đường dẫn chuẩn hóa**:
  - `driver/{username}/id-card/id_card_front.{ext}` & `id_card_back.{ext}`
  - `driver/{username}/driver-license/license_car_front.{ext}` & `license_car_back.{ext}`
  - `driver/{username}/driver-license/license_motorbike_front.{ext}` & `license_motorbike_back.{ext}`
  - `driver/{username}/registration-front/registration_front_{index}.{ext}`
  - `driver/{username}/plate/plate_img_{index}.{ext}`
- **Multipart XHR (`api-client.js`)**: Triển khai `sendMultipartXHR` qua `XMLHttpRequest` thay thế fetch chuẩn, khắc phục hoàn toàn lỗi `Unsupported FormDataPart implementation` trên React Native khi gửi đồng thời nhiều file ảnh lên Spring Boot multipart backend.
- **Helper `normalizeImageUrl`**: Tự động chuyển đổi các domain cục bộ (`localhost`, `127.0.0.1`, `minio:9000`) sang địa chỉ IP mạng nội bộ của máy chủ (`EXPO_PUBLIC_API_URL`), đảm bảo tải ảnh mượt mà trên cả thiết bị di động thật và trình giả lập.

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
EXPO_PUBLIC_API_URL=http://<IP_LAN_MAY_BAN>:8080
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
