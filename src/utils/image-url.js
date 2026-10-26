/**
 * Chuyển đổi và chuẩn hóa URL ảnh từ Backend / MinIO
 * Thay thế localhost:9000, 127.0.0.1:9000 hoặc minio:9000 bằng IP thật của máy chủ (từ EXPO_PUBLIC_API_URL)
 * để thiết bị di động / Expo Go có thể tải được ảnh.
 */
const RAW_GATEWAY_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.11.199:8080';

export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const gatewayMatch = RAW_GATEWAY_URL.match(/https?:\/\/([^:/]+)/);
    const hostIp = gatewayMatch ? gatewayMatch[1] : '192.168.11.199';

    // Nếu URL chứa query params presigned ký cho localhost/minio, loại bỏ chữ ký query params để dùng direct download URL
    // tránh lỗi SignatureDoesNotMatch (HTTP 403) của AWS SigV4 khi Host header bị thay đổi.
    let cleanUrl = url;
    if (
      url.includes('localhost:9000') ||
      url.includes('127.0.0.1:9000') ||
      url.includes('minio:9000') ||
      url.includes('/driver-documents/')
    ) {
      cleanUrl = url.split('?')[0];
    }

    let normalized = cleanUrl
      .replace(/http:\/\/localhost:9000/g, `http://${hostIp}:9000`)
      .replace(/https:\/\/localhost:9000/g, `http://${hostIp}:9000`)
      .replace(/http:\/\/127\.0\.0\.1:9000/g, `http://${hostIp}:9000`)
      .replace(/https:\/\/127\.0\.0\.1:9000/g, `http://${hostIp}:9000`)
      .replace(/http:\/\/minio:9000/g, `http://${hostIp}:9000`);

    return normalized;
  } catch (err) {
    return url;
  }
}
