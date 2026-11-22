# T&M Transit&Meal — Admin Frontend (`admin_fe`)

Giao diện web quản trị (**Admin Portal**) được xây dựng bằng **ReactJS + TypeScript + Vite + Ant Design**, kết nối tới hệ thống backend microservices qua **API Gateway (`:8080`)**. Bảng màu và nhận diện thương hiệu đồng bộ với ứng dụng `mobile` (`#00B5B8`).

---

## 1. Tính năng chính

- **Đăng nhập quản trị (OTP xử lý ngầm, chỉ `ADMIN`):**
  - Admin chỉ cần nhập **Số điện thoại** và **Mật khẩu** tại `/login`.
  - Frontend tự gọi ngầm `/api/auth/login` → `/api/auth/verify-otp`, giải mã JWT kiểm tra role `ADMIN` trước khi lưu `accessToken` và `refreshToken` vào `localStorage`.
  - Tự động refresh token đơn luồng khi gặp `401` và đồng bộ đăng xuất giữa các tab trình duyệt.
- **Tổng quan (`/`):** Thống kê nhanh số lượng hồ sơ tài xế, đăng ký kinh doanh và báo cáo vi phạm đang chờ xử lý.
- **Duyệt đăng ký tài xế (`/drivers`, `/drivers/:driverId`):**
  - Danh sách tài xế `PENDING` và trang chi tiết có ảnh CCCD, bằng lái, cà vẹt và biển số xe với chức năng phóng to.
  - Trang chi tiết ưu tiên ảnh bằng lái xe máy và ô tô. Ảnh bằng lái từ hồ sơ cũ được hiển thị khi cả hai loại bằng lái đều thiếu ảnh.
  - Duyệt (`APPROVED`) hoặc từ chối kèm lý do (`REJECTED`).
- **Duyệt đăng ký kinh doanh (`/businesses`, `/businesses/:userId`):**
  - Lọc theo trạng thái `PENDING | ACCEPTED | REJECTED | BANNED`.
  - Xem chi tiết thông tin nhà hàng, liên kết Google Maps, ảnh giấy phép kinh doanh; hỗ trợ Chấp nhận, Từ chối hoặc Khoá (`BANNED`).
- **Xử lý báo cáo vi phạm (`/reports`, `/reports/:id`):**
  - Lọc theo trạng thái `PENDING | ACCEPTED | REJECTED`, loại vi phạm (`reportType`), phân trang server-side.
  - Xem chi tiết thông tin khách hàng, tài xế, mã chuyến đi; xử lý Chấp nhận / Từ chối kèm ghi chú, và tuỳ chọn **khoá tài khoản vi phạm** (`/api/admin/users/{userId}/ban`).

---

## 2. Cấu trúc thư mục

```text
admin_fe/
├── Dockerfile                # Build frontend bằng Node.js, phục vụ qua Nginx
├── docker-compose.yml        # Cấu hình dịch vụ web và cổng truy cập
├── nginx.conf                 # Phục vụ SPA, hỗ trợ mở trực tiếp URL trang con
├── index.html                # HTML gốc của ứng dụng
├── package.json              # Danh sách thư viện và script chạy/build
└── src/
    ├── main.tsx              # Entry point mount React App
    ├── App.tsx               # Cấu hình Theme, React Query, AuthProvider và Router
    ├── index.css             # CSS nền toàn cục
    ├── api/                  # Lớp gọi API (Axios + interceptors)
    │   ├── httpClient.ts     # Axios instance, gắn Bearer token & tự refresh khi 401
    │   ├── authApi.ts        # login, verifyOtp, logout, me
    │   ├── driverApi.ts      # Danh sách, chi tiết và duyệt tài xế
    │   ├── businessApi.ts    # Danh sách, chi tiết và duyệt đơn kinh doanh
    │   ├── complaintApi.ts   # Danh sách, chi tiết và xử lý báo cáo vi phạm
    │   └── userAdminApi.ts   # Khoá / mở khoá tài khoản người dùng
    ├── auth/                 # Quản lý phiên đăng nhập & phân quyền
    │   ├── tokenStorage.ts   # Lưu/xoá accessToken và refreshToken trong localStorage
    │   ├── AuthContext.tsx   # State đăng nhập, login OTP ngầm, logout, đồng bộ tab
    │   └── ProtectedRoute.tsx# Bảo vệ route, chỉ cho phép tài khoản có role ADMIN
    ├── components/           # Component dùng chung (StatusTag, ReasonModal)
    ├── layouts/
    │   └── AdminLayout.tsx   # Layout chính (Sidebar điều hướng, Header, Đăng xuất)
    ├── pages/                # Các màn hình nghiệp vụ
    │   ├── LoginPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── drivers/          # DriverListPage.tsx, DriverDetailPage.tsx
    │   ├── businesses/       # BusinessListPage.tsx, BusinessDetailPage.tsx
    │   └── reports/          # ReportListPage.tsx, ReportDetailPage.tsx, ResolveReportModal.tsx
    ├── theme/
    │   └── themeConfig.ts    # Bảng màu Teal (#00B5B8) đồng bộ với mobile
    ├── types/
    │   └── index.ts          # Định nghĩa TypeScript DTO khớp với backend
    └── utils/
        └── format.ts         # Format ngày giờ, nhãn tiếng Việt, trích xuất lỗi API
```

---

## 3. Công nghệ sử dụng

- **React 19** + **TypeScript** + **Vite**
- **Ant Design** (`antd`, `@ant-design/icons`)
- **React Router v7** (`react-router-dom`)
- **TanStack Query** (`@tanstack/react-query`)
- **Axios**, **jwt-decode**, **Day.js**

---

## 4. Hướng dẫn chạy local

### Yêu cầu

- Node.js 24 và npm. Nếu chạy bằng container, cần Docker và Docker Compose.

### Backend
1. Chạy **Eureka Server** (`:8761`), **API Gateway** (`:8080`), **User Service** (`:8081`), **Driver Service** (`:8082`), **Booking Service** (`:8083`), **Feedback Service** (`:8085`).
2. Bật biến môi trường `AUTH_EXPOSE_OTP=true` trên `userservice` để API login trả về mã OTP cho frontend xử lý ngầm.
3. Dùng tài khoản có vai trò `ADMIN`.

### Chạy frontend
```bash
cd admin_fe
npm ci
npm run dev
```
Ứng dụng chạy mặc định tại `http://localhost:5173`.

Frontend mặc định gọi Gateway tại `http://localhost:8080`. Nếu Gateway dùng địa chỉ khác, tạo tệp `.env` trong thư mục dự án và đặt `VITE_API_BASE_URL` thành URL mà trình duyệt có thể truy cập. Git bỏ qua cả `.env` và `.env.example`.

### Kiểm tra và xem bản build
```bash
npm run lint
npm run build
npm run preview
```

## Chạy Admin Web bằng Docker

Chạy từ thư mục `admin_fe` sau khi Gateway đã sẵn sàng:

```bash
VITE_API_BASE_URL=http://localhost:8080 docker compose up -d --build
```

Mở `http://localhost:5173`. Có thể đổi cổng máy chủ bằng `ADMIN_FE_PORT`. Đặt `VITE_API_BASE_URL` thành URL Gateway mà trình duyệt có thể truy cập. Biến này được nhúng lúc build, nên cần build lại image khi đổi URL. Cấu hình `ADMIN_FE_ORIGIN` phía backend khớp origin của trang web.
