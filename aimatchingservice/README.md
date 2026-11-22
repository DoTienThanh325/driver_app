# AI Matching Service

Dịch vụ FastAPI chạy trên cổng `8087` và phục vụ Booking Service. Mô hình LightGBM dự đoán khả năng nhận cuốc của tài xế và khả năng người dùng chọn món. Khi thiếu mô hình, dịch vụ dùng phương pháp xếp hạng dự phòng.

| API | Chức năng |
| --- | --- |
| `GET /health` | Kiểm tra dịch vụ và trạng thái nạp hai mô hình |
| `POST /api/v1/matching/score` | Chấm điểm và xếp hạng tài xế ứng viên |
| `POST /api/v1/recommendation/rank` | Xếp hạng gợi ý món ăn |

## Chạy dịch vụ

Từ thư mục gốc backend, chạy `docker compose up -d --build aimatchingservice`. Nếu chạy trực tiếp, mở terminal trong thư mục này và dùng Python 3.11.

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8087
```

Kiểm tra ở `http://localhost:8087/health` và xem schema yêu cầu ở `http://localhost:8087/docs`. Booking dùng biến `AI_MATCHING_URL` để kết nối.

## Huấn luyện lại

Chạy các lệnh sau từ thư mục `aimatchingservice`. Script đọc CSV trong `data/` và ghi mô hình vào `app/models/`. Dùng `MODEL_PATH` và `FOOD_MODEL_PATH` để chỉ định các tệp mô hình khác khi chạy dịch vụ.

```bash
python -m train.train_model data/matching_logs_synthetic.csv
python -m train.train_food_model data/food_interaction_logs.csv
```
