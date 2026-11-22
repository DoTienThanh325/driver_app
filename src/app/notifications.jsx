// @ts-check
import React from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNotifications } from '../providers/notification-provider';
import { useTheme } from '../hooks/use-theme';
import { formatNotificationTimestamp } from '../utils/notification-state';

const statusLabels = {
  connecting: 'Đang kết nối thông báo…',
  reconnecting: 'Kết nối gián đoạn. Đang thử kết nối lại…',
  paused: 'Thông báo realtime sẽ tiếp tục khi bạn mở ứng dụng.',
  unsupported: 'Thông báo realtime hiện hỗ trợ trên Android và iOS.',
  expired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  'auth-error': 'Không thể xác thực thông báo. Vui lòng đăng nhập lại.',
  'configuration-error': 'Chưa kết nối được dịch vụ thông báo.',
};

export default function NotificationsScreen() {
  const { items, userId, loading, status, storageError, unreadCount, markRead } = useNotifications();
  const colors = useTheme();
  const text = { color: colors.text };
  const secondary = { color: colors.textSecondary };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable
          accessibilityRole="button" accessibilityLabel="Quay lại" style={styles.iconButton}
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.heading, text]}>Thông báo</Text>
        {userId && unreadCount > 0 && (
          <Pressable accessibilityRole="button" onPress={() => markRead()} style={styles.readAll}>
            <Text style={styles.action}>Đánh dấu tất cả đã đọc</Text>
          </Pressable>
        )}
      </View>

      {!userId ? (
        <View style={styles.empty}>
          <Ionicons name="notifications-outline" size={48} color="#00B5B8" />
          <Text style={[styles.emptyTitle, text]}>Đăng nhập để nhận thông báo</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/login')} style={styles.loginButton}>
            <Text style={styles.loginText}>Đăng nhập</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.notice}>
            <Text style={[styles.caption, secondary]}>
              Chỉ lưu thông báo đã nhận trên thiết bị này khi ứng dụng đang mở.
            </Text>
            {statusLabels[status] && <Text style={[styles.caption, secondary]} accessibilityLiveRegion="polite">{statusLabels[status]}</Text>}
            {storageError && <Text style={[styles.caption, { color: colors.error }]}>Không lưu được thông báo trên thiết bị. Dữ liệu có thể mất khi đóng ứng dụng.</Text>}
            {status === 'auth-error' && (
              <Pressable accessibilityRole="button" onPress={() => router.push('/login')} style={styles.readAll}>
                <Text style={styles.action}>Đăng nhập lại</Text>
              </Pressable>
            )}
          </View>
          {loading ? <ActivityIndicator color="#00B5B8" style={styles.loader} /> : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.id}
              contentContainerStyle={items.length ? styles.list : styles.emptyList}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="notifications-outline" size={48} color="#00B5B8" />
                  <Text style={[styles.emptyTitle, text]}>Chưa có thông báo</Text>
                  <Text style={[styles.emptyText, secondary]}>Thông báo mới sẽ xuất hiện tại đây.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const timestamp = formatNotificationTimestamp(item.timestamp);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${item.readAt ? 'Đã đọc' : 'Chưa đọc'}. ${item.title}. ${item.content}. ${timestamp}`}
                    onPress={() => markRead(item.id)}
                    style={[styles.item, {
                      backgroundColor: item.readAt ? colors.background : colors.backgroundElement,
                      borderColor: colors.border,
                    }]}
                  >
                    <View style={styles.itemHeader}>
                      {!item.readAt && <View style={styles.dot} />}
                      <Text style={[styles.title, text]}>{item.title}</Text>
                    </View>
                    <Text style={[styles.content, secondary]}>{item.content}</Text>
                    <Text style={[styles.caption, secondary]}>{timestamp}</Text>
                  </Pressable>
                );
              }}
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, minHeight: 60, borderBottomWidth: 1, gap: 8, flexWrap: 'wrap' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  heading: { flex: 1, fontSize: 21, fontWeight: '700' },
  readAll: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  action: { color: '#00878A', fontWeight: '600', fontSize: 12 },
  notice: { padding: 16, gap: 8 },
  caption: { fontSize: 12, lineHeight: 18 },
  loader: { marginTop: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  emptyList: { flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  emptyText: { textAlign: 'center' },
  loginButton: { backgroundColor: '#00878A', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  loginText: { color: '#FFF', fontWeight: '700' },
  item: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 8 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00B5B8' },
  content: { fontSize: 14, lineHeight: 21 },
});
