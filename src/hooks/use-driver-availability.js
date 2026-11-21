import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { driverService, AVAILABILITY_STATUS } from '@/services/driver.service';

const DRIVER_AVAILABILITY_STORAGE_KEY = 'tm_driver_is_online';

export function useDriverAvailability(initialStatus = false) {
  const [isAvailable, setIsAvailableState] = useState(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  // Đọc trạng thái đã lưu khi mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(DRIVER_AVAILABILITY_STORAGE_KEY);
        if (saved !== null) {
          setIsAvailableState(saved === 'true');
        }
      } catch (err) {
        console.warn('Lỗi đọc trạng thái tài xế từ AsyncStorage:', err);
      }
    })();
  }, []);

  const setIsAvailable = useCallback(async (value) => {
    setIsAvailableState(value);
    try {
      await AsyncStorage.setItem(DRIVER_AVAILABILITY_STORAGE_KEY, String(value));
    } catch {
      // Bỏ qua lỗi lưu
    }
  }, []);

  const toggleAvailability = async () => {
    if (isUpdating) return;

    const targetStatus = !isAvailable;
    const statusPayload = targetStatus
      ? AVAILABILITY_STATUS.AVAILABLE
      : AVAILABILITY_STATUS.OFFLINE;

    // Optimistic Update: Chuyển đổi giao diện ngay lập tức & lưu cache
    setIsAvailableState(targetStatus);
    try {
      await AsyncStorage.setItem(DRIVER_AVAILABILITY_STORAGE_KEY, String(targetStatus));
    } catch {}

    setIsUpdating(true);

    try {
      await driverService.updateAvailability(statusPayload);
    } catch (error) {
      // Rollback lại trạng thái cũ nếu gặp lỗi mạng hoặc backend từ chối
      setIsAvailableState(!targetStatus);
      try {
        await AsyncStorage.setItem(DRIVER_AVAILABILITY_STORAGE_KEY, String(!targetStatus));
      } catch {}

      Alert.alert(
        'Lỗi cập nhật',
        error.message || 'Không thể cập nhật trạng thái sẵn sàng nhận chuyến. Vui lòng thử lại sau.'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    isAvailable,
    setIsAvailable,
    isUpdating,
    toggleAvailability,
  };
}
