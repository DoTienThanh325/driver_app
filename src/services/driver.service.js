import { apiClient } from './api-client';

export const AVAILABILITY_STATUS = {
  AVAILABLE: 'AVAILABLE',
  OFFLINE: 'OFFLINE',
  ON_TRIP: 'ON_TRIP',
  SUSPENDED: 'SUSPENDED',
};

export const driverService = {
  /**
   * Cập nhật trạng thái hoạt động của tài xế
   * Backend nhận request { status: 'AVAILABLE' | 'OFFLINE' } qua PATCH /api/drivers/availability
   * và xác thực tài xế thông qua Bearer token (lấy driverId từ jwt subject)
   * @param {'AVAILABLE' | 'OFFLINE' | string} status 
   * @returns {Promise<{message: string}>}
   */
  updateAvailability: async (status) => {
    try {
      return await apiClient.patch('/api/drivers/availability', {
        status,
      });
    } catch (err) {
      if (err.isNetworkError) {
        // Fallback mô phỏng nếu chưa bật backend
        return { message: `Driver availability updated to ${status} (Demo Mode)` };
      }
      throw err;
    }
  },

  /**
   * Kiểm tra trạng thái khả dụng của tài xế
   * @param {string} driverId
   */
  checkAvailable: async (driverId) => {
    return await apiClient.get(`/api/drivers/check-available/${driverId}`);
  },

  /**
   * Đăng ký trở thành tài xế mới qua POST /api/drivers/register?vehicleType=...
   * Gửi formData chứa 6 file ảnh (CCCD, Bằng lái, Giấy tờ xe, Biển số xe)
   * @param {FormData} formData
   * @param {'MOTORBIKE' | 'CAR'} vehicleType
   * @returns {Promise<{driverId: string, status: string, message: string}>}
   */
  registerDriver: async (formData, vehicleType = 'MOTORBIKE') => {
    try {
      const endpoint = `/api/drivers/register?vehicleType=${vehicleType}`;
      return await apiClient.postFormData(endpoint, formData);
    } catch (err) {
      if (err.isNetworkError) {
        return {
          driverId: 'demo-driver-uuid',
          status: 'PENDING',
          message: 'Đăng ký hồ sơ thành công (Demo Mode)',
        };
      }
      throw err;
    }
  },

  /**
   * Cập nhật / bổ sung ảnh hồ sơ đăng ký tài xế (dùng khi REJECTED)
   * PATCH /api/drivers/registration
   * Tự động chuyển REJECTED -> PENDING để Admin duyệt lại
   * @param {FormData} formData
   * @returns {Promise<{message: string}>}
   */
  updateRegistration: async (formData) => {
    try {
      return await apiClient.patchFormData('/api/drivers/registration', formData);
    } catch (err) {
      if (err.isNetworkError) {
        return { message: 'Cập nhật thông tin hồ sơ thành công (Demo Mode)' };
      }
      throw err;
    }
  },

  /**
   * Thêm phương tiện mới cho tài xế
   * POST /api/vehicles?vehicleType=MOTORBIKE|CAR
   * @param {FormData} formData
   * @param {'MOTORBIKE' | 'CAR'} vehicleType
   * @returns {Promise<{vehicleId: string, message: string}>}
   */
  addVehicle: async (formData, vehicleType = 'MOTORBIKE') => {
    try {
      const endpoint = `/api/vehicles?vehicleType=${vehicleType}`;
      return await apiClient.postFormData(endpoint, formData);
    } catch (err) {
      if (err.isNetworkError) {
        return {
          vehicleId: `veh-${Date.now()}`,
          message: 'Yêu cầu thêm phương tiện đã được gửi để xét duyệt (Demo Mode)',
        };
      }
      throw err;
    }
  },

  /**
   * Lấy thông tin chi tiết hồ sơ tài xế qua GET /api/drivers/{driverId}
   * Nhận về presigned URL của các tài liệu
   * @param {string} driverId
   * @returns {Promise<Object>}
   */
  getDriverDetail: async (driverId) => {
    try {
      return await apiClient.get(`/api/drivers/${driverId}`);
    } catch (err) {
      if (err.isNetworkError) {
        return {
          driverId,
          username: 'thanhtiendriver',
          phoneNumber: '0868377913',
          verificationStatus: 'APPROVED',
          createdAt: new Date().toISOString(),
          idCard: {
            front: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80',
            back: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80',
          },
          license: {
            front: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80',
            back: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
          },
          vehicle: {
            vehicleType: 'MOTORBIKE',
            registrationFront: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=500&auto=format&fit=crop&q=80',
            plate: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&auto=format&fit=crop&q=80',
          },
        };
      }
      throw err;
    }
  },

  /**
   * Lấy trạng thái đăng ký của người dùng hiện tại (PENDING, REJECTED, APPROVED, NOT_REGISTERED)
   * @param {string} userId
   * @returns {Promise<{status: string, reason?: string, data?: Object}>}
   */
  getRegistrationStatus: async (userId) => {
    try {
      const data = await driverService.getDriverDetail(userId);
      return {
        status: data.verificationStatus || 'PENDING',
        data,
      };
    } catch (err) {
      if (err.message?.includes('404') || err.message?.includes('not found') || err.message?.includes('không tìm thấy')) {
        return { status: 'NOT_REGISTERED' };
      }
      // Nếu là lỗi khác, giả định là NOT_REGISTERED khi test offline
      return { status: 'NOT_REGISTERED' };
    }
  },
};
