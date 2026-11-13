import { apiClient } from './api-client';
import { offlineCacheStorage } from './storage/offline-cache.storage';

/**
 * Service quản lý Lịch sử cuốc xe và Đánh giá phản hồi của Tài xế
 */
export const tripService = {
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
