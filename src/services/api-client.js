import { getGatewayUrl } from '../constants/api';
import { tokenStorage } from './storage/token.storage';

/**
 * API Client kết nối qua API Gateway
 * Tự động nhận diện IP máy chủ chạy Expo Metro qua Constants (để điện thoại thật truy cập được qua Wi-Fi)
 * hoặc qua biến môi trường EXPO_PUBLIC_API_URL nếu được thiết lập.
 */
const getFullUrl = (endpoint) => {
  const baseUrl = getGatewayUrl();
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${normalizedEndpoint}`;
};

/**
 * Chuyển đổi mã HTTP status hoặc lỗi kỹ thuật thành thông điệp tiếng Việt thân thiện, dễ hiểu.
 */
export function getFriendlyErrorMessage(status, serverMessage) {
  if (serverMessage && typeof serverMessage === 'string') {
    const lower = serverMessage.toLowerCase();
    if (lower.includes('network request failed') || lower.includes('failed to fetch')) {
      return 'Kết nối mạng không ổn định. Vui lòng kiểm tra Wi-Fi hoặc 4G/5G và thử lại.';
    }
    // Nếu thông báo từ máy chủ đã là tiếng Việt rõ ràng, giữ lại
    if (/[\u00C0-\u1EF9]/.test(serverMessage)) {
      return serverMessage;
    }
  }

  switch (status) {
    case 400:
      return 'Dữ liệu gửi lên chưa hợp lệ hoặc thiếu thông tin cần thiết. Vui lòng kiểm tra lại.';
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.';
    case 403:
      return 'Bạn không có quyền thực hiện thao tác này trên hệ thống.';
    case 404:
      return 'Không tìm thấy thông tin yêu cầu. Có thể nội dung đã bị gỡ bỏ.';
    case 409:
      return 'Thông tin đã tồn tại hoặc đang có xung đột với dữ liệu hiện tại.';
    case 413:
      return 'Kích thước tệp hoặc ảnh quá lớn. Vui lòng chọn tệp nhỏ hơn.';
    case 500:
      return 'Hệ thống đang gặp sự cố xử lý. Vui lòng thử lại sau ít phút.';
    case 502:
    case 503:
    case 504:
      return 'Dịch vụ máy chủ tạm thời gián đoạn. Vui lòng thử lại sau ít phút.';
    default:
      return serverMessage || 'Đã có sự cố xảy ra. Vui lòng thử lại.';
  }
}

let isRefreshing = false;

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
      const response = await fetch(fullUrl, {
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
        throw new Error(getFriendlyErrorMessage(response.status, data.message || data.detail));
      }
      return data;
    } catch (error) {
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('Failed to fetch')
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
            const errMsg = data.detail || data.message || `Lỗi tải lên: mã ${xhr.status}`;
            console.warn(`[apiClient.${method}XHR Error ${xhr.status}] ${fullUrl}:`, errMsg);
            reject(new Error(errMsg));
          }
        };

        xhr.onerror = () => {
          const netErr = new Error('Không thể kết nối tới hệ thống. Vui lòng kiểm tra kết nối mạng và thử lại.');
          netErr.isNetworkError = true;
          reject(netErr);
        };

        xhr.ontimeout = () => {
          const timeoutErr = new Error('Quá thời gian kết nối tới máy chủ (Timeout).');
          timeoutErr.isNetworkError = true;
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
