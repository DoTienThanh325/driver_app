import { router } from 'expo-router';

/**
 * Utility helper để điều hướng an toàn và xử lý sạch navigation stack
 */
export const navigationHelper = {
  /**
   * Reset stack và quay về Trang chủ một cách triệt để
   * Đảm bảo sau khi về trang chủ, người dùng không thể vuốt mép trái sang phải để quay lại màn hình trước đó
   */
  resetToHome: () => {
    try {
      router.replace('/(tabs)');
    } catch (e) {
      router.push('/(tabs)');
    }
  },

  /**
   * Reset stack và điều hướng về trang chủ tài xế
   */
  resetToDriverHome: () => {
    try {
      router.replace('/(tabs)/driver');
    } catch (e) {
      router.push('/(tabs)/driver');
    }
  },

  /**
   * Reset stack và điều hướng về trang Đăng nhập (khi Đăng xuất hoặc hết hạn phiên)
   */
  resetToLogin: () => {
    try {
      router.replace('/login');
    } catch (e) {
      router.push('/login');
    }
  },
};
