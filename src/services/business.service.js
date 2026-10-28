import { apiClient } from './api-client';

export const BUSINESS_REGISTRATION_STATUS = {
  NOT_REGISTERED: 'NOT_REGISTERED',
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REJECTED: 'REJECTED',
  BANNED: 'BANNED',
};

export const businessService = {
  /**
   * Đăng ký kinh doanh mới qua POST /api/businesses/registration
   * Gửi formData chứa:
   * - restaurantName (String)
   * - restaurantAddress (String)
   * - restaurantLatitude (Double)
   * - restaurantLongitude (Double)
   * - businessLicenseImages (List<MultipartFile>)
   * @param {FormData} formData
   * @returns {Promise<{businessRegistrationId: string, restaurantId?: string, status: string, message: string}>}
   */
  registerBusiness: async (formData) => {
    try {
      return await apiClient.postFormData('/api/businesses/registration', formData);
    } catch (err) {
      if (err.isNetworkError) {
        return {
          businessRegistrationId: `demo-business-${Date.now()}`,
          restaurantId: `rest-${Date.now()}`,
          status: 'PENDING',
          message: 'Đăng ký kinh doanh thành công (Chế độ Demo)',
        };
      }
      throw err;
    }
  },

  /**
   * Lấy thông tin hồ sơ kinh doanh của tôi qua GET /api/businesses/me
   * @returns {Promise<Object|null>}
   */
  getMyBusiness: async () => {
    try {
      return await apiClient.get('/api/businesses/me');
    } catch (err) {
      if (
        err.message?.includes('404') ||
        err.message?.includes('not found') ||
        err.message?.includes('không tìm thấy')
      ) {
        return null;
      }
      if (err.isNetworkError) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Lấy trạng thái đăng ký kinh doanh hiện tại của người dùng
   * @returns {Promise<{status: string, data?: Object}>}
   */
  getRegistrationStatus: async () => {
    try {
      const data = await businessService.getMyBusiness();
      if (!data) {
        return { status: BUSINESS_REGISTRATION_STATUS.NOT_REGISTERED };
      }
      return {
        status: data.status || BUSINESS_REGISTRATION_STATUS.PENDING,
        data,
      };
    } catch (err) {
      return { status: BUSINESS_REGISTRATION_STATUS.NOT_REGISTERED };
    }
  },
};
