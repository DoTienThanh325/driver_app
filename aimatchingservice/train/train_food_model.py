import os
import sys
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.metrics import roc_auc_score, log_loss, classification_report
import joblib

def train_food_recommendation_model(data_path: str = None, output_path: str = None):
    if data_path is None:
        candidate_paths = [
            "data/food_interaction_logs.csv",
            "../data/food_interaction_logs.csv",
            os.path.join(os.path.dirname(__file__), "..", "data", "food_interaction_logs.csv")
        ]
        for p in candidate_paths:
            if os.path.exists(p):
                data_path = p
                break

    if not data_path or not os.path.exists(data_path):
        raise FileNotFoundError(f"Dataset not found at {data_path}. Please check path.")

    if output_path is None:
        output_path = os.path.join(os.path.dirname(__file__), "..", "app", "models", "food_recommendation_model.pkl")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    print(f"=== 1. Nap va tien xu ly du lieu tu: {data_path} ===")
    df = pd.read_csv(data_path)
    print(f"Tong so mau: {len(df)}")

    # Feature engineering: đo độ chênh lệch giá so với thói quen của khách
    df["price_diff_ratio"] = (df["food_price"] - df["user_avg_price"]).abs() / df["user_avg_price"].clip(lower=1.0)

    feature_cols = [
        "user_avg_price",
        "user_total_orders",
        "food_price",
        "distance_km",
        "restaurant_rating",
        "hour_of_day",
        "day_of_week",
        "is_slot_match",
        "price_diff_ratio"
    ]
    target_col = "is_ordered"

    # Chronological Split: 80% Train, 20% Val
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    val_df = df.iloc[split_idx:]

    X_train, y_train = train_df[feature_cols], train_df[target_col]
    X_val, y_val = val_df[feature_cols], val_df[target_col]

    print(f"Tap Train: {len(X_train)} mau | Tap Validation: {len(X_val)} mau")
    print(f"Ty le positive label (is_ordered=1) trong Train: {y_train.mean():.2%}")

    print("=== 2. Huan luyen mo hinh LightGBM ===")
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

    print("=== 3. Danh gia chat luong mo hinh tren tap Validation ===")
    y_pred_proba = model.predict_proba(X_val)[:, 1]
    y_pred = (y_pred_proba >= 0.5).astype(int)

    auc = roc_auc_score(y_val, y_pred_proba)
    loss = log_loss(y_val, y_pred_proba)

    print(f"Validation ROC-AUC: {auc:.4f} (Muc tieu >= 0.75)")
    print(f"Validation Log-Loss: {loss:.4f} (Muc tieu <= 0.45)")
    print("\nBao cao phan loai chi tiet:")
    print(classification_report(y_val, y_pred, digits=4))

    # Feature Importance
    importance_df = pd.DataFrame({
        "Feature": feature_cols,
        "Importance": model.feature_importances_
    }).sort_values("Importance", ascending=False)
    print("\nFeature Importance:")
    for _, row in importance_df.iterrows():
        print(f"  - {row['Feature']:<22}: {row['Importance']}")

    print(f"\n=== 4. Xuat mo hinh sang file: {output_path} ===")
    joblib.dump(model, output_path)
    print(">> Huan luyen va luu mo hinh thanh cong!")

if __name__ == "__main__":
    data_arg = sys.argv[1] if len(sys.argv) > 1 else None
    train_food_recommendation_model(data_arg)
