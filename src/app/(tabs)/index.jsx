import React, { useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { userStorage } from '@/services/storage/user.storage';
import { tripService, TRIP_STATUS } from '@/services/trip.service';
import { homeStyles as styles } from '@/styles/screens/home.styles';
import { NotificationBell } from '@/components/notifications/notification-bell';

export default function HomeScreen() {
  const [userProfile, setUserProfile] = useState(null);
  const [activeTrip, setActiveTrip] = useState(null);

  const loadData = useCallback(async () => {
    const profile = await userStorage.getUserProfile();
    if (profile) setUserProfile(profile);

    // Kiểm tra chuyến đi hiện tại
    const trip = await tripService.getCurrentTrip();
    if (
      trip &&
      [
        TRIP_STATUS.REQUESTED,
        TRIP_STATUS.SEARCHING_DRIVER,
        TRIP_STATUS.DRIVER_ASSIGNED,
        TRIP_STATUS.DRIVER_ARRIVING,
        TRIP_STATUS.IN_PROGRESS,
      ].includes(trip.status)
    ) {
      setActiveTrip(trip);
    } else {
      setActiveTrip(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const displayName = userProfile?.fullName || userProfile?.username || 'Thành Trung';
  const initialLetter = displayName.charAt(0).toUpperCase();

  const handleBookingTransit = () => {
    if (activeTrip) {
      router.push({
        pathname: '/book-trip',
        params: { tripId: activeTrip.id, tripData: JSON.stringify(activeTrip) },
      });
    } else {
      router.push('/book-trip');
    }
  };

  const handleBookingMeal = () => {
    router.push('/food-search');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Header Người dùng */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.avatarCircle}>
                <ThemedText style={styles.avatarText}>{initialLetter}</ThemedText>
              </View>
              <View>
                <ThemedText style={styles.greetingSmall}>Xin chào,</ThemedText>
                <ThemedText style={styles.greetingName}>{displayName} 👋</ThemedText>
              </View>
            </View>

            <NotificationBell style={styles.bellButton} />
          </View>

          {/* Banner Chuyến đi đang hoạt động (Nếu có) */}
          {activeTrip && (
            <Pressable
              style={{
                backgroundColor: '#ECFDF5',
                borderColor: '#10B981',
                borderWidth: 1.5,
                borderRadius: 16,
                padding: 14,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
              onPress={() =>
                router.push({
                  pathname: '/book-trip',
                  params: { tripId: activeTrip.id, tripData: JSON.stringify(activeTrip) },
                })
              }
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                <View
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    backgroundColor: '#10B981',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10,
                  }}
                >
                  <Ionicons name="car" size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#065F46' }}>
                    Chuyến đi đang hoạt động
                  </ThemedText>
                  <ThemedText
                    style={{ fontSize: 12, color: '#047857' }}
                    numberOfLines={1}
                  >
                    Đến: {activeTrip.destinationAddress}
                  </ThemedText>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#10B981" />
            </Pressable>
          )}

          {/* 2. Thanh tìm kiếm nhanh */}
          <Pressable
            style={styles.searchBar}
            onPress={handleBookingTransit}
          >
            <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <ThemedText style={styles.searchText}>Bạn muốn đi đâu hoặc giao hàng tới đâu?</ThemedText>
          </Pressable>

          {/* 3. Thẻ dịch vụ chính: Đặt xe & Đặt món */}
          <View style={styles.servicesRow}>
            {/* Đặt xe */}
            <Pressable
              style={styles.serviceCard}
              onPress={handleBookingTransit}
            >
              <View style={styles.serviceIconBoxTeal}>
                <Ionicons name="car-outline" size={26} color="#00B5B8" />
              </View>
              <ThemedText style={styles.serviceTitleTeal}>Đặt xe</ThemedText>
              <ThemedText style={styles.serviceSubtitle}>Di chuyển nhanh chóng</ThemedText>
            </Pressable>

            {/* Đặt món */}
            <Pressable
              style={styles.serviceCard}
              onPress={handleBookingMeal}
            >
              <View style={styles.serviceIconBoxOrange}>
                <Ionicons name="fast-food-outline" size={26} color="#FF7A00" />
              </View>
              <ThemedText style={styles.serviceTitleOrange}>Đặt món</ThemedText>
              <ThemedText style={styles.serviceSubtitle}>Giao đồ ăn tận nơi</ThemedText>
            </Pressable>
          </View>

          {/* 4. Mục Ưu đãi dành cho bạn */}
          <ThemedText style={styles.sectionTitle}>Ưu đãi dành cho bạn</ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.promotionsScroll}
          >
            {/* Banner Transit */}
            <Pressable
              style={styles.promotionCardTeal}
              onPress={() =>
                router.push({
                  pathname: '/book-trip',
                  params: { tripId: activeTrip.id, tripData: JSON.stringify(activeTrip) },
                })
              }
            >
              <ThemedText style={styles.promoTitle}>Giảm 50% chuyến xe đầu tiên</ThemedText>
              <ThemedText style={styles.promoSubtitle}>Áp dụng cho dịch vụ T&M Transit</ThemedText>
            </Pressable>

            {/* Banner Meal */}
            <Pressable
              style={styles.promotionCardOrange}
              onPress={() => Alert.alert('Khuyến mãi', 'Áp dụng mã Freeship 0Đ cho đơn hàng từ 50k!')}
            >
              <ThemedText style={styles.promoTitle}>Freeship đồ ăn 0Đ</ThemedText>
              <ThemedText style={styles.promoSubtitle}>Cho đơn hàng từ 50k tại T&M Meal</ThemedText>
            </Pressable>
          </ScrollView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
