import { useState } from 'react';
import { Alert } from 'react-native';
import { driverService, AVAILABILITY_STATUS } from '@/services/driver.service';

export function useDriverAvailability(initialStatus = false) {
  const [isAvailable, setIsAvailable] = useState(initialStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const toggleAvailability = async () => {
    if (isUpdating) return;

    const targetStatus = !isAvailable;
    const statusPayload = targetStatus
      ? AVAILABILITY_STATUS.AVAILABLE
      : AVAILABILITY_STATUS.OFFLINE;

    // Optimistic Update: Chuyển đổi giao diện ngay lập tức
    setIsAvailable(targetStatus);
    setIsUpdating(true);

    try {
      await driverService.updateAvailability(statusPayload);
    } catch (error) {
      // Rollback lại trạng thái cũ nếu gặp lỗi mạng hoặc backend từ chối
      setIsAvailable(!targetStatus);
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
