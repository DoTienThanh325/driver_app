import numpy as np
import joblib
import os
import logging
from typing import List
from app.schemas import CandidateFeature, ScoredCandidate

logger = logging.getLogger(__name__)

# Xác định đường dẫn file model linh hoạt
DEFAULT_MODEL_PATHS = [
    os.getenv("MODEL_PATH", ""),
    "app/models/lgbm_acceptance_model.pkl",
    "models/lgbm_acceptance_model.pkl",
    os.path.join(os.path.dirname(__file__), "models", "lgbm_acceptance_model.pkl"),
    os.path.join(os.path.dirname(__file__), "..", "models", "lgbm_acceptance_model.pkl")
]

class MatchingScorer:
    def __init__(self):
        self.model = None
        self.model_path = None
        self._load_model()

    def _load_model(self):
        for path in DEFAULT_MODEL_PATHS:
            if path and os.path.exists(path):
                try:
                    self.model = joblib.load(path)
                    self.model_path = path
                    logger.info(f"[AI Scorer] Successfully loaded LightGBM model from {path}")
                    print(f"[AI Scorer] Successfully loaded LightGBM model from {path}")
                    return
                except Exception as e:
                    logger.warning(f"[AI Scorer] Failed to load model from {path}: {e}")
        logger.warning("[AI Scorer] No model file found. Fallback to Heuristic Cold-Start scoring.")
        print("[AI Scorer] No model file found. Fallback to Heuristic Cold-Start scoring.")

    def predict_and_rank(self, trip_fare: float, hour_of_day: int, day_of_week: int,
                         candidates: List[CandidateFeature]) -> List[ScoredCandidate]:
        if not candidates:
            return []

        # Xây dựng ma trận đặc trưng (Feature Matrix)
        features = []
        for c in candidates:
            features.append([
                trip_fare,
                c.pickupDistanceKm,
                c.pickupEtaMinutes,
                c.driverRating,
                c.acceptRate7d,
                c.tripsCompletedToday,
                hour_of_day,
                day_of_week
            ])

        X = np.array(features)

        # 1. Dự đoán xác suất nhận P(accept) qua LightGBM (hoặc Heuristic nếu chưa nạp model)
        if self.model is not None:
            try:
                probabilities = self.model.predict_proba(X)[:, 1]
            except Exception as e:
                logger.error(f"[AI Scorer] Inference error: {e}. Falling back to Heuristic.")
                probabilities = self._heuristic_probabilities(candidates)
        else:
            probabilities = self._heuristic_probabilities(candidates)

        # 2. Tính Điểm xếp hạng đa mục tiêu (Multi-objective Ranking Score)
        scored_list = []
        max_eta = max([c.pickupEtaMinutes for c in candidates]) or 1.0

        for i, c in enumerate(candidates):
            p_accept = float(probabilities[i])
            norm_eta = c.pickupEtaMinutes / max_eta if max_eta > 0 else 0.0
            norm_rating = c.driverRating / 5.0

            # Trọng số chuẩn: 50% Xác suất nhận cuốc, 35% ETA thấp (âm để trừ điểm), 15% Rating cao
            score = 0.50 * p_accept - 0.35 * norm_eta + 0.15 * norm_rating

            scored_list.append({
                "driverId": c.driverId,
                "acceptanceProbability": round(p_accept, 4),
                "matchingScore": round(score, 4)
            })

        # Sắp xếp giảm dần theo matchingScore (điểm cao nhất đứng đầu)
        scored_list.sort(key=lambda x: x["matchingScore"], reverse=True)

        return [
            ScoredCandidate(
                driverId=item["driverId"],
                acceptanceProbability=item["acceptanceProbability"],
                matchingScore=item["matchingScore"],
                rank=idx + 1
            )
            for idx, item in enumerate(scored_list)
        ]

    def _heuristic_probabilities(self, candidates: List[CandidateFeature]) -> np.ndarray:
        return np.clip(
            [c.acceptRate7d * 0.7 + (1.0 / (1.0 + c.pickupEtaMinutes * 0.2)) * 0.3 for c in candidates],
            0.05, 0.95
        )

scorer = MatchingScorer()
