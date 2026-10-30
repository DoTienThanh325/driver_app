import { apiClient } from './api-client';

export const TRIP_STATUS = {
  REQUESTED: 'REQUESTED',
  SEARCHING_DRIVER: 'SEARCHING_DRIVER',
  DRIVER_ASSIGNED: 'DRIVER_ASSIGNED',
  DRIVER_ARRIVING: 'DRIVER_ARRIVING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_DRIVER_FOUND: 'NO_DRIVER_FOUND',
};

export const SHIPPING_TYPE = {
  PASSENGER: 'PASSENGER',
  PARCEL_DELIVERY: 'PARCEL_DELIVERY',
  FOOD_DELIVERY: 'FOOD_DELIVERY',
};

export const VEHICLE_TYPE = {
  MOTORBIKE: 'MOTORBIKE',
  CAR: 'CAR',
};

export const tripService = {
  /**
   * Khách hàng tạo cuốc xe mới
   * POST /api/trips
   */
  createTrip: async (payload) => {
    return await apiClient.post('/api/trips', payload);
  },

  /**
   * Khách hàng lấy thông tin cuốc xe hiện tại / gần nhất
   * GET /api/trips/current
   */
  getCurrentTrip: async () => {
    try {
      return await apiClient.get('/api/trips/current');
    } catch {
      return null;
    }
  },

  /**
   * Lấy chi tiết cuốc xe theo ID
   * GET /api/trips/{tripId}
   */
  getTripById: async (tripId) => {
    return await apiClient.get(`/api/trips/${tripId}`);
  },

  /**
   * Khách hàng hủy chuyến
   * PATCH /api/trips/{tripId}/cancel
   */
  cancelTrip: async (tripId, cancelReason = 'Khách hàng thay đổi nhu cầu') => {
    return await apiClient.patch(`/api/trips/${tripId}/cancel`, {
      status: 'CANCELLED',
      cancelReason,
    });
  },

  /**
   * Tài xế nhận cuốc xe
   * POST /api/trips/{tripId}/accept
   */
  acceptTrip: async (tripId) => {
    return await apiClient.post(`/api/trips/${tripId}/accept`, {});
  },

  /**
   * Tài xế cập nhật trạng thái chuyến đi
   * PATCH /api/trips/status
   * Trạng thái cho phép: DRIVER_ARRIVING, IN_PROGRESS, COMPLETED
   */
  updateTripStatus: async (tripId, status) => {
    return await apiClient.patch('/api/trips/status', {
      tripId,
      status,
    });
  },

  /**
   * Tài xế lấy danh sách cuốc xe tiềm năng do AI Matching phân phối
   * GET /api/matching-offers/my-offers
   */
  getMyPendingOffers: async () => {
    try {
      const res = await apiClient.get('/api/matching-offers/my-offers');
      return Array.isArray(res) ? res : [];
    } catch {
      return [];
    }
  },

  /**
   * Tài xế từ chối lời mời cuốc xe
   * POST /api/matching-offers/{offerId}/reject
   */
  rejectOffer: async (offerId) => {
    return await apiClient.post(`/api/matching-offers/${offerId}/reject`, {});
  },

  /**
   * Tài xế cập nhật tọa độ GPS định kỳ lên hệ thống
   * POST /api/drivers/location
   */
  /**
   * API Test: Mô phỏng khách đặt chuyến gần vị trí tài xế
   * POST /api/trips/test/simulate-match
   */
  simulateTripNearMe: async (lat = 21.028511, lng = 105.854444, vehicleType = 'MOTORBIKE') => {
    return await apiClient.post(`/api/trips/test/simulate-match?lat=${lat}&lng=${lng}&vehicleType=${vehicleType}`, {});
  },

  updateLocation: async (latitude, longitude, heading = 0, speed = 0) => {
    const lat = Number(latitude) || 21.028511;
    const lng = Number(longitude) || 105.854444;
    try {
      return await apiClient.post('/api/drivers/location', {
        latitude: lat,
        longitude: lng,
        heading: Number(heading) || 0,
        speed: Number(speed) || 0,
      });
    } catch {
      return null;
    }
  },
};
