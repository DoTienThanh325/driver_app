from pydantic import BaseModel, Field
from typing import List
from uuid import UUID

class CandidateFeature(BaseModel):
    driverId: UUID = Field(..., description="UUID của tài xế")
    pickupDistanceKm: float = Field(..., description="Khoảng cách đường chim bay đến điểm đón (km)")
    pickupEtaMinutes: float = Field(..., description="Thời gian di chuyển thực tế từ OSRM (phút)")
    driverRating: float = Field(..., description="Điểm đánh giá trung bình của tài xế (1.0 - 5.0)")
    acceptRate7d: float = Field(..., description="Tỷ lệ nhận cuốc trong 7 ngày gần nhất (0.0 - 1.0)")
    tripsCompletedToday: int = Field(default=0, description="Số chuyến đã hoàn thành trong ngày")

class DriverScoringRequest(BaseModel):
    tripId: str = Field(..., description="Mã ID của chuyến đi")
    tripFare: float = Field(..., description="Cước phí chuyến đi (VND)")
    hourOfDay: int = Field(..., description="Khung giờ đặt xe (0 - 23)")
    dayOfWeek: int = Field(..., description="Ngày trong tuần (1 = Thứ Hai, 7 = Chủ Nhật)")
    candidates: List[CandidateFeature] = Field(..., description="Danh sách các tài xế ứng viên lân cận")

class ScoredCandidate(BaseModel):
    driverId: UUID
    acceptanceProbability: float = Field(..., description="Xác suất tài xế nhận cuốc P(accept)")
    matchingScore: float = Field(..., description="Điểm xếp hạng tổng hợp đa mục tiêu")
    rank: int = Field(..., description="Thứ hạng ưu tiên phát cuốc (1 là cao nhất)")

class DriverScoringResponse(BaseModel):
    tripId: str
    rankedCandidates: List[ScoredCandidate]
