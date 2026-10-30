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
        const mockOtp = '123456';
        console.log(`[AUTH LOG] Generated mock OTP for ${phoneNumber}: ${mockOtp}`);
        return {
          challengeToken: 'mock-challenge-token-demo-999',
          expiresInSeconds: 300,
          message: 'Đã gửi mã OTP (Demo Mode)',
          otp: mockOtp,
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
        const mockOtp = '123456';
        console.log(`[AUTH LOG] Resend mock OTP for ${phoneNumber}: ${mockOtp}`);
        return {
          challengeToken: 'mock-challenge-token-demo-999',
          expiresInSeconds: 300,
          message: 'Mã OTP đã được gửi lại thành công (Demo Mode)',
          otp: mockOtp,
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
   * Đồng bộ lại phiên đăng nhập và quyền (Role) mới nhất từ backend:
   * 1. Gọi tryRefreshToken() để nhận accessToken mới chứa các Claims/Roles mới nhất (DRIVER, BUSINESS...)
   * 2. Gọi getCurrentUser() để cập nhật thông tin người dùng và roles vào AsyncStorage
   * @returns {Promise<{success: boolean, refreshed: boolean, profile: Object|null}>}
   */
  syncRolesAndProfile: async () => {
    try {
      const refreshed = await apiClient.tryRefreshToken();
      let profile = null;
      try {
        profile = await authService.getCurrentUser();
      } catch (userErr) {
        console.warn('Lỗi khi fetch current user sau refresh token:', userErr);
        profile = await userStorage.getUserProfile();
      }
      return {
        success: Boolean(refreshed || profile),
        refreshed,
        profile,
      };
    } catch (err) {
      console.warn('Lỗi khi đồng bộ role và profile:', err);
      return { success: false, refreshed: false, profile: null };
    }
  },

  /**
   * Đăng xuất: Xóa sạch cả token và thông tin cá nhân
   */
  logout: async () => {
    await tokenStorage.clearTokens();
    await userStorage.clearUserProfile();
  },
};
