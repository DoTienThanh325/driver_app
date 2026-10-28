from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

class CandidateFoodItem(BaseModel):
    foodId: str = Field(..., description="Mã món ăn")
    foodName: str = Field(..., description="Tên món ăn")
    price: float = Field(..., description="Giá món ăn (VND)")
    restaurantId: str = Field(..., description="Mã quán ăn")
    restaurantName: str = Field(..., description="Tên quán ăn")
    distanceKm: float = Field(..., description="Khoảng cách từ quán tới khách (km)")
    restaurantRating: float = Field(default=4.5, description="Đánh giá sao của quán (1.0 - 5.0)")

class FoodRecommendationRequest(BaseModel):
    userId: Optional[UUID] = Field(default=None, description="UUID khách hàng")
    userLatitude: float = Field(..., description="Vĩ độ khách hàng")
    userLongitude: float = Field(..., description="Kinh độ khách hàng")
    userAvgOrderPrice: float = Field(default=45000.0, description="Mức giá trung bình khách hay đặt")
    userTotalOrders: int = Field(default=0, description="Tổng số đơn khách đã đặt")
    hourOfDay: int = Field(..., ge=0, le=23, description="Khung giờ hiện tại")
    dayOfWeek: int = Field(..., ge=1, le=7, description="Thứ trong tuần (1 = Thứ 2, 7 = CN)")
    candidateFoods: List[CandidateFoodItem] = Field(..., description="Danh sách món ăn ứng viên từ Elasticsearch")

class RankedFoodItem(BaseModel):
    foodId: str
    orderProbability: float = Field(..., description="Xác suất đặt món P(order) từ mô hình LightGBM")
    matchingScore: float = Field(..., description="Điểm xếp hạng tổng hợp đa mục tiêu")
    rank: int = Field(..., description="Thứ hạng gợi ý (1 là ưu tiên cao nhất)")
    matchReason: str = Field(..., description="Lý do gợi ý trực quan")

class FoodRecommendationResponse(BaseModel):
    mealTimeSlot: str = Field(..., description="Khung giờ bữa ăn (BREAKFAST, LUNCH, SNACK, DINNER, LATE_NIGHT)")
    modelUsed: str = Field(..., description="Tên mô hình được dùng (LIGHTGBM hoặc HEURISTIC_FALLBACK)")
    rankedFoods: List[RankedFoodItem]
