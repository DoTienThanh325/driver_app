const defaultMessage = 'Đã có sự cố xảy ra. Vui lòng thử lại.';

export function getFriendlyErrorMessage(status, detail, fallback = defaultMessage) {
  const message = typeof detail === 'string' ? detail.trim() : '';

  if (status >= 500) return 'Dịch vụ đang tạm gián đoạn. Vui lòng thử lại sau.';
  switch (status) {
    case 401:
      return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 403:
      return 'Tài khoản của bạn chưa có quyền thực hiện thao tác này.';
    case 413:
      return 'Tệp hoặc ảnh quá lớn. Vui lòng chọn tệp có dung lượng nhỏ hơn.';
    case 429:
      return 'Bạn đã thao tác quá nhiều lần. Vui lòng đợi một lúc rồi thử lại.';
  }

  if (/đã được tài xế khác nhận/i.test(message)) return 'Cuốc xe này đã được tài xế khác nhận.';
  if (/dang co chuyen di tim tai xe|đang có chuyến đi tìm tài xế/i.test(message)) {
    return 'Bạn đang có chuyến tìm tài xế. Vui lòng kiểm tra chuyến hiện tại.';
  }
  if (/chuyến đi đã kết thúc/i.test(message)) return 'Chuyến đi đã kết thúc. Vui lòng tải lại thông tin chuyến.';
  if (/already claimed|đã nhận (ưu đãi|voucher)/i.test(message)) return 'Bạn đã nhận ưu đãi này rồi.';

  // Giữ hướng dẫn nghiệp vụ tiếng Việt khi không kèm chi tiết kỹ thuật.
  const hasTechnicalDetail = /\b[45]\d{2}\b|https?:\/\/|\/api\/|\b(?:HTTP|Exception|stack trace|SQLSTATE|status code|unauthorized|forbidden|bad request|internal server error)\b|(?:java|org\.springframework)\.|[{}<>\r\n]/i;
  if (message.length <= 250 && /[\u00C0-\u1EF9]/.test(message) && !hasTechnicalDetail.test(message)) {
    return message;
  }

  switch (status) {
    case 400:
    case 422:
      return fallback === defaultMessage ? 'Vui lòng kiểm tra lại thông tin đã nhập.' : fallback;
    case 404:
      return fallback === defaultMessage ? 'Không tìm thấy thông tin yêu cầu.' : fallback;
    case 409:
      return fallback === defaultMessage ? 'Thông tin đã thay đổi. Vui lòng tải lại và thử lại.' : fallback;
    default:
      return fallback;
  }
}

export function getUserErrorMessage(error, fallback, statusMessages = {}) {
  if (error?.isTimeout) return 'Hệ thống phản hồi chậm. Vui lòng thử lại.';
  if (error?.isNetworkError) return 'Không thể kết nối. Vui lòng kiểm tra mạng rồi thử lại.';

  const status = error?.status ?? error?.response?.status;
  return statusMessages[status] ?? getFriendlyErrorMessage(
    status,
    error?.serverMessage ?? error?.response?.data?.detail ?? error?.response?.data?.message ?? error?.message,
    fallback,
  );
}
