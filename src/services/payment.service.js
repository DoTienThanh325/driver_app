import { apiClient } from './api-client';
import { offlineCacheStorage } from './storage/offline-cache.storage';

export const paymentService = {
  /**
   * Đăng ký mới thông tin tài khoản ngân hàng của tài xế (POST)
   * @param {Object} data
   * @param {string} data.bankName - Tên ngân hàng
   * @param {string} data.bankBin - Mã BIN ngân hàng (6 số)
   * @param {string} data.bankAccountNumber - Số tài khoản ngân hàng
   * @param {string} data.bankAccountName - Tên chủ tài khoản (Viết hoa không dấu)
   * @returns {Promise<any>}
   */
  registerDriverPaymentInfo: async ({
    bankName,
    bankBin,
    bankAccountNumber,
    bankAccountName,
  }) => {
    return await apiClient.post('/api/payments/driver-payment-info', {
      bankName: bankName ? bankName.trim() : '',
      bankBin: bankBin ? String(bankBin).trim() : '',
      bankAccountNumber: bankAccountNumber ? String(bankAccountNumber).trim() : '',
      bankAccountName: bankAccountName ? String(bankAccountName).trim().toUpperCase() : '',
    });
  },

  /**
   * Cập nhật thông tin tài khoản ngân hàng của tài xế (PATCH)
   * @param {Object} data
   * @param {string} data.bankName - Tên ngân hàng
   * @param {string} data.bankBin - Mã BIN ngân hàng (6 số)
   * @param {string} data.bankAccountNumber - Số tài khoản ngân hàng
   * @param {string} data.bankAccountName - Tên chủ tài khoản (Viết hoa không dấu)
   * @returns {Promise<any>}
   */
  updateDriverPaymentInfo: async ({
    bankName,
    bankBin,
    bankAccountNumber,
    bankAccountName,
  }) => {
    return await apiClient.patch('/api/payments/driver-payment-info', {
      bankName: bankName ? bankName.trim() : '',
      bankBin: bankBin ? String(bankBin).trim() : '',
      bankAccountNumber: bankAccountNumber ? String(bankAccountNumber).trim() : '',
      bankAccountName: bankAccountName ? String(bankAccountName).trim().toUpperCase() : '',
    });
  },

  /**
   * Lấy thông tin tài khoản ngân hàng hiện tại của tài xế
   * @returns {Promise<any>}
   */
  getDriverPaymentInfo: async () => {
    try {
      const data = await apiClient.get('/api/payments/driver-payment-info');
      if (data) {
        await offlineCacheStorage.saveBankLink(data);
      }
      return data;
    } catch (error) {
      console.warn('Lỗi khi tải thông tin tài khoản ngân hàng từ server, đọc từ cache:', error?.message);
      const cached = await offlineCacheStorage.getBankLink();
      return cached || null;
    }
  },
};
