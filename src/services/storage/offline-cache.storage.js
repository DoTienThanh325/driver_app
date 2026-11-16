import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_CACHE_DRIVER_PROFILE = 'tm_cache_driver_profile';
const KEY_CACHE_BUSINESS_PROFILE = 'tm_cache_business_profile';
const KEY_CACHE_BANK_LINK = 'tm_cache_bank_link';
const KEY_CACHE_RESTAURANT_FOODS = 'tm_cache_restaurant_foods';
const KEY_CACHE_RESTAURANT_VOUCHERS = 'tm_cache_restaurant_vouchers';
const KEY_CACHE_DRIVER_TRIP_HISTORY = 'tm_cache_driver_trip_history';
const KEY_CACHE_TRIP_REVIEWS = 'tm_cache_trip_reviews';

/**
 * Quản lý bộ nhớ đệm (Cache) ngoại tuyến cho 3 phân hệ:
 * - Hồ sơ tài xế
 * - Hồ sơ kinh doanh
 * - Ngân hàng liên kết
 */
export const offlineCacheStorage = {
  // --- 1. Hồ sơ tài xế ---
  saveDriverProfile: async (data) => {
    try {
      if (!data) return;
      const payload = {
        data,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(KEY_CACHE_DRIVER_PROFILE, JSON.stringify(payload));
    } catch (err) {
      console.warn('Lỗi khi lưu cache driver profile:', err);
    }
  },

  getDriverProfile: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY_CACHE_DRIVER_PROFILE);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data || null;
    } catch (err) {
      console.warn('Lỗi khi đọc cache driver profile:', err);
      return null;
    }
  },

  // --- 2. Hồ sơ kinh doanh ---
  saveBusinessProfile: async (data) => {
    try {
      if (!data) return;
      const payload = {
        data,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(KEY_CACHE_BUSINESS_PROFILE, JSON.stringify(payload));
    } catch (err) {
      console.warn('Lỗi khi lưu cache business profile:', err);
    }
  },

  getBusinessProfile: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY_CACHE_BUSINESS_PROFILE);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data || null;
    } catch (err) {
      console.warn('Lỗi khi đọc cache business profile:', err);
      return null;
    }
  },

  // --- 3. Ngân hàng liên kết ---
  saveBankLink: async (data) => {
    try {
      if (!data) return;
      const payload = {
        data,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(KEY_CACHE_BANK_LINK, JSON.stringify(payload));
    } catch (err) {
      console.warn('Lỗi khi lưu cache bank link:', err);
    }
  },

  getBankLink: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY_CACHE_BANK_LINK);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data || null;
    } catch (err) {
      console.warn('Lỗi khi đọc cache bank link:', err);
      return null;
    }
  },

  // --- 4. Danh sách Món ăn của Nhà hàng (Lưu riêng theo từng nhà hàng) ---
  saveRestaurantFoods: async (data, restaurantId = 'default') => {
    try {
      if (!data) return;
      const key = `${KEY_CACHE_RESTAURANT_FOODS}_${restaurantId || 'default'}`;
      const payload = {
        restaurantId,
        data,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(payload));
    } catch (err) {
      console.warn('Lỗi khi lưu cache món ăn nhà hàng:', err);
    }
  },

  getRestaurantFoods: async (restaurantId = 'default') => {
    try {
      const key = `${KEY_CACHE_RESTAURANT_FOODS}_${restaurantId || 'default'}`;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data || null;
    } catch (err) {
      console.warn('Lỗi khi đọc cache món ăn nhà hàng:', err);
      return null;
    }
  },

  // --- 5. Danh sách Voucher của Nhà hàng (Lưu riêng theo từng nhà hàng, providerType là RESTAURANT) ---
  saveRestaurantVouchers: async (data, restaurantId = 'default') => {
    try {
      if (!data) return;
      const key = `${KEY_CACHE_RESTAURANT_VOUCHERS}_${restaurantId || 'default'}`;
      const payload = {
        restaurantId,
        data,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(payload));
    } catch (err) {
      console.warn('Lỗi khi lưu cache voucher nhà hàng:', err);
    }
  },

  getRestaurantVouchers: async (restaurantId = 'default') => {
    try {
      const key = `${KEY_CACHE_RESTAURANT_VOUCHERS}_${restaurantId || 'default'}`;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data || null;
    } catch (err) {
      console.warn('Lỗi khi đọc cache voucher nhà hàng:', err);
      return null;
    }
  },

  // --- 6. Lịch sử Cuốc xe của Tài xế (Đã thực hiện: COMPLETED, CANCELLED) ---
  saveDriverTripHistory: async (data) => {
    try {
      if (!data) return;
      const payload = {
        data,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(KEY_CACHE_DRIVER_TRIP_HISTORY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Lỗi khi lưu cache lịch sử cuốc xe tài xế:', err);
    }
  },

  getDriverTripHistory: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY_CACHE_DRIVER_TRIP_HISTORY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data || null;
    } catch (err) {
      console.warn('Lỗi khi đọc cache lịch sử cuốc xe tài xế:', err);
      return null;
    }
  },

  // --- 7. Đánh giá / Bình luận của từng cuốc xe ---
  saveTripReviews: async (tripId, data) => {
    try {
      if (!data) return;
      const key = `${KEY_CACHE_TRIP_REVIEWS}_${tripId || 'general'}`;
      const payload = {
        tripId,
        data,
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem(key, JSON.stringify(payload));
    } catch (err) {
      console.warn('Lỗi khi lưu cache đánh giá cuốc xe:', err);
    }
  },

  getTripReviews: async (tripId) => {
    try {
      const key = `${KEY_CACHE_TRIP_REVIEWS}_${tripId || 'general'}`;
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed.data || null;
    } catch (err) {
      console.warn('Lỗi khi đọc cache đánh giá cuốc xe:', err);
      return null;
    }
  },

  // Xóa toàn bộ cache khi đăng xuất
  clearAllCache: async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const keysToRemove = allKeys.filter(
        (k) =>
          k === KEY_CACHE_DRIVER_PROFILE ||
          k === KEY_CACHE_BUSINESS_PROFILE ||
          k === KEY_CACHE_BANK_LINK ||
          k === KEY_CACHE_DRIVER_TRIP_HISTORY ||
          k.startsWith(KEY_CACHE_RESTAURANT_FOODS) ||
          k.startsWith(KEY_CACHE_RESTAURANT_VOUCHERS) ||
          k.startsWith(KEY_CACHE_TRIP_REVIEWS)
      );
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
    } catch (err) {
      console.warn('Lỗi khi xóa offline cache:', err);
    }
  },
};
