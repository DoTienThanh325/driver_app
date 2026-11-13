import { apiClient } from './api-client';
import { offlineCacheStorage } from './storage/offline-cache.storage';

/**
 * Service quản lý gọi API phân hệ Ẩm thực (Food / Booking Service)
 */
export const foodService = {
  /**
   * Lấy danh sách toàn bộ món ăn (phân trang, sắp xếp)
   * GET /api/bookings/foods?page=0&size=20&sortBy=createdAt&sortDirection=desc
   */
  getAllFoods: async (page = 0, size = 20, restaurantId = null, sortBy = 'createdAt', sortDirection = 'desc') => {
    let endpoint = `/api/bookings/foods?page=${page}&size=${size}&sortBy=${sortBy}&sortDirection=${sortDirection}`;
    if (restaurantId && restaurantId !== 'default') {
      endpoint += `&restaurantId=${encodeURIComponent(restaurantId)}`;
    }
    return apiClient.get(endpoint);
  },

  /**
   * Lấy danh sách món ăn của Nhà hàng đối tác (kèm cache ngoại tuyến của riêng nhà hàng)
   */
  getFoodsByRestaurant: async (restaurantId, page = 0, size = 50) => {
    try {
      const res = await foodService.getAllFoods(page, size, restaurantId);
      const list = res?.content || (Array.isArray(res) ? res : []);
      if (restaurantId && restaurantId !== 'default') {
        await offlineCacheStorage.saveRestaurantFoods(list, restaurantId);
      }
      return list;
    } catch (err) {
      console.warn('Lỗi khi tải món ăn nhà hàng từ server, đọc từ cache:', err?.message);
      const cached = await offlineCacheStorage.getRestaurantFoods(restaurantId);
      return cached || [];
    }
  },

  /**
   * Thêm món ăn mới (Multipart FormData: 'food' JSON blob + 'images' List<File>)
   * POST /api/bookings/foods
   */
  createFood: async (formData) => {
    return apiClient.postFormData('/api/bookings/foods', formData);
  },

  /**
   * Chỉnh sửa thông tin món ăn (Hỗ trợ cả Multipart nếu đổi ảnh hoặc JSON nếu chỉ đổi thông tin)
   * PATCH /api/bookings/foods/{id}
   */
  updateFood: async (foodId, payload, isMultipart = false) => {
    if (isMultipart) {
      return apiClient.patchFormData(`/api/bookings/foods/${foodId}`, payload);
    }
    return apiClient.patch(`/api/bookings/foods/${foodId}`, payload);
  },

  /**
   * Xóa món ăn
   * DELETE /api/bookings/foods/{id}
   */
  deleteFood: async (foodId) => {
    return apiClient.delete(`/api/bookings/foods/${foodId}`);
  },

  /**
   * Tìm kiếm món ăn qua Elasticsearch (từ khóa và tùy chọn tọa độ)
   * GET /api/bookings/foods/search?name=...
   */
  searchFoods: async (name, latitude = null, longitude = null, page = 0, size = 20) => {
    let endpoint = `/api/bookings/foods/search?name=${encodeURIComponent(name)}&page=${page}&size=${size}`;
    if (latitude && longitude) {
      endpoint += `&latitude=${latitude}&longitude=${longitude}`;
    }
    return apiClient.get(endpoint);
  },

  /**
   * Gợi ý từ khóa tự động (Autocomplete)
   * GET /api/bookings/foods/search/suggest?prefix=...
   */
  getSuggestions: async (prefix) => {
    return apiClient.get(`/api/bookings/foods/search/suggest?prefix=${encodeURIComponent(prefix)}`);
  },

  /**
   * Lấy thông tin chi tiết món ăn (bao gồm options, quán ăn từ DB, vouchers)
   * GET /api/bookings/foods/{id}
   */
  getFoodDetail: async (foodId) => {
    return apiClient.get(`/api/bookings/foods/${foodId}`);
  },
};
