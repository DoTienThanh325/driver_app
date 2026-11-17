import dayjs from 'dayjs';
import { AxiosError } from 'axios';
import type { ReportType } from '../types';

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD/MM/YYYY HH:mm') : value;
}

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  DRIVER_LATE: 'Tài xế đến trễ',
  RECKLESS_DRIVING: 'Lái xe ẩu / nguy hiểm',
  WRONG_ROUTE: 'Đi sai lộ trình',
  UNPROFESSIONAL_BEHAVIOR: 'Thái độ thiếu chuyên nghiệp',
  VEHICLE_MISMATCH: 'Xe không đúng thông tin',
  OVERCHARGING: 'Thu quá cước phí',
  DRIVER_NO_SHOW: 'Tài xế không đến',
  CUSTOMER_NO_SHOW: 'Khách hàng không đến',
};

export function getReportTypeLabel(type: ReportType): string {
  return REPORT_TYPE_LABELS[type] ?? type;
}

export function extractErrorMessage(error: unknown, fallback = 'Đã xảy ra lỗi'): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as { message?: string; Message?: string; error?: string } | undefined;
    if (data?.message) return data.message;
    if (data?.Message) return data.Message;
    if (data?.error) return data.error;
    if (error.response?.status === 401) return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn';
    if (error.response?.status === 403) return 'Bạn không có quyền thực hiện thao tác này';
    if (error.response?.status === 429) return 'Thao tác quá nhanh, vui lòng thử lại sau';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
