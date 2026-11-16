import Constants from 'expo-constants';
import { Platform } from 'react-native';

const GATEWAY_PORT = '8080';

/**
 * Tự động tìm IP máy chủ phát triển (Metro/Backend)
 * - Nếu có EXPO_PUBLIC_API_URL: ưu tiên trích xuất từ biến này
 * - Nếu chạy Expo (Go hoặc Dev Client): tự động lấy IP máy tính đang chạy Metro qua Constants
 * - Fallback Android Emulator: 10.0.2.2
 * - Fallback iOS Simulator / Web: localhost
 */
export function getHostIp() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    try {
      const match = process.env.EXPO_PUBLIC_API_URL.match(/https?:\/\/([^:/]+)/);
      if (match && match[1]) {
        return match[1];
      }
    } catch {
      // fallback to auto-detection
    }
  }

  // Tự động nhận diện IP từ Expo Metro bundler
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.expoGoConfig?.debuggerHost ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    (Constants.linkingUri ? Constants.linkingUri.replace(/^exp:\/\//, '').split('/')[0] : null);

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }

  // Giả lập Android dùng 10.0.2.2 để gọi ngược về máy host
  if (Platform.OS === 'android') {
    return '10.0.2.2';
  }

  return 'localhost';
}

/**
 * Tự động tạo URL Gateway động
 */
export function getGatewayUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  const host = getHostIp();
  return `http://${host}:${GATEWAY_PORT}`;
}
