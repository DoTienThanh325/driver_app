import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Nén và chuẩn hóa ảnh trước khi đưa vào FormData upload lên Backend / MinIO.
 * - Giới hạn chiều rộng tối đa (1400px), tự động giữ nguyên tỉ lệ gốc.
 * - Nén chất lượng 0.75 để giảm dung lượng ảnh từ 10-20MB xuống < 1MB (đáp ứng trần MAX_IMAGE_SIZE của Backend).
 * - Ép định dạng xuất ra luôn là JPEG (giải quyết triệt để lỗi định dạng HEIC/HEIF trên iOS).
 *
 * @param {string} uri - URI ảnh từ ImagePicker hoặc Camera
 * @param {string} fieldName - Tên trường ảnh (vd: idCardFront, plate, ...)
 * @returns {Promise<{ uri: string, name: string, type: string }>}
 */
export async function processImageForUpload(uri, fieldName = 'image') {
  if (!uri) return null;

  try {
    const manipResult = await manipulateAsync(
      uri,
      [{ resize: { width: 1400 } }],
      { compress: 0.75, format: SaveFormat.JPEG }
    );

    const filename = `${fieldName}_${Date.now()}.jpg`;

    return {
      uri: manipResult.uri,
      name: filename,
      type: 'image/jpeg',
    };
  } catch (err) {
    console.warn('Lỗi khi nén ảnh qua ImageManipulator, sử dụng uri gốc fallback:', err);
    const rawFilename = uri.split('/').pop() || `${fieldName}.jpg`;
    return {
      uri,
      name: rawFilename.includes('.') ? rawFilename : `${fieldName}.jpg`,
      type: 'image/jpeg',
    };
  }
}
