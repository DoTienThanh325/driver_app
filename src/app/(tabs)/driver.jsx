import React, { useState, useEffect } from 'react';
import {
  View,
  Switch,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { router } from 'expo-router';
import { useDriverAvailability } from '@/hooks/use-driver-availability';
import { authService } from '@/services/auth.service';
import { userStorage } from '@/services/storage/user.storage';
import { driverStyles as styles } from '@/styles/screens/driver.styles';

export default function DriverScreen() {
  const [userProfile, setUserProfile] = useState(null);
  const { isAvailable, isUpdating, toggleAvailability } = useDriverAvailability(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      let profile = await userStorage.getUserProfile();
      if (!profile) return;

      let hasDriverRole = profile.roles?.some(
        (r) => String(r).toUpperCase() === 'DRIVER' || String(r).toUpperCase() === 'ROLE_DRIVER'
      );

      // Nếu trong local cache chưa có DRIVER role, thử sync lại với backend (admin vừa cấp quyền)
      if (!hasDriverRole) {
        const syncRes = await authService.syncRolesAndProfile();
        if (syncRes?.profile) {
          profile = syncRes.profile;
          hasDriverRole = profile.roles?.some(
            (r) => String(r).toUpperCase() === 'DRIVER' || String(r).toUpperCase() === 'ROLE_DRIVER'
          );
        }
      }

      if (!isMounted) return;

      if (!hasDriverRole) {
        Alert.alert('Thông báo', 'Tài khoản của bạn chưa được cấp quyền đối tác Tài xế.');
        router.replace('/(tabs)');
      } else {
        setUserProfile(profile);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const driverName = userProfile?.fullName || userProfile?.username || 'Thành Trung';
  const initialLetter = driverName.charAt(0).toUpperCase();

  return (
    <ThemedView style={styles.safeArea}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 1. Khối thẻ trên cùng chứa Profile và Công tắc hoạt động */}
          <View style={styles.headerCard}>
            {/* Thông tin tài xế (Bỏ chỉ số sao đánh giá theo yêu cầu) */}
            <View style={styles.profileCard}>
              <View style={styles.profileLeft}>
                <View style={styles.avatarCircle}>
                  <ThemedText style={styles.avatarText}>{initialLetter}</ThemedText>
                </View>
                <View style={styles.nameBlock}>
                  <ThemedText style={styles.driverRoleLabel}>Tài xế</ThemedText>
                  <ThemedText style={styles.driverFullName}>{driverName}</ThemedText>
                </View>
              </View>

              <Pressable
                style={styles.bellButton}
                onPress={() => Alert.alert('Thông báo', 'Không có thông báo tài xế mới.')}
                hitSlop={8}
              >
                <Ionicons name="notifications-outline" size={22} color="#111827" />
              </Pressable>
            </View>

            {/* Công tắc nhận chuyến: Bật: AVAILABLE | Tắt: OFFLINE */}
            <View style={styles.switchCard}>
              <View style={styles.switchInfo}>
                <ThemedText style={styles.switchTitle}>Sẵn sàng nhận chuyến</ThemedText>
                <ThemedText style={styles.switchSubtitle}>
                  {isAvailable
                    ? 'Đang trực tuyến (Sẵn sàng nhận cuốc xe)'
                    : 'Bạn đang tạm nghỉ (Offline)'}
                </ThemedText>
              </View>

              {isUpdating ? (
                <ActivityIndicator size="small" color="#00B5B8" style={{ marginRight: 8 }} />
              ) : (
                <Switch
                  value={isAvailable}
                  onValueChange={toggleAvailability}
                  trackColor={{ false: '#D1D5DB', true: '#00B5B8' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#D1D5DB"
                />
              )}
            </View>
          </View>

          {/* 2. Trạng thái cuốc xe (Khi Tắt / Khi Bật) */}
          {!isAvailable ? (
            <View style={styles.offlineStateContainer}>
              <View style={styles.exclamationCircle}>
                <ThemedText style={styles.exclamationText}>!</ThemedText>
              </View>
              <ThemedText style={styles.offlineMainNotice}>Bạn đang tạm nghỉ.</ThemedText>
              <ThemedText style={styles.offlineSubNotice}>
                Bật nhận chuyến để xem danh sách cuốc xe.
              </ThemedText>
            </View>
          ) : (
            <View style={styles.onlineStateContainer}>
              <View style={styles.radarPulse}>
                <Ionicons name="radio" size={40} color="#00B5B8" />
              </View>
              <ThemedText style={styles.onlineTitle}>Đang quét cuốc xe xung quanh...</ThemedText>
              <ThemedText style={styles.onlineSubtitle}>
                Hệ thống sẽ tự động ghép chuyến gần bạn nhất.
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
