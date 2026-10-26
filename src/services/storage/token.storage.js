import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY_ACCESS_TOKEN = 'tm_access_token';
const KEY_REFRESH_TOKEN = 'tm_refresh_token';

/**
 * Quản lý lưu trữ bảo mật Token (Access Token & Refresh Token)
 * Sử dụng iOS Keychain / Android Keystore thông qua expo-secure-store
 */
export const tokenStorage = {
  /**
   * Lưu Access Token và Refresh Token vào phân vùng bảo mật phần cứng
   * @param {string} accessToken
   * @param {string} refreshToken
   */
  saveTokens: async (accessToken, refreshToken) => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          if (accessToken) window.localStorage.setItem(KEY_ACCESS_TOKEN, accessToken);
          if (refreshToken) window.localStorage.setItem(KEY_REFRESH_TOKEN, refreshToken);
        }
        return;
      }

      if (accessToken) {
        await SecureStore.setItemAsync(KEY_ACCESS_TOKEN, accessToken, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      }
      if (refreshToken) {
        await SecureStore.setItemAsync(KEY_REFRESH_TOKEN, refreshToken, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      }
    } catch (error) {
      console.error('Lỗi khi lưu tokens vào SecureStore:', error);
    }
  },

  /**
   * Lấy Access Token
   * @returns {Promise<string|null>}
   */
  getAccessToken: async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(KEY_ACCESS_TOKEN);
        }
        return null;
      }
      return await SecureStore.getItemAsync(KEY_ACCESS_TOKEN);
    } catch (error) {
      console.error('Lỗi khi lấy access token từ SecureStore:', error);
      return null;
    }
  },

  /**
   * Lấy Refresh Token
   * @returns {Promise<string|null>}
   */
  getRefreshToken: async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage.getItem(KEY_REFRESH_TOKEN);
        }
        return null;
      }
      return await SecureStore.getItemAsync(KEY_REFRESH_TOKEN);
    } catch (error) {
      console.error('Lỗi khi lấy refresh token từ SecureStore:', error);
      return null;
    }
  },

  /**
   * Xóa toàn bộ Token khi người dùng Đăng xuất (Logout)
   */
  clearTokens: async () => {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(KEY_ACCESS_TOKEN);
          window.localStorage.removeItem(KEY_REFRESH_TOKEN);
        }
        return;
      }
      await SecureStore.deleteItemAsync(KEY_ACCESS_TOKEN);
      await SecureStore.deleteItemAsync(KEY_REFRESH_TOKEN);
    } catch (error) {
      console.error('Lỗi khi xóa tokens khỏi SecureStore:', error);
    }
  },
};
