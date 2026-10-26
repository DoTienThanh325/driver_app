import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { userStorage } from '@/services/storage/user.storage';
import { homeStyles as styles } from '@/styles/screens/home.styles';

export default function HomeScreen() {
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    userStorage.getUserProfile().then((profile) => {
      if (profile) setUserProfile(profile);
    });
  }, []);

  const displayName = userProfile?.fullName || userProfile?.username || 'Thành Trung';
  const initialLetter = displayName.charAt(0).toUpperCase();

  const handleBookingTransit = () => {
    Alert.alert('Đặt xe', 'Dịch vụ gọi xe T&M Transit sẽ sớm ra mắt tính năng bản đồ trực tiếp!');
  };

  const handleBookingMeal = () => {
    Alert.alert('Đặt món', 'Dịch vụ gọi món T&M Meal đang chuẩn bị danh mục quán ăn ngon cho bạn!');
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

            <Pressable
              style={styles.bellButton}
              onPress={() => Alert.alert('Thông báo', 'Bạn không có thông báo mới.')}
              hitSlop={8}
            >
              <Ionicons name="notifications-outline" size={22} color="#111827" />
            </Pressable>
          </View>

          {/* 2. Thanh tìm kiếm nhanh */}
          <Pressable
            style={styles.searchBar}
            onPress={() => Alert.alert('Tìm kiếm', 'Nhập địa chỉ đến hoặc quán ăn bạn yêu thích')}
          >
            <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
            <ThemedText style={styles.searchText}>Bạn muốn đi đâu hoặc ăn gì?</ThemedText>
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
              onPress={() => Alert.alert('Khuyến mãi', 'Áp dụng mã giảm 50% cho chuyến xe đầu tiên!')}
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
