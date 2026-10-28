from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.schemas import DriverScoringRequest, DriverScoringResponse
from app.model import scorer
from app.food_schemas import FoodRecommendationRequest, FoodRecommendationResponse
from app.food_recommender import food_recommender

app = FastAPI(
    title="AI Driver Matching & Food Recommendation Service",
    description="Microservice điều phối tài xế và gợi ý món ăn thông minh bằng Machine Learning",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    """Kiểm tra sức khỏe dịch vụ và trạng thái nạp cả 2 mô hình LightGBM"""
    return {
        "status": "UP",
        "service": "aimatchingservice",
        "driver_model_loaded": scorer.model is not None,
        "driver_model_path": scorer.model_path if scorer.model is not None else "heuristic_fallback",
        "food_model_loaded": food_recommender.model is not None,
        "food_model_path": food_recommender.model_path if food_recommender.model is not None else "heuristic_fallback"
    }

# ==================== MODULE 1: AI DRIVER MATCHING (PHASE 3) ====================
@app.post("/api/v1/matching/score", response_model=DriverScoringResponse)
def score_drivers(request: DriverScoringRequest):
    """
    Chấm điểm xác suất nhận cuốc P(accept) và xếp hạng danh sách tài xế theo điểm Matching Score
    """
    ranked = scorer.predict_and_rank(
        trip_fare=request.tripFare,
        hour_of_day=request.hourOfDay,
        day_of_week=request.dayOfWeek,
        candidates=request.candidates
    )
    return DriverScoringResponse(
        tripId=request.tripId,
        rankedCandidates=ranked
    )

# ==================== MODULE 2: AI FOOD RECOMMENDATION (PHASE 4) ====================
@app.post("/api/v1/recommendation/rank", response_model=FoodRecommendationResponse)
def rank_foods(request: FoodRecommendationRequest):
    """
    Chấm điểm xác suất đặt món P(order) bằng mô hình Machine Learning LightGBM và xếp hạng Top món ăn cá nhân hóa
    """
    return food_recommender.rank_foods(request)
