import '@/global.css';
import { Platform } from 'react-native';

/**
 * Hệ thống màu sắc phong cách Grab Driver
 * Primary: Xanh lá Grab (#00B14F), Dark Primary (#008B3D)
 */
export const Colors = {
  teal: {
    primary: '#00B5B8',
    footer: '#00ADB0',
    accent: '#33C4C6',
    pill: '#9CEBF9',
    pillText: '#00838F',
    light: '#E6F8F8',
  },
  light: {
    primary: '#00B14F',          // Grab Green đặc trưng
    primaryDark: '#008B3D',      // Xanh lá đậm khi nhấn nút
    primaryLight: '#E8F8F0',     // Nền badge / highlight xanh nhạt
    background: '#FFFFFF',       // Nền sáng chính
    backgroundElement: '#F7F7F7',// Nền input, card
    backgroundSelected: '#EAEAEA',
    text: '#1C1C1C',             // Chữ đen chính
    textSecondary: '#676767',    // Chữ chú thích, placeholder
    border: '#E3E3E3',           // Viền phân cách
    error: '#EE2737',            // Đỏ cảnh báo Grab
    errorLight: '#FDECEE',
    white: '#FFFFFF',
  },
  dark: {
    primary: '#00B14F',
    primaryDark: '#00D15E',
    primaryLight: '#07331D',
    background: '#121212',       // Nền tối chuẩn OLED
    backgroundElement: '#1E1E1E',// Card / Input tối
    backgroundSelected: '#2C2C2C',
    text: '#F5F5F5',
    textSecondary: '#A0A0A0',
    border: '#2C2C2C',
    error: '#FF4D4F',
    errorLight: '#3A1417',
    white: '#FFFFFF',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const MaxContentWidth = 800;
