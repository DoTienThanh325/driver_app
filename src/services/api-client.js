import { getFriendlyErrorMessage } from '../utils/error-message';
import { getGatewayUrl } from '../constants/api';
import { tokenStorage } from './storage/token.storage';
import { createSessionRefresher } from './refresh-session';

/**
 * API Client kết nối qua API Gateway
 * Tự động nhận diện IP máy chủ chạy Expo Metro qua Constants (để điện thoại thật truy cập được qua Wi-Fi)
 * hoặc qua biến môi trường EXPO_PUBLIC_API_URL nếu được thiết lập.
 */
const fetchWithTimeout = async (url, options = {}, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err) {
    if (
      err.name === 'AbortError' ||
      err.message?.toLowerCase().includes('cancel') ||
      err.message?.toLowerCase().includes('abort')
    ) {
      const timeoutErr = new Error('Hệ thống phản hồi chậm. Vui lòng thử lại.');
      timeoutErr.isNetworkError = true;
      timeoutErr.isTimeout = true;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};
const getFullUrl = (endpoint) => {
  const baseUrl = getGatewayUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${normalizedEndpoint}`;
};

export { getFriendlyErrorMessage };

function createHttpError(status, data, fallback) {
  const serverMessage = data?.message || data?.detail || '';
  const error = new Error(getFriendlyErrorMessage(status, serverMessage, fallback));
  error.status = status;
  error.code = data?.code || data?.errorCode;
  error.serverMessage = serverMessage;
  console.info(`[apiClient] HTTP ${status}`);
  return error;
}

const refreshSession = createSessionRefresher({
  tokenStorage,
  request: (refreshToken) => fetch(getFullUrl('/api/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }),
});

export const apiClient = {
  getGatewayUrl,
  getFriendlyErrorMessage,
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
      const response = await fetchWithTimeout(fullUrl, {
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
        throw createHttpError(response.status, data, 'Không thể gửi yêu cầu. Vui lòng thử lại.');
      }

      return data;
    } catch (error) {
      if (error.status || error.isNetworkError) {
        throw error;
      }
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.toLowerCase().includes('cancel')
      ) {
        const netErr = new Error('Không thể kết nối tới hệ thống. Vui lòng kiểm tra kết nối mạng và thử lại.');
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
      const response = await fetchWithTimeout(fullUrl, {
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
        throw createHttpError(response.status, data, 'Không thể lưu thay đổi. Vui lòng thử lại.');
      }

      return data;
    } catch (error) {
      if (error.status || error.isNetworkError) {
        throw error;
      }
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.toLowerCase().includes('cancel')
      ) {
        const netErr = new Error('Không thể kết nối tới hệ thống. Vui lòng kiểm tra kết nối mạng và thử lại.');
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
      const response = await fetchWithTimeout(fullUrl, {
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
        throw createHttpError(response.status, data, 'Không thể tải dữ liệu. Vui lòng thử lại.');
      }
      return data;
    } catch (error) {
      if (error.status || error.isNetworkError) {
        throw error;
      }
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.toLowerCase().includes('cancel')
      ) {
        const netErr = new Error('Không thể kết nối tới hệ thống. Vui lòng kiểm tra kết nối mạng và thử lại.');
        netErr.isNetworkError = true;
        throw netErr;
      }
      throw error;
    }
  },

  /**
   * Gọi API DELETE
   */
  delete: async (endpoint, token = null, isRetry = false) => {
    const headers = {
      'Content-Type': 'application/json',
    };

    const authToken = token || (await tokenStorage.getAccessToken());
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const fullUrl = getFullUrl(endpoint);

    try {
      const response = await fetchWithTimeout(fullUrl, {
        method: 'DELETE',
        headers,
      });

      if (response.status === 401 && !isRetry) {
        const refreshed = await apiClient.tryRefreshToken();
        if (refreshed) {
          return apiClient.delete(endpoint, null, true);
        }
      }

      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw createHttpError(response.status, data, 'Không thể xóa dữ liệu. Vui lòng thử lại.');
      }
      return data;
    } catch (error) {
      if (error.status || error.isNetworkError) {
        throw error;
      }
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch') ||
        error.message?.toLowerCase().includes('cancel')
      ) {
        const netErr = new Error('Kết nối mạng không ổn định. Vui lòng kiểm tra Wi-Fi hoặc 4G/5G và thử lại.');
        netErr.isNetworkError = true;
        throw netErr;
      }
      throw error;
    }
  },

  /**
   * Helper gửi Multipart FormData bằng XMLHttpRequest thuần của React Native.
   * Giải quyết triệt để lỗi 'Unsupported FormDataPart implementation' do Expo SDK 58 Winter Fetch gây ra.
   */
  sendMultipartXHR: (endpoint, formData, method = 'POST', token = null, isRetry = false) => {
    return new Promise(async (resolve, reject) => {
      try {
        const authToken = token || (await tokenStorage.getAccessToken());
        const fullUrl = getFullUrl(endpoint);

        const xhr = new XMLHttpRequest();
        xhr.open(method, fullUrl);

        if (authToken) {
          xhr.setRequestHeader('Authorization', `Bearer ${authToken}`);
        }

        xhr.onload = async () => {
          if (xhr.status === 401 && !isRetry) {
            const refreshed = await apiClient.tryRefreshToken();
            if (refreshed) {
              try {
                const retryRes = await apiClient.sendMultipartXHR(endpoint, formData, method, null, true);
                return resolve(retryRes);
              } catch (retryErr) {
                return reject(retryErr);
              }
            }
          }

          let data = {};
          try {
            data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
          } catch (e) {
            // Not a JSON response
          }

          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(createHttpError(xhr.status, data, 'Không thể tải tệp lên. Vui lòng thử lại.'));
          }
        };

        xhr.onerror = () => {
          const netErr = new Error('Không thể kết nối tới hệ thống. Vui lòng kiểm tra kết nối mạng và thử lại.');
          netErr.isNetworkError = true;
          reject(netErr);
        };

        xhr.ontimeout = () => {
          const timeoutErr = new Error('Hệ thống phản hồi chậm. Vui lòng thử lại.');
          timeoutErr.isNetworkError = true;
          timeoutErr.isTimeout = true;
          reject(timeoutErr);
        };

        xhr.send(formData);
      } catch (err) {
        reject(err);
      }
    });
  },

  /**
   * Gọi API POST với Multipart FormData (Upload file/ảnh)
   */
  postFormData: async (endpoint, formData, token = null, isRetry = false) => {
    return apiClient.sendMultipartXHR(endpoint, formData, 'POST', token, isRetry);
  },

  /**
   * Gọi API PATCH với Multipart FormData (Cập nhật file/ảnh)
   */
  patchFormData: async (endpoint, formData, token = null, isRetry = false) => {
    return apiClient.sendMultipartXHR(endpoint, formData, 'PATCH', token, isRetry);
  },

  /**
   * Cơ chế Silent Refresh: Tự động dùng Refresh Token lấy cặp Token mới
   */
  tryRefreshToken: refreshSession,
};
