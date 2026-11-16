import { apiClient } from './api-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { offlineCacheStorage } from './storage/offline-cache.storage';

export const PAYMENT_METHOD = {
  PAY_DIRECTLY: 'PAY_DIRECTLY', // Tiền mặt trực tiếp
  PAY_BEFORE: 'PAY_BEFORE',     // Chuyển khoản VietQR Napas 24/7
};

export const PAYMENT_STATUS = {
  PENDING: 'PENDING',
  AWAITING_PAYMENT: 'AWAITING_PAYMENT',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
};

export const paymentService = {
  /**
   * Lưu phương thức thanh toán khách đã chọn trước
   */
  savePreferredPaymentMethod: async (tripId, method) => {
    try {
      if (tripId) {
        await AsyncStorage.setItem(`TRIP_PAY_METHOD_${tripId}`, method);
      }
    } catch (e) {
      console.warn('Lỗi lưu preferred payment method:', e);
    }
  },

  /**
   * Lấy phương thức thanh toán khách đã chọn trước
   */
  getPreferredPaymentMethod: async (tripId) => {
    try {
      if (!tripId) return null;
      return await AsyncStorage.getItem(`TRIP_PAY_METHOD_${tripId}`);
    } catch {
      return null;
    }
  },

  /**
   * Lấy chi tiết thanh toán của chuyến đi (Khách hoặc Tài xế)
   * GET /api/payments/trip/{tripId}
   */
  getTripPayment: async (tripId) => {
    let savedMethod = null;
    try {
      savedMethod = await AsyncStorage.getItem(`TRIP_PAY_METHOD_${tripId}`);
    } catch {}

    try {
      const res = await apiClient.get(`/api/payments/trip/${tripId}`);
      if (res) {
        if (savedMethod && savedMethod !== PAYMENT_METHOD.PAY_DIRECTLY) {
          res.method = savedMethod;
        }
        return res;
      }
    } catch (err) {
      // Fallback
    }

    return {
      method: savedMethod || PAYMENT_METHOD.PAY_DIRECTLY,
      status: PAYMENT_STATUS.PENDING,
    };
  },

  /**
   * Khách hàng chuyển sang phương thức Chuyển khoản VietQR
   * PATCH /api/payments/trip/{tripId}/pay-before
   */
  switchToPayBefore: async (tripId, voucherIds = []) => {
    try {
      return await apiClient.patch(`/api/payments/trip/${tripId}/pay-before`, { voucherIds });
    } catch (err) {
      throw err;
    }
  },

  /**
   * Khách hàng chuyển lại phương thức Tiền mặt
   * PATCH /api/payments/trip/{tripId}/pay-directly
   */
  switchToPayDirectly: async (tripId) => {
    try {
      return await apiClient.patch(`/api/payments/trip/${tripId}/pay-directly`, {});
    } catch (err) {
      throw err;
    }
  },

  /**
   * Tài xế xác nhận đã nhận được tiền chuyển khoản từ khách hàng
   * PATCH /api/payments/trip/{tripPaymentId}/confirm
   */
  confirmPayment: async (tripPaymentId) => {
    return await apiClient.patch(`/api/payments/trip/${tripPaymentId}/confirm`, {});
  },

  /**
   * Đăng ký mới thông tin tài khoản ngân hàng của tài xế (POST)
   * POST /api/payments/driver-payment-info
   * @param {Object} data
   * @param {string} data.bankName - Tên ngân hàng
   * @param {string} data.bankBin - Mã BIN ngân hàng (6 số)
   * @param {string} data.bankAccountNumber - Số tài khoản ngân hàng
   * @param {string} data.bankAccountName - Tên chủ tài khoản (Viết hoa không dấu)
   * @returns {Promise<any>}
   */
  registerDriverPaymentInfo: async (data = {}) => {
    return await apiClient.post('/api/payments/driver-payment-info', {
      bankName: data.bankName ? data.bankName.trim() : '',
      bankBin: data.bankBin ? String(data.bankBin).trim() : '',
      bankAccountNumber: data.bankAccountNumber ? String(data.bankAccountNumber).trim() : '',
      bankAccountName: data.bankAccountName ? String(data.bankAccountName).trim().toUpperCase() : '',
    });
  },

  /**
   * Cập nhật thông tin tài khoản ngân hàng của tài xế (PATCH)
   * PATCH /api/payments/driver-payment-info
   * @param {Object} data
   * @param {string} data.bankName - Tên ngân hàng
   * @param {string} data.bankBin - Mã BIN ngân hàng (6 số)
   * @param {string} data.bankAccountNumber - Số tài khoản ngân hàng
   * @param {string} data.bankAccountName - Tên chủ tài khoản (Viết hoa không dấu)
   * @returns {Promise<any>}
   */
  updateDriverPaymentInfo: async (data = {}) => {
    return await apiClient.patch('/api/payments/driver-payment-info', {
      bankName: data.bankName ? data.bankName.trim() : '',
      bankBin: data.bankBin ? String(data.bankBin).trim() : '',
      bankAccountNumber: data.bankAccountNumber ? String(data.bankAccountNumber).trim() : '',
      bankAccountName: data.bankAccountName ? String(data.bankAccountName).trim().toUpperCase() : '',
    });
  },

  /**
   * Lấy thông tin tài khoản ngân hàng hiện tại của tài xế
   * GET /api/payments/driver-payment-info
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
