import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Cấu hình hành vi hiển thị khi ứng dụng đang mở (Foreground):
 * Cho phép hiển thị banner, phát âm thanh và rung chuông
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  /**
   * Khởi tạo quyền thông báo và tạo Channel cho Android
   */
  init: async () => {
    try {
      if (Platform.OS === 'web') return false;

      // 1. Kiểm tra & xin quyền thông báo
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      // 2. Tạo Notification Channel với mức ưu tiên cao nhất trên Android
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('otp_channel', {
          name: 'Mã xác thực OTP',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00B5B8',
          sound: 'default',
        });
      }

      return finalStatus === 'granted';
    } catch (error) {
      console.warn('Lỗi khi khởi tạo Notification:', error);
      return false;
    }
  },

  /**
   * Bắn Local Notification thông báo mã OTP ngay lập tức
   * @param {string|number} otpCode - Mã OTP 6 chữ số
   */
  sendOtpLocalNotification: async (otpCode) => {
    try {
      if (!otpCode || Platform.OS === 'web') return;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💬 Transit&Meal - Mã xác thực OTP',
          body: `Mã OTP của bạn là: ${otpCode}. Mã có hiệu lực trong 60 giây. Không chia sẻ mã này cho bất kỳ ai.`,
          data: {
            type: 'OTP_VERIFICATION',
            otp: String(otpCode),
          },
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: 'otp_channel' } : {}),
        },
        trigger: null, // Gửi ngay lập tức
      });
    } catch (error) {
      console.warn('Lỗi khi gửi Local Notification OTP:', error);
    }
  },
};
