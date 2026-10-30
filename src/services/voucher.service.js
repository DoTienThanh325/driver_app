import { apiClient } from './api-client';

export const voucherService = {
  /**
   * Lấy danh sách voucher của App chưa nhận
   * GET /api/vouchers/app?type=... (mặc định không truyền type để lấy tất cả)
   * @param {string} [type] - 'FOOD' | 'TRANSIT' | null
   */
  getAppVouchers: async (type = null) => {
    try {
      const endpoint = type ? `/api/vouchers/app?type=${type}` : '/api/vouchers/app';
      return await apiClient.get(endpoint);
    } catch (err) {
      if (err.isNetworkError) {
        // Fallback demo mock nếu offline
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
            providerType: 'RESTAURANT',
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
};
