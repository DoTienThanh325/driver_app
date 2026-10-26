import { tokenStorage } from './storage/token.storage';

/**
 * API Client kết nối qua API Gateway
 * Tự động đính kèm Token và hỗ trợ cấu hình qua biến môi trường EXPO_PUBLIC_API_URL
 */
const RAW_GATEWAY_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.11.199:8080';
const GATEWAY_URL = RAW_GATEWAY_URL.replace(/\/+$/, '');

const getFullUrl = (endpoint) => {
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${GATEWAY_URL}${normalizedEndpoint}`;
};

let isRefreshing = false;

export const apiClient = {
  /**
   * Gọi API POST
   */
  post: async (endpoint, body, token = null, isRetry = false) => {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Tự động lấy accessToken từ SecureStore nếu không truyền vào
    const authToken = token || (await tokenStorage.getAccessToken());
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const fullUrl = getFullUrl(endpoint);

    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      // Xử lý tự động làm mới token nếu gặp 401 Unauthorized
      if (response.status === 401 && !isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        const refreshed = await apiClient.tryRefreshToken();
        if (refreshed) {
          return apiClient.post(endpoint, body, null, true);
        }
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Lỗi yêu cầu: mã ${response.status}`);
      }

      return data;
    } catch (error) {
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch')
      ) {
        const netErr = new Error(`Không thể kết nối tới máy chủ (${GATEWAY_URL}). Vui lòng kiểm tra dịch vụ backend.`);
        netErr.isNetworkError = true;
        throw netErr;
      }
      throw error;
    }
  },

  /**
   * Gọi API PATCH
   */
  patch: async (endpoint, body, token = null, isRetry = false) => {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Tự động lấy accessToken từ SecureStore nếu không truyền vào
    const authToken = token || (await tokenStorage.getAccessToken());
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const fullUrl = getFullUrl(endpoint);

    try {
      const response = await fetch(fullUrl, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      });

      // Xử lý tự động làm mới token nếu gặp 401 Unauthorized
      if (response.status === 401 && !isRetry) {
        const refreshed = await apiClient.tryRefreshToken();
        if (refreshed) {
          return apiClient.patch(endpoint, body, null, true);
        }
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || `Lỗi cập nhật: mã ${response.status}`);
      }

      return data;
    } catch (error) {
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch')
      ) {
        const netErr = new Error(`Không thể kết nối tới máy chủ (${GATEWAY_URL}). Vui lòng kiểm tra dịch vụ backend.`);
        netErr.isNetworkError = true;
        throw netErr;
      }
      throw error;
    }
  },

  /**
   * Gọi API GET
   */
  get: async (endpoint, token = null, isRetry = false) => {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Tự động lấy accessToken từ SecureStore nếu không truyền vào
    const authToken = token || (await tokenStorage.getAccessToken());
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const fullUrl = getFullUrl(endpoint);

    try {
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers,
      });

      // Xử lý tự động làm mới token nếu gặp 401 Unauthorized
      if (response.status === 401 && !isRetry && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh')) {
        const refreshed = await apiClient.tryRefreshToken();
        if (refreshed) {
          return apiClient.get(endpoint, null, true);
        }
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Lỗi tải dữ liệu: mã ${response.status}`);
      }
      return data;
    } catch (error) {
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch')
      ) {
        const netErr = new Error(`Không thể kết nối tới máy chủ (${GATEWAY_URL}). Vui lòng kiểm tra dịch vụ backend.`);
        netErr.isNetworkError = true;
        throw netErr;
      }
      throw error;
    }
  },

  /**
   * Gọi API POST với Multipart FormData (Upload file/ảnh)
   */
  postFormData: async (endpoint, formData, token = null, isRetry = false) => {
    const headers = {};
    const authToken = token || (await tokenStorage.getAccessToken());
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const fullUrl = getFullUrl(endpoint);

    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (response.status === 401 && !isRetry) {
        const refreshed = await apiClient.tryRefreshToken();
        if (refreshed) {
          return apiClient.postFormData(endpoint, formData, null, true);
        }
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Lỗi tải lên: mã ${response.status}`);
      }
      return data;
    } catch (error) {
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch')
      ) {
        const netErr = new Error(`Không thể kết nối tới máy chủ (${GATEWAY_URL}). Vui lòng kiểm tra dịch vụ backend.`);
        netErr.isNetworkError = true;
        throw netErr;
      }
      throw error;
    }
  },

  /**
   * Gọi API PATCH với Multipart FormData (Cập nhật file/ảnh)
   */
  patchFormData: async (endpoint, formData, token = null, isRetry = false) => {
    const headers = {};
    const authToken = token || (await tokenStorage.getAccessToken());
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const fullUrl = getFullUrl(endpoint);

    try {
      const response = await fetch(fullUrl, {
        method: 'PATCH',
        headers,
        body: formData,
      });

      if (response.status === 401 && !isRetry) {
        const refreshed = await apiClient.tryRefreshToken();
        if (refreshed) {
          return apiClient.patchFormData(endpoint, formData, null, true);
        }
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || `Lỗi cập nhật: mã ${response.status}`);
      }
      return data;
    } catch (error) {
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch')
      ) {
        const netErr = new Error(`Không thể kết nối tới máy chủ (${GATEWAY_URL}). Vui lòng kiểm tra dịch vụ backend.`);
        netErr.isNetworkError = true;
        throw netErr;
      }
      throw error;
    }
  },

  /**
   * Cơ chế Silent Refresh: Tự động dùng Refresh Token lấy cặp Token mới
   */
  tryRefreshToken: async () => {
    if (isRefreshing) return false;

    try {
      isRefreshing = true;
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) return false;

      const refreshUrl = getFullUrl('/api/auth/refresh');
      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh token cũng hết hạn -> Xóa tokens
        await tokenStorage.clearTokens();
        return false;
      }

      const tokenData = await response.json();
      if (tokenData.accessToken) {
        await tokenStorage.saveTokens(tokenData.accessToken, tokenData.refreshToken || refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
    }
  },
};
