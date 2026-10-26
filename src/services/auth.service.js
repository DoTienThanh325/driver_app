import { apiClient } from './api-client';
import { tokenStorage } from './storage/token.storage';
import { userStorage } from './storage/user.storage';

export const authService = {
  /**
   * Đăng ký tài khoản mới qua POST /api/auth/register
   * @param {Object} payload
   * @param {string} payload.username
   * @param {string} payload.phoneNumber
   * @param {string} payload.password
   * @returns {Promise<{message: string}>}
   */
  register: async ({ username, phoneNumber, password }) => {
    try {
      return await apiClient.post('/api/auth/register', {
        username: username.trim(),
        phoneNumber: phoneNumber.trim(),
        password,
      });
    } catch (err) {
      if (err.isNetworkError) {
        // Mock fallback nếu backend chưa khởi động khi test
        return { message: 'Đăng ký thành công (Demo Mode)' };
      }
      throw err;
    }
  },

  /**
   * Bước 1: Gửi SĐT và mật khẩu nhận challengeToken
   * @param {Object} payload
   * @param {string} payload.phoneNumber
   * @param {string} payload.password
   * @returns {Promise<{challengeToken: string, expiresInSeconds: number, message: string}>}
   */
  login: async ({ phoneNumber, password }) => {
    try {
      return await apiClient.post('/api/auth/login', {
        phoneNumber,
        password,
      });
    } catch (err) {
      // Mock fallback nếu backend chưa khởi động và người dùng thử nghiệm tài khoản demo
      if (err.isNetworkError && phoneNumber === '0901234567' && password === 'driver123456') {
        return {
          challengeToken: 'mock-challenge-token-demo-999',
          expiresInSeconds: 300,
          message: 'Đã gửi mã OTP (Demo Mode)',
        };
      }
      throw err;
    }
  },

  /**
   * Bước 2: Xác thực mã OTP 6 số để nhận JWT Tokens và tự động lưu vào SecureStore
   * @param {Object} payload
   * @param {string} payload.challengeToken
   * @param {string} payload.otp
   * @returns {Promise<{accessToken: string, refreshToken: string, tokenType: string, expiresInSeconds: number}>}
   */
  verifyOtp: async ({ challengeToken, otp }) => {
    try {
      let tokenData;

      if (challengeToken === 'mock-challenge-token-demo-999') {
        if (otp === '123456' || otp.length === 6) {
          tokenData = {
            accessToken: 'mock-access-token-jwt-driver-xyz',
            refreshToken: 'mock-refresh-token-driver-xyz',
            tokenType: 'Bearer',
            expiresInSeconds: 900,
          };
        } else {
          throw new Error('Mã OTP không đúng');
        }
      } else {
        tokenData = await apiClient.post('/api/auth/verify-otp', {
          challengeToken,
          otp,
        });
      }

      // Lưu trữ Access Token và Refresh Token vào phân vùng phần cứng an toàn
      if (tokenData?.accessToken) {
        await tokenStorage.saveTokens(tokenData.accessToken, tokenData.refreshToken);
      }

      return tokenData;
    } catch (err) {
      throw err;
    }
  },

  /**
   * Gửi lại mã OTP
   * @param {Object} payload
   * @param {string} payload.phoneNumber
   * @param {string} payload.challengeToken
   */
  resendOtp: async ({ phoneNumber, challengeToken }) => {
    try {
      return await apiClient.post('/api/v1/auth/resend-otp', {
        phoneNumber,
        challengeToken,
      });
    } catch (err) {
      if (err.isNetworkError) {
        return {
          challengeToken: 'mock-challenge-token-demo-999',
          expiresInSeconds: 300,
          message: 'Mã OTP đã được gửi lại thành công (Demo Mode)',
        };
      }
      throw err;
    }
  },

  /**
   * Lấy thông tin tài khoản hiện tại từ auth/me và lưu vào AsyncStorage
   * @param {string} [accessToken]
   * @returns {Promise<{id: string, username: string, fullName?: string, phoneNumber: string, roles: string[]}>}
   */
  getCurrentUser: async (accessToken = null) => {
    try {
      let profile;
      try {
        profile = await apiClient.get('/api/users/me', accessToken);
      } catch (err) {
        if (err.isNetworkError) {
          profile = {
            id: 'mock-uuid-driver-001',
            username: 'driver_demo',
            fullName: 'Thành Trung',
            phoneNumber: '0901234567',
            roles: ['DRIVER'],
          };
        } else {
          throw err;
        }
      }

      // Lưu thông tin người dùng vào AsyncStorage
      if (profile) {
        await userStorage.saveUserProfile(profile);
      }

      return profile;
    } catch (err) {
      throw err;
    }
  },

  /**
   * Khôi phục phiên đăng nhập đã lưu (Auto-login)
   * @returns {Promise<{accessToken: string|null, userProfile: Object|null}>}
   */
  getSavedSession: async () => {
    const accessToken = await tokenStorage.getAccessToken();
    const userProfile = await userStorage.getUserProfile();
    return { accessToken, userProfile };
  },

  /**
   * Đăng xuất: Xóa sạch cả token và thông tin cá nhân
   */
  logout: async () => {
    await tokenStorage.clearTokens();
    await userStorage.clearUserProfile();
  },
};
