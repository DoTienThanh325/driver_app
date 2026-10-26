import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export function ThemedText({ style, type = 'default', themeColor, ...rest }) {
  const theme = useTheme();

  return <Text style={[{ color: theme[themeColor ?? 'text'] }, styles[type], style]} {...rest} />;
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
  },
  link: {
    lineHeight: 24,
    fontSize: 16,
    color: '#0284c7',
  },
});
