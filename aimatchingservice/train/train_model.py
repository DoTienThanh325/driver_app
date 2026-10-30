import os
import sys
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.metrics import roc_auc_score, log_loss, classification_report
import joblib

def train_acceptance_model(data_path: str = None, output_path: str = None):
    # Tìm file dataset
    if data_path is None:
        candidate_paths = [
            "data/matching_logs_synthetic.csv",
            "../data/matching_logs_synthetic.csv",
            os.path.join(os.path.dirname(__file__), "..", "data", "matching_logs_synthetic.csv"),
            "scripts/matching_logs_synthetic.csv",
            "../scripts/matching_logs_synthetic.csv",
            os.path.join(os.path.dirname(__file__), "..", "..", "scripts", "matching_logs_synthetic.csv")
        ]
        for p in candidate_paths:
            if os.path.exists(p):
                data_path = p
                break
    
    if not data_path or not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}. Please check path.")

    # Xác định đường dẫn file model đầu ra
    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), "..", "app", "models", "lgbm_acceptance_model.pkl")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    print(f"=== 1. Nạp và tiền xử lý dữ liệu từ: {data_path} ===")
    df = pd.read_csv(data_path)
    print(f"Tổng số mẫu: {len(df)}")

    feature_cols = [
        "trip_fare", "pickup_distance_km", "pickup_eta_minutes",
        "driver_rating", "accept_rate_7d", "trips_completed_today",
        "hour_of_day", "day_of_week"
    ]
    target_col = "is_accepted"

    # Phân chia theo thời gian (Chronological Split: 80% Train, 20% Val)
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    val_df = df.iloc[split_idx:]

    X_train, y_train = train_df[feature_cols], train_df[target_col]
    X_val, y_val = val_df[feature_cols], val_df[target_col]

    print(f"Tập Train: {len(X_train)} mẫu | Tập Validation: {len(X_val)} mẫu")
    print(f"Tỷ lệ positive label (is_accepted=1) trong Train: {y_train.mean():.2%}")

    print("=== 2. Huấn luyện mô hình LightGBM ===")
    model = lgb.LGBMClassifier(
        n_estimators=150,
        learning_rate=0.05,
        num_leaves=31,
        random_state=42,
        objective="binary"
    )

    model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        callbacks=[lgb.early_stopping(stopping_rounds=15, verbose=False)]
    )

    print("=== 3. Đánh giá chất lượng mô hình trên tập Validation ===")
    y_pred_proba = model.predict_proba(X_val)[:, 1]
    y_pred = (y_pred_proba >= 0.5).astype(int)

    auc = roc_auc_score(y_val, y_pred_proba)
    loss = log_loss(y_val, y_pred_proba)

    print(f"Validation ROC-AUC: {auc:.4f} (Mục tiêu >= 0.72)")
    print(f"Validation Log-Loss: {loss:.4f} (Mục tiêu <= 0.50)")
    print("\nBáo cáo phân loại chi tiết:")
    print(classification_report(y_val, y_pred, digits=4))

    # Độ quan trọng của các đặc trưng (Feature Importance)
    importance_df = pd.DataFrame({
        "Feature": feature_cols,
        "Importance": model.feature_importances_
    }).sort_values("Importance", ascending=False)
    print("\nFeature Importance:")
    for _, row in importance_df.iterrows():
        print(f"  - {row['Feature']:<22}: {row['Importance']}")

    print(f"\n=== 4. Xuất mô hình sang file: {output_path} ===")
    joblib.dump(model, output_path)
    print(">>> Huấn luyện và lưu mô hình thành công!")

if __name__ == "__main__":
    data_arg = sys.argv[1] if len(sys.argv) > 1 else None
    train_acceptance_model(data_arg)
