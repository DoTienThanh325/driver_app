import { apiClient } from './api-client';
import { offlineCacheStorage } from './storage/offline-cache.storage';

export const voucherService = {
  /**
   * Lấy danh sách voucher của App chưa nhận (Dành cho mục Ưu đãi - do Admin phát hành dùng chung, không lưu cache)
   * GET /api/vouchers/app?type=... (mặc định không truyền type để lấy tất cả)
   * @param {string} [type] - 'FOOD' | 'TRANSIT' | null
   */
  getAppVouchers: async (type = null) => {
    try {
      const endpoint = type ? `/api/vouchers/app?type=${type}` : '/api/vouchers/app';
      return await apiClient.get(endpoint);
    } catch (err) {
      if (err.isNetworkError) {
        // Fallback demo mock nếu offline: Toàn bộ voucher của mục Ưu đãi đều có providerType là 'APP'
        return [
          {
            id: 'mock-v1',
            discount: 20,
            maxDiscount: 50000,
            minValue: 100000,
            type: 'TRANSIT',
            providerType: 'APP',
            claimableCount: 150,
            expiredAt: '2026-12-31T23:59:59',
          },
          {
            id: 'mock-v2',
            discount: 30000,
            maxDiscount: 30000,
            minValue: 150000,
            type: 'FOOD',
            providerType: 'APP',
            claimableCount: 2,
            numberOfVouchersPerCus: 2,
            expiredAt: '2026-11-15T23:59:59',
          },
          {
            id: 'mock-v3',
            discount: 15000,
            maxDiscount: 15000,
            minValue: 0,
            type: 'TRANSIT',
            providerType: 'APP',
            claimableCount: 10,
            expiredAt: '2026-10-30T23:59:59',
          },
        ];
      }
      throw err;
    }
  },

  /**
   * Lấy danh sách voucher mà người dùng đã nhận
   * GET /api/vouchers/my-vouchers
   */
  getMyVouchers: async () => {
    try {
      return await apiClient.get('/api/vouchers/my-vouchers');
    } catch (err) {
      if (err.isNetworkError) {
        return [];
      }
      throw err;
    }
  },

  /**
   * Nhận voucher
   * POST /api/vouchers/claim
   * @param {string} voucherId
   * @param {number} numberOfVouchers
   */
  claimVoucher: async (voucherId, numberOfVouchers = 1) => {
    return await apiClient.post('/api/vouchers/claim', {
      voucherId,
      numberOfVouchers,
    });
  },

  /**
   * Lấy danh sách voucher của Nhà hàng (Role BUSINESS - do Quán phát hành, providerType là RESTAURANT)
   * Thông tin lưu vào cache là của riêng từng nhà hàng theo restaurantId
   * GET /api/vouchers/restaurants/{restaurantId}
   */
  getRestaurantVouchers: async (restaurantId) => {
    try {
      if (!restaurantId || restaurantId === 'default') {
        const cached = await offlineCacheStorage.getRestaurantVouchers(restaurantId);
        return cached || [];
      }
      const data = await apiClient.get(`/api/vouchers/restaurants/${restaurantId}`);
      const list = Array.isArray(data) ? data : [];
      await offlineCacheStorage.saveRestaurantVouchers(list, restaurantId);
      return list;
    } catch (err) {
      console.warn('Lỗi khi tải voucher nhà hàng, đọc từ cache:', err?.message);
      const cached = await offlineCacheStorage.getRestaurantVouchers(restaurantId);
      return cached || [];
    }
  },

  /**
   * Tạo voucher mới cho Nhà hàng (Role BUSINESS)
   * POST /api/vouchers
   */
  createBusinessVoucher: async ({
    discount,
    maxDiscount,
    minValue,
    expiredAt,
    numberOfVouchersPerCus = 1,
  }) => {
    return await apiClient.post('/api/vouchers', {
      discount: Number(discount),
      maxDiscount: Number(maxDiscount),
      minValue: Number(minValue),
      type: 'FOOD',
      expiredAt,
      numberOfVouchersPerCus: Number(numberOfVouchersPerCus) || 1,
    });
  },
};
