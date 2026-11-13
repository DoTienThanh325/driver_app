import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './api-client';
import { processImageForUpload } from '@/utils/image-processor';
import { offlineCacheStorage } from './storage/offline-cache.storage';

const KEY_OFFLINE_SYNC_QUEUE = 'tm_offline_sync_queue';

export const SYNC_TASK_TYPE = {
  DRIVER_PROFILE_IMAGES: 'DRIVER_PROFILE_IMAGES',
  BUSINESS_INFO_UPDATE: 'BUSINESS_INFO_UPDATE',
  BANK_LINK_UPDATE: 'BANK_LINK_UPDATE',
};

const syncListeners = new Set();
const notifyListeners = (state) => {
  syncListeners.forEach((fn) => {
    try {
      fn(state);
    } catch (e) {
      console.warn('Lỗi listener offline sync:', e);
    }
  });
};

let isProcessingQueue = false;

export const offlineSyncService = {
  subscribe: (listener) => {
    syncListeners.add(listener);
    return () => syncListeners.delete(listener);
  },

  /**
   * Lấy danh sách tác vụ đang chờ đồng bộ
   */
  getQueue: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY_OFFLINE_SYNC_QUEUE);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      console.warn('Lỗi đọc offline sync queue:', err);
      return [];
    }
  },

  /**
   * Thêm hoặc thay thế tác vụ trong hàng đợi đồng bộ
   */
  enqueueTask: async (type, payload) => {
    try {
      const queue = await offlineSyncService.getQueue();
      // Nếu đã có tác vụ cùng loại, cập nhật bằng dữ liệu mới nhất
      const existingIdx = queue.findIndex((t) => t.type === type);
      const newTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type,
        payload,
        createdAt: Date.now(),
        attempts: 0,
      };

      let newQueue;
      if (existingIdx !== -1) {
        newQueue = [...queue];
        newQueue[existingIdx] = newTask;
      } else {
        newQueue = [...queue, newTask];
      }

      await AsyncStorage.setItem(KEY_OFFLINE_SYNC_QUEUE, JSON.stringify(newQueue));
      notifyListeners({ count: newQueue.length, lastEnqueued: type });
      return newTask;
    } catch (err) {
      console.warn('Lỗi khi thêm tác vụ vào sync queue:', err);
      return null;
    }
  },

  /**
   * Xóa một tác vụ theo ID
   */
  removeTask: async (taskId) => {
    try {
      const queue = await offlineSyncService.getQueue();
      const filtered = queue.filter((t) => t.id !== taskId);
      await AsyncStorage.setItem(KEY_OFFLINE_SYNC_QUEUE, JSON.stringify(filtered));
      notifyListeners({ count: filtered.length, removedId: taskId });
    } catch (err) {
      console.warn('Lỗi khi xóa tác vụ sync:', err);
    }
  },

  /**
   * Kiểm tra xem loại tác vụ này có đang chờ đồng bộ không
   */
  hasPendingTask: async (type) => {
    try {
      const queue = await offlineSyncService.getQueue();
      return queue.some((t) => t.type === type);
    } catch (err) {
      return false;
    }
  },

  /**
   * Quét và thực thi toàn bộ hàng đợi khi có mạng / người dùng kéo làm mới
   */
  processSyncQueue: async () => {
    if (isProcessingQueue) return { success: false, reason: 'ALREADY_SYNCING' };
    isProcessingQueue = true;
    notifyListeners({ isSyncing: true });

    try {
      const queue = await offlineSyncService.getQueue();
      if (!queue || queue.length === 0) {
        isProcessingQueue = false;
        notifyListeners({ isSyncing: false, count: 0 });
        return { success: true, count: 0 };
      }

      let syncedCount = 0;

      for (const task of queue) {
        try {
          if (task.type === SYNC_TASK_TYPE.DRIVER_PROFILE_IMAGES) {
            const { draftImages } = task.payload;
            if (draftImages) {
              const formData = new FormData();
              const tasks = [];
              const appendField = async (field, uri) => {
                if (!uri) return;
                const part = await processImageForUpload(uri, field);
                if (part) {
                  formData.append(field, {
                    uri: part.uri,
                    name: part.name,
                    type: 'image/jpeg',
                  });
                }
              };

              Object.entries(draftImages).forEach(([key, uri]) => {
                if (uri) tasks.push(appendField(key, uri));
              });

              await Promise.all(tasks);
              await apiClient.sendMultipartXHR('/api/drivers/registration', formData, 'PATCH');
            }
            await offlineSyncService.removeTask(task.id);
            syncedCount++;
          } else if (task.type === SYNC_TASK_TYPE.BUSINESS_INFO_UPDATE) {
            const { restaurantId, data } = task.payload;
            await apiClient.patch(`/api/bookings/restaurants/${restaurantId}`, data);
            await offlineSyncService.removeTask(task.id);
            syncedCount++;
          } else if (task.type === SYNC_TASK_TYPE.BANK_LINK_UPDATE) {
            const { isEditing, payload } = task.payload;
            const endpoint = '/api/payments/driver-payment-info';
            if (isEditing) {
              await apiClient.patch(endpoint, payload);
            } else {
              await apiClient.post(endpoint, payload);
            }
            await offlineSyncService.removeTask(task.id);
            syncedCount++;
          }
        } catch (taskErr) {
          console.warn(`Lỗi khi sync task ${task.type}:`, taskErr?.message);
          // Nếu gặp lỗi mạng thì dừng vòng lặp để thử lại lần sau
          if (taskErr?.isNetworkError || taskErr?.message?.includes('kết nối')) {
            break;
          }
          // Nếu là lỗi nghiệp vụ (ví dụ validation 400), tăng attempts hoặc loại bỏ sau 5 lần
          task.attempts = (task.attempts || 0) + 1;
          if (task.attempts >= 5) {
            await offlineSyncService.removeTask(task.id);
          }
        }
      }

      return { success: true, syncedCount };
    } finally {
      isProcessingQueue = false;
      const currentQueue = await offlineSyncService.getQueue();
      notifyListeners({ isSyncing: false, count: currentQueue.length });
    }
  },
};
