import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_USER_PROFILE = 'tm_user_profile';

/**
 * Quản lý lưu trữ thông tin cá nhân người dùng từ auth/me
 * Sử dụng AsyncStorage cho dữ liệu profile và cấu hình ứng dụng
 */
export const userStorage = {
  /**
   * Lưu thông tin người dùng từ API auth/me
   * @param {Object} profile - { id, username, fullName, phoneNumber, roles, avatarUrl, ... }
   */
  saveUserProfile: async (profile) => {
    try {
      if (!profile) return;
      const jsonValue = JSON.stringify(profile);
      await AsyncStorage.setItem(KEY_USER_PROFILE, jsonValue);
    } catch (error) {
      console.error('Lỗi khi lưu thông tin user profile vào AsyncStorage:', error);
    }
  },

  /**
   * Lấy thông tin người dùng đã lưu
   * @returns {Promise<Object|null>}
   */
  getUserProfile: async () => {
    try {
      const jsonValue = await AsyncStorage.getItem(KEY_USER_PROFILE);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Lỗi khi đọc user profile từ AsyncStorage:', error);
      return null;
    }
  },

  /**
   * Kiểm tra nhanh xem người dùng có quyền Tài xế (DRIVER) hay không
   * @returns {Promise<boolean>}
   */
  isDriver: async () => {
    try {
      const profile = await userStorage.getUserProfile();
      if (!profile || !Array.isArray(profile.roles)) return false;
      return profile.roles.some((r) => {
        const role = String(r).toUpperCase();
        return role === 'DRIVER' || role === 'ROLE_DRIVER';
      });
    } catch (error) {
      return false;
    }
  },

  /**
   * Kiểm tra nhanh xem người dùng có quyền Kinh doanh (BUSINESS) hay không
   * @returns {Promise<boolean>}
   */
  isBusiness: async () => {
    try {
      const profile = await userStorage.getUserProfile();
      if (!profile || !Array.isArray(profile.roles)) return false;
      return profile.roles.some((r) => {
        const role = String(r).toUpperCase();
        return role === 'BUSINESS' || role === 'ROLE_BUSINESS' || role === 'MERCHANT' || role === 'ROLE_MERCHANT';
      });
    } catch (error) {
      return false;
    }
  },

  /**
   * Lưu thông tin cơ sở kinh doanh (Tên nhà hàng, Địa chỉ, Tọa độ) đã đăng ký
   */
  saveBusinessInfo: async (info) => {
    try {
      if (!info) return;
      await AsyncStorage.setItem('tm_business_info', JSON.stringify(info));
    } catch (error) {
      console.error('Lỗi khi lưu thông tin kinh doanh vào AsyncStorage:', error);
    }
  },

  /**
   * Lấy thông tin cơ sở kinh doanh đã lưu
   */
  getBusinessInfo: async () => {
    try {
      const val = await AsyncStorage.getItem('tm_business_info');
      return val ? JSON.parse(val) : null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Xóa thông tin cá nhân khi Đăng xuất (Logout)
   */
  clearUserProfile: async () => {
    try {
      await AsyncStorage.removeItem(KEY_USER_PROFILE);
    } catch (error) {
      console.error('Lỗi khi xóa user profile khỏi AsyncStorage:', error);
    }
  },
};
