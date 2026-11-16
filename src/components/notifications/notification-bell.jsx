// @ts-check
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNotifications } from '../../providers/notification-provider';

export function NotificationBell({ style }) {
  const { unreadCount } = useNotifications();
  return (
    <Pressable
      style={[styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel={`Thông báo, ${unreadCount} chưa đọc`}
      onPress={() => router.push('/notifications')}
      hitSlop={8}
    >
      <Ionicons name="notifications-outline" size={22} color="#111827" />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.count}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  badge: {
    position: 'absolute', top: -3, right: -5, minWidth: 19, height: 19,
    borderRadius: 10, backgroundColor: '#D92D20', paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  count: { color: '#FFF', fontSize: 10, fontWeight: '700' },
});
