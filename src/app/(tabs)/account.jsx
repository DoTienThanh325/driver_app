import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { authService } from '@/services/auth.service';
import { driverService } from '@/services/driver.service';
import { businessService } from '@/services/business.service';
import { userStorage } from '@/services/storage/user.storage';
import { accountStyles as styles } from '@/styles/screens/account.styles';

export default function AccountScreen() {
  const [profile, setProfile] = useState(null);
  const [isDriver, setIsDriver] = useState(false);
  const [driverRegStatus, setDriverRegStatus] = useState('NOT_REGISTERED'); // NOT_REGISTERED | PENDING | REJECTED | APPROVED
  const [isBusiness, setIsBusiness] = useState(false);
  const [businessRegStatus, setBusinessRegStatus] = useState('NOT_REGISTERED'); // NOT_REGISTERED | PENDING | REJECTED | ACCEPTED

  const loadUserData = useCallback(async () => {
    const userProfile = await userStorage.getUserProfile();
    setProfile(userProfile);

    const hasDriverRole = await userStorage.isDriver();
    setIsDriver(hasDriverRole);

    const hasBusinessRole = await userStorage.isBusiness();
    setIsBusiness(hasBusinessRole);

    if (userProfile?.id) {
      try {
        const regInfo = await driverService.getRegistrationStatus(userProfile.id);
        setDriverRegStatus(regInfo.status);
      } catch {
        setDriverRegStatus(hasDriverRole ? 'APPROVED' : 'NOT_REGISTERED');
      }
    }

    try {
      const bRegInfo = await businessService.getRegistrationStatus();
      setBusinessRegStatus(bRegInfo.status);
    } catch {
      setBusinessRegStatus(hasBusinessRole ? 'ACCEPTED' : 'NOT_REGISTERED');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUserData();
    }, [loadUserData])
  );

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất tài khoản?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleDriverProfilePress = () => {
    router.push('/driver-profile');
  };

  const handleDriverRegisterPress = () => {
    router.push('/driver-register');
  };

  const handleBusinessProfilePress = () => {
    router.push('/business-profile');
  };

  const handleBusinessRegisterPress = () => {
    router.push('/business-register');
  };

  const initialLetter = (profile?.fullName || profile?.username || 'T').charAt(0).toUpperCase();

  // Ánh xạ role của người dùng theo yêu cầu
  const ROLE_MAP = {
    CUSTOMER: 'KHÁCH HÀNG',
    ROLE_CUSTOMER: 'KHÁCH HÀNG',
    DRIVER: 'TÀI XẾ',
    ROLE_DRIVER: 'TÀI XẾ',
    BUSINESS: 'KINH DOANH',
    ROLE_BUSINESS: 'KINH DOANH',
    MERCHANT: 'KINH DOANH',
    ROLE_MERCHANT: 'KINH DOANH',
  };

  // Chỉ hiển thị các role mà người dùng thực tế có
  const userRoles = Array.isArray(profile?.roles) && profile.roles.length > 0 ? profile.roles : ['CUSTOMER'];
  const displayedRoles = Array.from(
    new Set(
      userRoles
        .map((r) => ROLE_MAP[String(r).toUpperCase()])
        .filter(Boolean)
    )
  );

  const hasDriverProfile = isDriver || (driverRegStatus && driverRegStatus !== 'NOT_REGISTERED');
  const hasBusinessProfile = isBusiness || (businessRegStatus && businessRegStatus !== 'NOT_REGISTERED');

  return (
    <ThemedView style={styles.container}>
      {/* 1. Header Banner Teal */}
      <View style={styles.headerBanner}>
        <View style={styles.headerContent}>
          <View style={styles.avatarCircle}>
            <ThemedText style={styles.avatarText}>{initialLetter}</ThemedText>
          </View>

          <View style={styles.userInfo}>
            <ThemedText style={styles.userName}>
              {profile?.fullName || profile?.username || 'ThanhTienDo'}
            </ThemedText>
            <ThemedText style={styles.userPhone}>
              {profile?.phoneNumber || '0868377913'}
            </ThemedText>

            {/* Chỉ hiển thị các role mà user thực tế có */}
            <View style={styles.rolesContainer}>
              {displayedRoles.map((roleName) => (
                <View key={roleName} style={styles.roleBadge}>
                  <ThemedText style={styles.roleText}>{roleName}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Mục: Hồ sơ của bạn */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Hồ sơ của bạn</ThemedText>
          <View style={styles.card}>
            {/* Nếu đã có hồ sơ tài xế (kể cả PENDING, APPROVED, REJECTED hoặc có role DRIVER): hiển thị Hồ sơ Tài xế */}
            {hasDriverProfile && (
              <Pressable style={styles.itemRow} onPress={handleDriverProfilePress}>
                <View style={styles.itemLeft}>
                  <View style={styles.iconBoxTeal}>
                    <Ionicons name="car-sport-outline" size={22} color="#00B5B8" />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <View style={styles.itemTitleRow}>
                      <ThemedText style={styles.itemTitle}>Hồ sơ Tài xế</ThemedText>
                      {driverRegStatus === 'PENDING' && (
                        <View style={styles.statusBadgePending}>
                          <ThemedText style={styles.statusTextPending}>Chờ duyệt</ThemedText>
                        </View>
                      )}
                      {driverRegStatus === 'REJECTED' && (
                        <View style={styles.statusBadgeRejected}>
                          <ThemedText style={styles.statusTextRejected}>Cần bổ sung</ThemedText>
                        </View>
                      )}
                    </View>
                    {driverRegStatus === 'PENDING' && (
                      <ThemedText style={styles.itemSubtitle}>Hồ sơ đang chờ quản trị viên xét duyệt</ThemedText>
                    )}
                    {driverRegStatus === 'REJECTED' && (
                      <ThemedText style={styles.itemSubtitle}>Hồ sơ cần cập nhật lại thông tin</ThemedText>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            )}

            {/* Hồ sơ Kinh doanh (Hiển thị khi đã có role BUSINESS hoặc hồ sơ PENDING/REJECTED/ACCEPTED) */}
            {hasBusinessProfile && (
              <Pressable style={styles.itemRow} onPress={handleBusinessProfilePress}>
                <View style={styles.itemLeft}>
                  <View style={styles.iconBoxOrange}>
                    <Ionicons name="storefront-outline" size={22} color="#FF7A00" />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <View style={styles.itemTitleRow}>
                      <ThemedText style={styles.itemTitle}>Hồ sơ Kinh doanh</ThemedText>
                      {businessRegStatus === 'PENDING' && (
                        <View style={styles.statusBadgePending}>
                          <ThemedText style={styles.statusTextPending}>Chờ duyệt</ThemedText>
                        </View>
                      )}
                      {businessRegStatus === 'REJECTED' && (
                        <View style={styles.statusBadgeRejected}>
                          <ThemedText style={styles.statusTextRejected}>Cần bổ sung</ThemedText>
                        </View>
                      )}
                    </View>
                    {businessRegStatus === 'PENDING' && (
                      <ThemedText style={styles.itemSubtitle}>Hồ sơ đang chờ quản trị viên xét duyệt</ThemedText>
                    )}
                    {businessRegStatus === 'REJECTED' && (
                      <ThemedText style={styles.itemSubtitle}>Hồ sơ cần cập nhật lại thông tin</ThemedText>
                    )}
                    {(isBusiness || businessRegStatus === 'ACCEPTED') && (
                      <ThemedText style={styles.itemSubtitle}>Đang hoạt động • Quản lý nhà hàng</ThemedText>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>

        {/* 3. Mục: Mở rộng */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Mở rộng</ThemedText>
          <View style={styles.card}>
            {/* Chỉ hiển thị Đăng ký Tài xế khi hoàn toàn CHƯA nộp hồ sơ */}
            {!hasDriverProfile && (
              <Pressable style={styles.itemRow} onPress={handleDriverRegisterPress}>
                <View style={styles.itemLeft}>
                  <View style={styles.iconBoxTeal}>
                    <Ionicons name="person-add-outline" size={22} color="#00B5B8" />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <ThemedText style={styles.itemTitle}>Đăng ký Tài xế</ThemedText>
                    <ThemedText style={styles.itemSubtitle}>Gửi hồ sơ xác minh để nhận chuyến</ThemedText>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            )}

            {/* Đăng ký Kinh doanh (Chỉ hiển thị khi hoàn toàn CHƯA nộp hồ sơ và CHƯA có role BUSINESS) */}
            {!hasBusinessProfile && (
              <Pressable style={styles.itemRow} onPress={handleBusinessRegisterPress}>
                <View style={styles.itemLeft}>
                  <View style={styles.iconBoxOrange}>
                    <Ionicons name="business-outline" size={22} color="#FF7A00" />
                  </View>
                  <View style={styles.itemTextContainer}>
                    <ThemedText style={styles.itemTitle}>Đăng ký Kinh doanh</ThemedText>
                    <ThemedText style={styles.itemSubtitle}>Đăng ký mở nhà hàng, quán ăn</ThemedText>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </Pressable>
            )}
          </View>
        </View>

        {/* 4. Mục: Cài đặt */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>Cài đặt</ThemedText>
          <View style={styles.card}>
            {/* Đổi mật khẩu */}
            <Pressable
              style={styles.itemRow}
              onPress={() => Alert.alert('Đổi mật khẩu', 'Tính năng đổi mật khẩu đang được xử lý')}
            >
              <View style={styles.itemLeft}>
                <View style={styles.iconBoxBlue}>
                  <Ionicons name="lock-closed-outline" size={22} color="#2563EB" />
                </View>
                <ThemedText style={styles.itemTitle}>Đổi mật khẩu</ThemedText>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>

            {/* Đăng xuất */}
            <Pressable style={styles.itemRow} onPress={handleLogout}>
              <View style={styles.itemLeft}>
                <View style={styles.iconBoxRed}>
                  <Ionicons name="log-out-outline" size={22} color="#EF4444" />
                </View>
                <ThemedText style={styles.logoutText}>Đăng xuất</ThemedText>
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
