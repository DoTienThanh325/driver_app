import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';
import { formatNotificationTimestamp } from '../utils/notification-state';

// Android retains the old silent channel's behavior after an app update.
const INBOX_CHANNEL = 'app_inbox_alerts';
const OTP_CHANNEL = 'otp_channel';
let inboxChannelSetup;

function ensureInboxChannel() {
  if (Platform.OS !== 'android') return;

  inboxChannelSetup ??= Notifications.setNotificationChannelAsync(INBOX_CHANNEL, {
    name: 'Thông báo ứng dụng',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    enableVibrate: true,
  }).catch((error) => {
    inboxChannelSetup = undefined;
    throw error;
  });
  return inboxChannelSetup;
}

function canPresentNotification(permission) {
  return permission.granted ||
    (Platform.OS === 'ios' && permission.ios?.allowsDisplayInNotificationCenter === true);
}

/** @param {import('expo-notifications').NotificationContentInput} content */
function showLocalNotification(content, androidChannel) {
  return Notifications.scheduleNotificationAsync({
    content,
    trigger: Platform.OS === 'android' ? { channelId: androidChannel } : null,
  });
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const notificationService = {
  showInNotificationCenter: async (item, isCurrent) => {
    if (Platform.OS === 'web') return;
    try {
      const permission = await Notifications.getPermissionsAsync();
      if (!canPresentNotification(permission)) return;

      await ensureInboxChannel();
      if (!isCurrent()) return;

      const timestamp = formatNotificationTimestamp(item.timestamp);
      await showLocalNotification({
        title: item.title,
        body: [item.content, timestamp].filter(Boolean).join('\n'),
        data: { source: 'app_inbox', id: item.id, timestamp: item.timestamp },
        sound: 'default',
      }, INBOX_CHANNEL);
    } catch (error) {
      console.warn('Không thể hiển thị thông báo trong trung tâm thông báo:', error);
    }
  },

  /**
   * Khởi tạo quyền thông báo và tạo Channel cho Android
   */
  init: async () => {
    try {
      if (Platform.OS === 'web') return false;

      await ensureInboxChannel();
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(OTP_CHANNEL, {
          name: 'Mã xác thực OTP',
          importance: AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#00B5B8',
          sound: 'default',
        });
      }

      const permission = await Notifications.getPermissionsAsync();
      if (canPresentNotification(permission)) return true;
      if (!permission.canAskAgain) return false;

      const requested = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true },
      });
      return canPresentNotification(requested);
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

      await showLocalNotification({
        title: '💬 Transit&Meal - Mã xác thực OTP',
        body: `Mã OTP của bạn là: ${otpCode}. Mã có hiệu lực trong 60 giây. Không chia sẻ mã này cho bất kỳ ai.`,
        data: {
          type: 'OTP_VERIFICATION',
          otp: String(otpCode),
        },
        sound: 'default',
      }, OTP_CHANNEL);
    } catch (error) {
      console.warn('Lỗi khi gửi Local Notification OTP:', error);
    }
  },
};
