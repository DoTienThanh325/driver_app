import os
import joblib
import logging
import numpy as np
from typing import List
from app.food_schemas import FoodRecommendationRequest, RankedFoodItem, FoodRecommendationResponse

logger = logging.getLogger(__name__)

FOOD_MODEL_PATHS = [
    os.getenv("FOOD_MODEL_PATH", ""),
    "app/models/food_recommendation_model.pkl",
    "models/food_recommendation_model.pkl",
    os.path.join(os.path.dirname(__file__), "models", "food_recommendation_model.pkl")
]

TIME_SLOT_KEYWORDS = {
    "BREAKFAST": ["phở", "bún", "bánh mì", "xôi", "cháo", "cà phê"],
    "LUNCH": ["cơm", "bún chả", "phở", "cơm tấm", "gà rán", "bún bò"],
    "SNACK": ["trà sữa", "chè", "bánh tráng", "ăn vặt", "trà chanh", "nước ép"],
    "DINNER": ["lẩu", "nướng", "cơm", "bún", "pizza", "gà", "hải sản"],
    "LATE_NIGHT": ["cháo", "mì", "ốc", "bánh mì", "nướng"]
}

class FoodRecommendationEngine:
    def __init__(self):
        self.model = None
        self.model_path = None
        self._load_model()

    def _load_model(self):
        for path in FOOD_MODEL_PATHS:
            if path and os.path.exists(path):
                try:
                    self.model = joblib.load(path)
                    self.model_path = path
                    logger.info(f"[Food Recommender] Successfully loaded LightGBM food model from {path}")
                    print(f"[Food Recommender] Successfully loaded LightGBM food model from {path}")
                    return
                except Exception as e:
                    logger.warning(f"[Food Recommender] Failed to load food model from {path}: {e}")
        logger.warning("[Food Recommender] No food model found. Fallback to Heuristic scoring.")
        print("[Food Recommender] No food model found. Fallback to Heuristic scoring.")

    def determine_meal_slot(self, hour: int) -> str:
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

    def rank_foods(self, request: FoodRecommendationRequest) -> FoodRecommendationResponse:
        candidates = request.candidateFoods
        if not candidates:
            return FoodRecommendationResponse(
                mealTimeSlot="UNKNOWN",
                modelUsed="NONE",
                rankedFoods=[]
            )

        slot = self.determine_meal_slot(request.hourOfDay)
        keywords = TIME_SLOT_KEYWORDS.get(slot, [])
        max_dist = max([c.distanceKm for c in candidates]) or 1.0

        # Chuẩn bị ma trận đặc trưng cho 50 ứng viên
        feature_rows = []
        is_slot_matches = []
        for c in candidates:
            name_lower = c.foodName.lower()
            slot_match = 1 if any(kw in name_lower for kw in keywords) else 0
            is_slot_matches.append(slot_match)

            diff_ratio = abs(c.price - request.userAvgOrderPrice) / max(request.userAvgOrderPrice, 1.0)
            feature_rows.append([
                request.userAvgOrderPrice,
                request.userTotalOrders,
                c.price,
                c.distanceKm,
                c.restaurantRating,
                request.hourOfDay,
                request.dayOfWeek,
                slot_match,
                diff_ratio
            ])

        X = np.array(feature_rows)

        # 1. Dự đoán xác suất đặt món P(order) qua LightGBM
        model_used = "LIGHTGBM"
        if self.model is not None:
            try:
                p_orders = self.model.predict_proba(X)[:, 1]
            except Exception as e:
                logger.error(f"[Food Recommender] Inference error: {e}. Fallback to Heuristic.")
                p_orders = self._heuristic_probabilities(request, candidates, is_slot_matches)
                model_used = "HEURISTIC_FALLBACK"
        else:
            p_orders = self._heuristic_probabilities(request, candidates, is_slot_matches)
            model_used = "HEURISTIC_FALLBACK"

        # 2. Tính Điểm xếp hạng đa mục tiêu (Multi-objective Recommendation Score)
        scored_items = []
        for idx, c in enumerate(candidates):
            p_order = float(p_orders[idx])
            norm_rating = c.restaurantRating / 5.0
            norm_dist = c.distanceKm / max_dist

            # Trọng số: 50% Xác suất máy học P(order), 25% Rating quán, 25% Khoảng cách gần
            final_score = (
                0.50 * p_order +
                0.25 * norm_rating +
                0.25 * (1.0 - norm_dist)
            )

            reason = f"Hợp gu bữa {slot.lower()} (P={p_order:.0%}), cự ly {c.distanceKm:.1f}km"
            scored_items.append({
                "foodId": c.foodId,
                "p_order": round(p_order, 4),
                "score": round(float(final_score), 4),
                "reason": reason
            })

        # Sắp xếp giảm dần theo điểm tổng hợp
        scored_items.sort(key=lambda x: x["score"], reverse=True)

        ranked_foods = [
            RankedFoodItem(
                foodId=item["foodId"],
                orderProbability=item["p_order"],
                matchingScore=item["score"],
                rank=idx + 1,
                matchReason=item["reason"]
            )
            for idx, item in enumerate(scored_items)
        ]

        return FoodRecommendationResponse(
            mealTimeSlot=slot,
            modelUsed=model_used,
            rankedFoods=ranked_foods
        )

    def _heuristic_probabilities(self, request, candidates, is_slot_matches):
        probs = []
        for i, c in enumerate(candidates):
            diff = abs(c.price - request.userAvgOrderPrice) / max(request.userAvgOrderPrice, 1.0)
            p = 0.5 * np.exp(-diff) + 0.3 * is_slot_matches[i] + 0.2 * (c.restaurantRating / 5.0)
            probs.append(np.clip(p, 0.05, 0.95))
        return np.array(probs)

food_recommender = FoodRecommendationEngine()
