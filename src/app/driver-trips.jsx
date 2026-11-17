import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { tripService } from '@/services/trip.service';
import { offlineCacheStorage } from '@/services/storage/offline-cache.storage';
import { driverTripsStyles as styles } from '@/styles/screens/driver-trips.styles';

const TAB_ALL = 'ALL';
const TAB_COMPLETED = 'COMPLETED';
const TAB_CANCELLED = 'CANCELLED';

export default function DriverTripsScreen() {
  const [activeTab, setActiveTab] = useState(TAB_ALL);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Tải danh sách cuốc xe (Cache-First)
  const fetchTrips = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        // Đọc cache máy khách trước để hiển thị tức thì
        const cached = await offlineCacheStorage.getDriverTripHistory();
        if (cached && Array.isArray(cached) && cached.length > 0) {
          setTrips(cached);
          setLoading(false);
        }
      }

      // Gọi API lấy dữ liệu mới nhất từ server
      const res = await tripService.getDriverHistory('COMPLETED,CANCELLED', 0, 50);
      const list = res?.content || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        setTrips(list);
        await offlineCacheStorage.saveDriverTripHistory(list);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách cuốc xe tài xế:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTrips(true);
  };

  // 2. Lọc danh sách theo Tab
  const filteredTrips = useMemo(() => {
    if (activeTab === TAB_ALL) return trips;
    return trips.filter((t) => t.status === activeTab);
  }, [trips, activeTab]);


  const formatVND = (amount) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${hours}:${minutes} - ${day}/${month}/${year}`;
    } catch {
      return isoString;
    }
  };

  const handleOpenDetail = (item) => {
    router.push({
      pathname: '/driver-trip-detail',
      params: {
        tripId: item.id || `trip-${Date.now()}`,
        tripJson: JSON.stringify(item),
      },
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#00B5B8" />

      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          activeOpacity={0.8}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Các cuốc xe đã thực hiện</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      {/* Segmented Filter Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === TAB_ALL && styles.tabButtonActive]}
          onPress={() => setActiveTab(TAB_ALL)}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === TAB_ALL && styles.tabTextActive]}>
            Tất cả
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === TAB_COMPLETED && styles.tabButtonActive]}
          onPress={() => setActiveTab(TAB_COMPLETED)}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === TAB_COMPLETED && styles.tabTextActive]}>
            Hoàn thành
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === TAB_CANCELLED && styles.tabButtonActive]}
          onPress={() => setActiveTab(TAB_CANCELLED)}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === TAB_CANCELLED && styles.tabTextActive]}>
            Đã hủy
          </Text>
        </TouchableOpacity>
      </View>

      {/* List cuốc xe */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#00B5B8" />
          <Text style={styles.emptySubtitle}>Đang tải danh sách cuốc xe...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item, index) => item.id || `trip-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#00B5B8']} />
          }
          renderItem={({ item }) => {
            const isFood = item.shippingType === 'FOOD_DELIVERY';
            const isCompleted = item.status === 'COMPLETED';
            const timeDisplay = formatDateTime(item.completedAt || item.createdAt);
            const totalFare = item.fare?.totalFare || item.fare?.shippingFare || 0;

            const vehicleTitle = (() => {
              const upper = String(item.vehicleType || '').toUpperCase();
              if (upper === 'CAR') return 'Ô TÔ';
              if (upper === 'CAR_4_SEATS') return 'Ô TÔ 4 CHỖ';
              if (upper === 'CAR_7_SEATS') return 'Ô TÔ 7 CHỖ';
              if (upper === 'MOTORBIKE') return 'XE MÁY';
              return upper || 'XE MÁY';
            })();

            return (
              <TouchableOpacity
                style={styles.tripCard}
                activeOpacity={0.85}
                onPress={() => handleOpenDetail(item)}
              >
                {/* 1. Header Card: Loại dịch vụ & Trạng thái */}
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.shippingBadge,
                      isFood ? styles.shippingBadgeFood : styles.shippingBadgePassenger,
                    ]}
                  >
                    <Ionicons
                      name={isFood ? 'fast-food-outline' : 'car-outline'}
                      size={13}
                      color={isFood ? '#EA580C' : '#00B5B8'}
                    />
                    <Text
                      style={[
                        styles.shippingBadgeText,
                        { color: isFood ? '#EA580C' : '#00B5B8' },
                      ]}
                    >
                      {isFood ? 'GIAO ĐỒ ĂN' : vehicleTitle}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      isCompleted ? styles.statusCompleted : styles.statusCancelled,
                    ]}
                  >
                    <Text
                      style={
                        isCompleted ? styles.statusCompletedText : styles.statusCancelledText
                      }
                    >
                      {isCompleted ? '✓ HOÀN THÀNH' : '✕ ĐÃ HỦY'}
                    </Text>
                  </View>
                </View>

                {/* 2. Thời gian & Cước phí */}
                <View style={styles.metaRow}>
                  <Text style={styles.timeText}>{timeDisplay}</Text>
                  <View style={styles.fareBlock}>
                    <Text style={styles.fareTotalText}>{formatVND(totalFare)}</Text>
                    {isFood && item.fare?.foodFare > 0 && (
                      <Text style={styles.fareSubText}>
                        Ship: {formatVND(item.fare?.shippingFare)} • Món:{' '}
                        {formatVND(item.fare?.foodFare)}
                      </Text>
                    )}
                  </View>
                </View>

                {/* 3. Lộ trình Đón - Trả */}
                <View style={styles.routeContainer}>
                  <View style={styles.routeRow}>
                    <View style={styles.dotPickup} />
                    <Text style={styles.routeText} numberOfLines={2}>
                      {item.pickUpAddress || 'Điểm đón/lấy hàng'}
                    </Text>
                  </View>
                  <View style={styles.routeConnector} />
                  <View style={styles.routeRow}>
                    <View style={styles.dotDropoff} />
                    <Text style={styles.routeText} numberOfLines={2}>
                      {item.destinationAddress || 'Điểm đến/giao hàng'}
                    </Text>
                  </View>
                </View>

                {/* 4. Tóm tắt món ăn (nếu là đơn Food) */}
                {isFood && Array.isArray(item.foods) && item.foods.length > 0 && (
                  <View style={styles.foodSummaryBox}>
                    <Ionicons name="restaurant-outline" size={14} color="#6B7280" />
                    <Text style={styles.foodSummaryText} numberOfLines={1}>
                      {item.foods.length} món:{' '}
                      {item.foods
                        .map((f) => `${f.foodName}${f.size ? ` (${f.size})` : ''}`)
                        .join(', ')}
                    </Text>
                  </View>
                )}

                {/* 5. Lý do hủy (nếu có) */}
                {!isCompleted && item.cancelReason && (
                  <View style={styles.cancelReasonBox}>
                    <Ionicons name="information-circle-outline" size={14} color="#DC2626" />
                    <Text style={styles.cancelReasonText} numberOfLines={1}>
                      Lý do hủy: {item.cancelReason}
                    </Text>
                  </View>
                )}

                {/* 6. Footer Card */}
                <View style={styles.cardFooter}>
                  <Text style={styles.customerText} numberOfLines={1}>
                    Khách: {item.customer?.name || 'Khách hàng'} •{' '}
                    {item.customer?.phoneNumber || 'SĐT bảo mật'}
                  </Text>
                  <Text style={styles.detailLinkText}>Chi tiết ›</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Ionicons name="car-outline" size={54} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Chưa có cuốc xe nào</Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === TAB_ALL
                  ? 'Bạn chưa hoàn thành hoặc hủy cuốc xe nào trong thời gian gần đây.'
                  : activeTab === TAB_COMPLETED
                  ? 'Chưa có cuốc xe hoàn thành nào.'
                  : 'Chưa có cuốc xe nào bị hủy.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
