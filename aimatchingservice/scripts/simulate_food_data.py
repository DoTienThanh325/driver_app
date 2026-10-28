"""
Script sinh dữ liệu giả lập tương tác đặt đồ ăn (Food Delivery Interaction Simulator).
Sử dụng thư viện chuẩn của Python (csv, random, math, datetime) - không phụ thuộc numpy/pandas.
Phục vụ huấn luyện mô hình Machine Learning Phase 4: Dự đoán xác suất khách đặt món P(order).
"""

import csv
import random
import math
import os
from datetime import datetime, timedelta

CATEGORIES = {
    "BREAKFAST": ["Phở bò", "Bánh mì pate", "Xôi xéo", "Bún riêu", "Cà phê sữa đá", "Cháo sườn"],
    "LUNCH": ["Cơm tấm sườn bì", "Cơm rang dưa bò", "Bún chả Hà Nội", "Bún đậu mắm tôm", "Gà rán giòn", "Cơm gà xối mỡ"],
    "SNACK": ["Trà sữa trân châu", "Chè khúc bạch", "Bánh tráng trộn", "Nem chua rán", "Trà chanh giã tay", "Nước ép cam"],
    "DINNER": ["Lẩu thái hải sản", "Thịt nướng BBQ", "Pizza hải sản", "Cơm niêu Singapore", "Bò sốt me", "Gà nướng lu"],
    "LATE_NIGHT": ["Mì cay 7 cấp độ", "Ốc luộc lá chanh", "Cháo gà đêm", "Bánh mì kẹp xúc xích", "Chân gà sả tắc"]
}

def get_slot_by_hour(hour: int) -> str:
    if 5 <= hour <= 9:
        return "BREAKFAST"
    elif 10 <= hour <= 13:
        return "LUNCH"
    elif 14 <= hour <= 16:
        return "SNACK"
    elif 17 <= hour <= 20:
        return "DINNER"
    else:
        return "LATE_NIGHT"

def generate_food_interaction_data(num_samples: int = 5000, output_path: str = None):
    random.seed(42)

    if output_path is None:
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        output_path = os.path.join(base_dir, "data", "food_interaction_logs.csv")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    records = []
    start_date = datetime.now() - timedelta(days=30)
    base_price_map = {"BREAKFAST": 35000, "LUNCH": 50000, "SNACK": 32000, "DINNER": 75000, "LATE_NIGHT": 40000}

    for i in range(num_samples):
        timestamp = start_date + timedelta(minutes=random.randint(0, 30 * 24 * 60))
        hour = timestamp.hour
        day_of_week = timestamp.isoweekday()
        current_slot = get_slot_by_hour(hour)

        # 1. Profile người dùng giả lập
        user_id = f"user_{random.randint(1, 200):03d}"
        segment_rand = random.random()
        if segment_rand < 0.35:
            user_avg_price = random.gauss(30000, 5000)
        elif segment_rand < 0.85:
            user_avg_price = random.gauss(50000, 8000)
        else:
            user_avg_price = random.gauss(110000, 20000)
        user_avg_price = max(20000.0, round(user_avg_price / 1000.0) * 1000.0)
        user_total_orders = random.randint(1, 50)

        # 2. Món ăn giả lập
        if random.random() < 0.70:
            food_slot = current_slot
            is_slot_match = 1
        else:
            food_slot = random.choice(list(CATEGORIES.keys()))
            is_slot_match = 1 if food_slot == current_slot else 0

        food_name = random.choice(CATEGORIES[food_slot])
        food_id = f"food_{abs(hash(food_name)) % 1000:03d}"
        restaurant_id = f"rest_{random.randint(1, 50):03d}"

        raw_price = random.gauss(base_price_map[food_slot], 10000)
        food_price = max(20000.0, round(raw_price / 1000.0) * 1000.0)

        # 3. Khoảng cách & Rating
        distance_km = round(random.expovariate(1.0 / 1.5) + 0.3, 2)
        distance_km = min(distance_km, 6.0)
        restaurant_rating = round(min(max(random.gauss(4.5, 0.3), 3.0), 5.0), 2)

        # 4. Xác suất đặt món thực tế (Ground Truth)
        price_diff_ratio = abs(food_price - user_avg_price) / user_avg_price
        price_affinity = math.exp(-price_diff_ratio)
        distance_factor = math.exp(-distance_km / 2.5)
        rating_factor = restaurant_rating / 5.0

        logit = (
            2.5 * is_slot_match +
            2.0 * price_affinity +
            1.8 * distance_factor +
            1.5 * rating_factor -
            3.8
        )
        prob_order = 1.0 / (1.0 + math.exp(-logit))
        is_ordered = 1 if random.random() < prob_order else 0

        records.append({
            "user_id": user_id,
            "user_avg_price": user_avg_price,
            "user_total_orders": user_total_orders,
            "food_id": food_id,
            "food_name": food_name,
            "food_price": food_price,
            "restaurant_id": restaurant_id,
            "distance_km": distance_km,
            "restaurant_rating": restaurant_rating,
            "hour_of_day": hour,
            "day_of_week": day_of_week,
            "is_slot_match": is_slot_match,
            "is_ordered": is_ordered,
            "timestamp": timestamp.strftime("%Y-%m-%d %H:%M:%S")
        })

    # Ghi ra file CSV
    fieldnames = list(records[0].keys())
    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    ordered_count = sum(r["is_ordered"] for r in records)
    print(f">> Da tao thanh cong {len(records)} mau du lieu tuong tac tai: {output_path}")
    print(f">> Ty le dat mon thanh cong (is_ordered=1): {ordered_count / len(records):.2%}")

if __name__ == "__main__":
    generate_food_interaction_data()
