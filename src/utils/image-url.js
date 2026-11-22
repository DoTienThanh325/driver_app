import { getHostIp } from '../constants/api';

/**
 * URL ảnh món ăn mặc định chất lượng cao từ CDN công cộng khi chưa có ảnh hoặc tải ảnh lỗi
 */
export const DEFAULT_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

/**
 * Kiểm tra xem URL có phải là URL web ngoài hay không (Unsplash, Cloudinary, Imgur, CDN công cộng,...)
 */
export function isExternalUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();

  // Dạng base64 data url
  if (clean.startsWith('data:image/')) return true;

  // Dạng protocol-relative //domain.com/...
  if (clean.startsWith('//')) return true;

  // Dạng http hoặc https
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    // Nếu KHÔNG chứa các host cục bộ của MinIO / Backend nội bộ
    const isInternal =
      clean.includes('localhost') ||
      clean.includes('127.0.0.1') ||
      clean.includes('minio:9000') ||
      clean.includes('10.0.2.2:9000') ||
      clean.includes('/driver-documents/') ||
      clean.includes('/business-documents/');
    return !isInternal;
  }

  return false;
}

/**
 * Chuyển đổi và chuẩn hóa URL ảnh đa nguồn (External CDN, MinIO, S3 URI, Localhost)
 * - Đối với URL ngoài (Unsplash, Imgur, CDN,...): Giữ nguyên 100% URL và query params
 * - Đối với MinIO S3 nội bộ: Tự động đổi localhost/minio sang IP thật của máy chủ Metro
 */
export function normalizeImageUrl(url) {
  if (!url || typeof url !== 'string') return null;

  try {
    let cleanUrl = url.trim();
    if (!cleanUrl) return null;

    // 1. Hỗ trợ URL ngoài (External Web URL) - không can thiệp, giữ nguyên query params
    if (isExternalUrl(cleanUrl)) {
      if (cleanUrl.startsWith('//')) {
        return `https:${cleanUrl}`;
      }
      return cleanUrl;
    }

    const hostIp = getHostIp();

    // 2. Hỗ trợ URI định dạng s3:// của MinIO
    if (cleanUrl.startsWith('s3://')) {
      const s3Path = cleanUrl.replace(/^s3:\/\//, '');
      return `http://${hostIp}:9000/${s3Path}`;
    }

    // 3. Hỗ trợ đường dẫn tương đối của bucket MinIO (/business-documents/... hoặc /driver-documents/...)
    if (cleanUrl.startsWith('/driver-documents/') || cleanUrl.startsWith('/business-documents/')) {
      return `http://${hostIp}:9000${cleanUrl}`;
    }

    // 4. Nếu URL chứa query params presigned ký cho localhost/minio, loại bỏ chữ ký query params để dùng direct download URL
    // tránh lỗi SignatureDoesNotMatch (HTTP 403) của AWS SigV4 khi Host header bị thay đổi từ localhost sang IP máy chủ.
    if (
      cleanUrl.includes('localhost:9000') ||
      cleanUrl.includes('127.0.0.1:9000') ||
      cleanUrl.includes('minio:9000') ||
      cleanUrl.includes('10.0.2.2:9000') ||
      cleanUrl.includes('/driver-documents/') ||
      cleanUrl.includes('/business-documents/')
    ) {
      cleanUrl = cleanUrl.split('?')[0];
    }

    // 5. Thay thế localhost / 127.0.0.1 / minio / mọi IP trỏ cổng 9000 sang host IP của máy chủ Metro
    let normalized = cleanUrl
      .replace(/https?:\/\/[^/]+:9000/gi, `http://${hostIp}:9000`)
      .replace(/https?:\/\/localhost(?::(\d+))?/gi, (match, port) => `http://${hostIp}${port ? `:${port}` : ''}`)
      .replace(/https?:\/\/127\.0\.0\.1(?::(\d+))?/gi, (match, port) => `http://${hostIp}${port ? `:${port}` : ''}`)
      .replace(/https?:\/\/minio(?::(\d+))?/gi, (match, port) => `http://${hostIp}${port ? `:${port}` : ''}`);

    return normalized;
  } catch (err) {
    return url;
  }
}
