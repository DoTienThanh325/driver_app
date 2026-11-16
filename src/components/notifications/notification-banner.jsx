// @ts-check
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../../hooks/use-theme';

export function NotificationBanner({ notification, onDismiss }) {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  if (!notification) return null;
  return (
    <View style={[styles.position, { top: insets.top + 8 }]} pointerEvents="box-none">
      <View style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
        <Pressable
          style={styles.open}
          accessibilityRole="button"
          accessibilityLabel={`Thông báo: ${notification.title}. ${notification.content}`}
          onPress={() => { onDismiss(); router.push('/notifications'); }}
        >
          <Ionicons name="notifications" size={24} color="#00B5B8" />
          <View style={styles.message} accessibilityLiveRegion="polite">
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{notification.title}</Text>
            <Text style={{ color: colors.textSecondary }} numberOfLines={2}>{notification.content}</Text>
          </View>
        </Pressable>
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Đóng thông báo" style={styles.close}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  position: { position: 'absolute', left: 12, right: 12, zIndex: 1000 },
  card: {
    flexDirection: 'row', borderWidth: 1, borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15,
    shadowRadius: 8, elevation: 8,
  },
  open: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  message: { flex: 1, gap: 4 },
  title: { fontWeight: '700', fontSize: 15 },
  close: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
