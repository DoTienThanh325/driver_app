"""
Script sinh dữ liệu giả lập phục vụ huấn luyện mô hình Machine Learning Phase 3.
Hỗ trợ cả Python tiêu chuẩn (thuần standard library: csv, math, random) và Pandas/Numpy nếu có.
"""

import math
import random
import csv
from datetime import datetime, timedelta
import os

def generate_synthetic_data(num_samples: int = 3000, output_path: str = "matching_logs_synthetic.csv"):
    random.seed(42)

    records = []
    base_time = datetime.now() - timedelta(days=30)
    accepted_count = 0

    for i in range(num_samples):
        # 1. Ngữ cảnh thời gian
        minute_offset = random.randint(0, 30 * 24 * 60)
        current_time = base_time + timedelta(minutes=minute_offset)
        hour_of_day = current_time.hour
        day_of_week = current_time.weekday() + 1  # 1: Thứ 2, ..., 7: Chủ Nhật

        # 2. Chuyến đi (Trip)
        # Giả lập cước từ 20.000 đến 250.000 VND (phân phối lệch phải)
        base_fare = random.gammavariate(3.0, 20000.0)
        trip_fare = round(max(20000.0, min(base_fare, 300000.0)), -3)

        # 3. Tương tác (Interaction)
        pickup_distance_km = round(random.uniform(0.2, 4.5), 2)
        pickup_eta_minutes = round(pickup_distance_km * random.uniform(2.5, 4.0), 1)

        # 4. Tài xế (Driver)
        driver_rating = round(max(3.5, min(random.gauss(4.8, 0.15), 5.0)), 2)
        accept_rate_7d = round(max(0.4, min(random.betavariate(8, 2), 0.98)), 2)
        trips_completed_today = max(0, int(random.gauss(6.0, 2.5)))

        # 5. TÍNH XÁC SUẤT NHẬN CUỐC THỰC TẾ (Logit & Sigmoid)
        logit = (
            2.5
            - 0.35 * pickup_eta_minutes
            + 0.000015 * trip_fare
            + 1.8 * (accept_rate_7d - 0.7)
            + 0.05 * min(trips_completed_today, 10)
        )

        # Giờ cao điểm (7-9h, 17-19h): khách đông, kén cuốc rẻ
        is_rush_hour = hour_of_day in [7, 8, 17, 18]
        if is_rush_hour and trip_fare < 30000:
            logit -= 0.8

        # Chuyển logit sang xác suất qua hàm Sigmoid
        p_accept = 1.0 / (1.0 + math.exp(-logit))
        p_accept = max(0.05, min(p_accept, 0.95))

        # Gán nhãn 1 (Nhận) hoặc 0 (Từ chối)
        is_accepted = 1 if random.random() < p_accept else 0
        if is_accepted == 1:
            accepted_count += 1

        records.append({
            "trip_id": f"trip_{i+1:05d}",
            "driver_id": f"driver_{random.randint(1, 100):03d}",
            "trip_fare": trip_fare,
            "pickup_distance_km": pickup_distance_km,
            "pickup_eta_minutes": pickup_eta_minutes,
            "driver_rating": driver_rating,
            "accept_rate_7d": accept_rate_7d,
            "trips_completed_today": trips_completed_today,
            "hour_of_day": hour_of_day,
            "day_of_week": day_of_week,
            "is_accepted": is_accepted,
            "timestamp": current_time.strftime("%Y-%m-%d %H:%M:%S")
        })

    # Sắp xếp theo dòng thời gian tăng dần
    records.sort(key=lambda r: r["timestamp"])

    # Ghi ra file CSV bằng thư viện chuẩn csv của Python
    headers = [
        "trip_id", "driver_id", "trip_fare", "pickup_distance_km",
        "pickup_eta_minutes", "driver_rating", "accept_rate_7d",
        "trips_completed_today", "hour_of_day", "day_of_week",
        "is_accepted", "timestamp"
    ]

    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        writer.writerows(records)

    print(f"[OK] Da sinh thanh cong {num_samples} mau du lieu tai: {output_path}")
    print(f"[INFO] Ty le nhan cuoc trung binh (Acceptance Rate): {accepted_count / num_samples:.2%}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_file = os.path.join(current_dir, "matching_logs_synthetic.csv")
    generate_synthetic_data(num_samples=3000, output_path=output_file)
