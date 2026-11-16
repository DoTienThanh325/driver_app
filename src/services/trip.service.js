import { apiClient } from './api-client';
import { offlineCacheStorage } from './storage/offline-cache.storage';

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
   * API Test: Mô phỏng khách đặt chuyến gần vị trí tài xế
   * POST /api/trips/test/simulate-match
   */
  simulateTripNearMe: async (lat = 21.028511, lng = 105.854444, vehicleType = 'MOTORBIKE') => {
    return await apiClient.post(`/api/trips/test/simulate-match?lat=${lat}&lng=${lng}&vehicleType=${vehicleType}`, {});
  },

  /**
   * Tài xế cập nhật tọa độ GPS định kỳ lên hệ thống
   * POST /api/drivers/location
   */
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

  /**
   * Lấy lịch sử cuốc xe của tài xế (Đã thực hiện: COMPLETED, CANCELLED)
   * Endpoint: GET /api/trips/driver/history?status=COMPLETED,CANCELLED&page=0&size=20
   * @param {string} status - Ví dụ: 'COMPLETED,CANCELLED', 'COMPLETED', 'CANCELLED'
   * @param {number} page
   * @param {number} size
   * @returns {Promise<{content: Array, totalElements: number, totalPages: number}>}
   */
  getDriverHistory: async (status = 'COMPLETED,CANCELLED', page = 0, size = 20) => {
    try {
      const endpoint = `/api/trips/driver/history?status=${encodeURIComponent(status)}&page=${page}&size=${size}`;
      const res = await apiClient.get(endpoint);
      const list = res?.content || (Array.isArray(res) ? res : []);
      // Tự động lưu danh sách vào cache máy khách tài xế
      if (list && list.length > 0) {
        await offlineCacheStorage.saveDriverTripHistory(list);
      }
      return res;
    } catch (err) {
      console.warn('Lỗi gọi API lịch sử cuốc xe, chuyển sang đọc cache ngoại tuyến:', err?.message);
      const cached = await offlineCacheStorage.getDriverTripHistory();
      if (cached) {
        return { content: cached, totalElements: cached.length, totalPages: 1 };
      }
      throw err;
    }
  },

  /**
   * Lấy danh sách đánh giá/nhận xét của khách hàng về cuốc xe của tài xế
   * Endpoint: GET /api/feedbacks/driver/trip-reviews?tripId={optionalTripId}&page=0&size=20
   * @param {string|null} tripId
   * @param {number} page
   * @param {number} size
   * @returns {Promise<{content: Array, totalElements: number, totalPages: number}>}
   */
  getTripReviews: async (tripId = null, page = 0, size = 20) => {
    try {
      let endpoint = `/api/feedbacks/driver/trip-reviews?page=${page}&size=${size}`;
      if (tripId) {
        endpoint += `&tripId=${encodeURIComponent(tripId)}`;
      }
      const res = await apiClient.get(endpoint);
      const list = res?.content || (Array.isArray(res) ? res : []);
      if (list) {
        await offlineCacheStorage.saveTripReviews(tripId, list);
      }
      return res;
    } catch (err) {
      console.warn('Lỗi gọi API đánh giá cuốc xe, chuyển sang đọc cache ngoại tuyến:', err?.message);
      const cached = await offlineCacheStorage.getTripReviews(tripId);
      if (cached) {
        return { content: cached, totalElements: cached.length, totalPages: 1 };
      }
      throw err;
    }
  },
};
