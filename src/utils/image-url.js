/**
 * Chuyển đổi và chuẩn hóa URL ảnh từ Backend / MinIO
 * Thay thế localhost:9000, 127.0.0.1:9000 hoặc minio:9000 bằng IP thật của máy chủ (từ EXPO_PUBLIC_API_URL)
 * để thiết bị di động / Expo Go có thể tải được ảnh.
 */
export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    const rawGateway = process.env.EXPO_PUBLIC_API_URL || '';
    const gatewayMatch = rawGateway.match(/https?:\/\/([^:/]+)/);
    const hostIp = gatewayMatch ? gatewayMatch[1] : '192.168.11.199';

    let cleanUrl = url.trim();

    // Hỗ trợ cả định dạng URI s3:// (ví dụ: s3://business-documents/... hoặc s3://driver-documents/...)
    if (cleanUrl.startsWith('s3://')) {
      const s3Path = cleanUrl.replace(/^s3:\/\//, '');
      cleanUrl = `http://${hostIp}:9000/${s3Path}`;
    }

    // Nếu URL chứa query params presigned ký cho localhost/minio, loại bỏ chữ ký query params để dùng direct download URL
    // tránh lỗi SignatureDoesNotMatch (HTTP 403) của AWS SigV4 khi Host header bị thay đổi từ localhost sang IP máy chủ.
    if (
      cleanUrl.includes('localhost:9000') ||
      cleanUrl.includes('127.0.0.1:9000') ||
      cleanUrl.includes('minio:9000') ||
      cleanUrl.includes('/driver-documents/') ||
      cleanUrl.includes('/business-documents/')
    ) {
      cleanUrl = cleanUrl.split('?')[0];
    }

    // Thay thế localhost / 127.0.0.1 / minio sang host IP (hỗ trợ mọi cổng)
    let normalized = cleanUrl
      .replace(/https?:\/\/localhost:9000/gi, `http://${hostIp}:9000`)
      .replace(/https?:\/\/127\.0\.0\.1:9000/gi, `http://${hostIp}:9000`)
      .replace(/https?:\/\/minio:9000/gi, `http://${hostIp}:9000`)
      .replace(/https?:\/\/localhost(?::(\d+))?/gi, (match, port) => `http://${hostIp}${port ? `:${port}` : ''}`)
      .replace(/https?:\/\/127\.0\.0\.1(?::(\d+))?/gi, (match, port) => `http://${hostIp}${port ? `:${port}` : ''}`)
      .replace(/https?:\/\/minio(?::(\d+))?/gi, (match, port) => `http://${hostIp}${port ? `:${port}` : ''}`);

    return normalized;
  } catch (err) {
    return url;
  }
}
