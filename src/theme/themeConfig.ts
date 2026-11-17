import type { ThemeConfig } from 'antd';

/**
 * Bảng màu đồng bộ với ứng dụng mobile (T&M Transit&Meal)
 */
export const MOBILE_COLORS = {
  primary: '#00B5B8',
  primaryHover: '#009DA0',
  primaryActive: '#00838F',
  primaryLight: '#E6F8F8',
  primaryBorder: '#B2ECEC',
  background: '#F4F6F8',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textSecondary: '#676767',
  success: '#10B981',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  error: '#EE2737',
  errorBg: '#FDECEE',
};

export const adminTheme: ThemeConfig = {
  token: {
    colorPrimary: MOBILE_COLORS.primary,
    colorSuccess: MOBILE_COLORS.success,
    colorWarning: MOBILE_COLORS.warning,
    colorError: MOBILE_COLORS.error,
    colorInfo: MOBILE_COLORS.primary,
    colorBgLayout: MOBILE_COLORS.background,
    colorBgContainer: MOBILE_COLORS.surface,
    colorText: MOBILE_COLORS.text,
    colorTextSecondary: MOBILE_COLORS.textSecondary,
    colorBorderSecondary: MOBILE_COLORS.border,
    borderRadius: 8,
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  },
  components: {
    Button: {
      primaryShadow: '0 2px 6px rgba(0, 181, 184, 0.25)',
    },
    Menu: {
      itemSelectedBg: MOBILE_COLORS.primaryLight,
      itemSelectedColor: MOBILE_COLORS.primaryActive,
    },
    Table: {
      headerBg: '#F9FAFB',
    },
  },
};
