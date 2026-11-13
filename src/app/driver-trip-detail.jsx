import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import { tripService } from '@/services/trip.service';
import { offlineCacheStorage } from '@/services/storage/offline-cache.storage';
import { driverTripDetailStyles as styles } from '@/styles/screens/driver-trip-detail.styles';

export default function DriverTripDetailScreen() {
  const { tripId, tripJson } = useLocalSearchParams();

  // Parse thông tin cuốc xe từ params
  const trip = useMemo(() => {
    try {
      if (tripJson) return JSON.parse(tripJson);
    } catch (e) {
      console.warn('Lỗi parse tripJson:', e);
    }
    return null;
  }, [tripJson]);

  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // 1. Tải đánh giá của khách hàng (Cache-First)
  const fetchReviews = useCallback(async () => {
    const targetTripId = tripId || trip?.id;
    try {
      // Đọc cache máy khách trước
      const cached = await offlineCacheStorage.getTripReviews(targetTripId);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setReviews(cached);
        setLoadingReviews(false);
      }

      // Gọi API lấy đánh giá mới nhất
      const res = await tripService.getTripReviews(targetTripId, 0, 20);
      const list = res?.content || (Array.isArray(res) ? res : []);
      if (Array.isArray(list)) {
        setReviews(list);
        await offlineCacheStorage.saveTripReviews(targetTripId, list);
      }
    } catch (err) {
      console.warn('Lỗi tải đánh giá cuốc xe:', err?.message);
    } finally {
      setLoadingReviews(false);
    }
  }, [tripId, trip]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

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

  const handleCallCustomer = () => {
    const phone = trip?.customer?.phoneNumber;
    if (!phone) {
      Alert.alert('Thông báo', 'Không có số điện thoại khách hàng.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Lỗi', 'Không thể khởi động ứng dụng gọi điện thoại.');
    });
  };

  if (!trip) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerBar}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Chi tiết cuốc xe</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#6B7280' }}>Không tìm thấy thông tin chuyến đi.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isFood = trip.shippingType === 'FOOD_DELIVERY';
  const isCompleted = trip.status === 'COMPLETED';

  // Lấy nhãn hiển thị phương tiện (bỏ chữ 'Chở khách', chỉ hiển thị phương tiện)
  const vehicleLabel = useMemo(() => {
    const rawType = trip.vehicleType;
    if (!rawType) return 'Xe máy';
    const upper = String(rawType).toUpperCase();
    if (upper === 'CAR') return 'Ô tô';
    if (upper === 'CAR_4_SEATS') return 'Ô tô 4 chỗ';
    if (upper === 'CAR_7_SEATS') return 'Ô tô 7 chỗ';
    if (upper === 'MOTORBIKE') return 'Xe máy';
    return rawType;
  }, [trip.vehicleType]);

  const isCar = String(trip.vehicleType || '').toUpperCase().includes('CAR');

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
        <Text style={styles.headerTitle}>Chi tiết cuốc xe</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Trạng thái & Loại hình cuốc xe */}
        <View style={styles.card}>
          <View style={styles.statusBanner}>
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
                {isCompleted ? '✓ CUỐC XE ĐÃ HOÀN THÀNH' : '✕ CUỐC XE ĐÃ HỦY'}
              </Text>
            </View>

            {/* Badge phương tiện: bỏ chữ 'Chở khách', chỉ hiển thị phương tiện */}
            <View style={styles.serviceTypeBadge}>
              <Ionicons
                name={isFood ? 'fast-food-outline' : isCar ? 'car-outline' : 'bicycle-outline'}
                size={14}
                color="#00B5B8"
              />
              <Text style={styles.serviceTypeText}>
                {isFood ? `Giao đồ ăn • ${vehicleLabel}` : vehicleLabel}
              </Text>
            </View>
          </View>

          <View style={styles.timeMetaRow}>
            <Ionicons name="time-outline" size={14} color="#9CA3AF" />
            <Text style={styles.timeMetaText}>
              Bắt đầu: {formatDateTime(trip.createdAt)}
            </Text>
          </View>
          {trip.completedAt && (
            <View style={styles.timeMetaRow}>
              <Ionicons name="checkmark-done-outline" size={14} color="#059669" />
              <Text style={styles.timeMetaText}>
                Hoàn thành: {formatDateTime(trip.completedAt)}
              </Text>
            </View>
          )}

          {/* Lý do hủy nếu có */}
          {!isCompleted && trip.cancelReason && (
            <View style={styles.cancelReasonBox}>
              <Text style={styles.cancelReasonTitle}>Lý do hủy chuyến:</Text>
              <Text style={styles.cancelReasonContent}>{trip.cancelReason}</Text>
            </View>
          )}
        </View>

        {/* 2. Lộ trình vận chuyển */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="navigate-outline" size={18} color="#00B5B8" />
            <Text style={styles.cardTitle}>Lộ trình di chuyển</Text>
          </View>

          <View style={styles.routeItem}>
            <View style={styles.dotPickup} />
            <View style={styles.routeItemContent}>
              <Text style={styles.routeItemLabel}>
                {isFood ? 'Điểm lấy món ăn' : 'Điểm đón khách'}
              </Text>
              <Text style={styles.routeItemAddress}>
                {trip.pickUpAddress || 'Chưa cập nhật điểm đón'}
              </Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routeItem}>
            <View style={styles.dotDropoff} />
            <View style={styles.routeItemContent}>
              <Text style={styles.routeItemLabel}>
                {isFood ? 'Điểm giao món ăn' : 'Điểm trả khách'}
              </Text>
              <Text style={styles.routeItemAddress}>
                {trip.destinationAddress || 'Chưa cập nhật điểm đến'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3. Chi tiết Cước phí (fare) */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="receipt-outline" size={18} color="#00B5B8" />
            <Text style={styles.cardTitle}>Chi tiết cước phí</Text>
          </View>

          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Cước vận chuyển (Ship):</Text>
            <Text style={styles.fareValue}>
              {formatVND(trip.fare?.shippingFare || 0)}
            </Text>
          </View>

          {isFood && trip.fare?.foodFare > 0 && (
            <View style={styles.fareRow}>
              <Text style={styles.fareLabel}>Tiền món ăn thu hộ:</Text>
              <Text style={styles.fareValue}>
                {formatVND(trip.fare?.foodFare || 0)}
              </Text>
            </View>
          )}

          <View style={styles.fareDivider} />

          <View style={styles.fareRow}>
            <Text style={styles.fareTotalLabel}>Tổng cước thu:</Text>
            <Text style={styles.fareTotalValue}>
              {formatVND(trip.fare?.totalFare || trip.fare?.shippingFare || 0)}
            </Text>
          </View>
        </View>

        {/* 4. Danh sách Món ăn (Nếu là FOOD_DELIVERY và có danh sách foods) */}
        {isFood && Array.isArray(trip.foods) && trip.foods.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="fast-food-outline" size={18} color="#EA580C" />
              <Text style={styles.cardTitle}>
                Danh sách món ăn ({trip.foods.length})
              </Text>
            </View>

            {trip.foods.map((food, idx) => (
              <View key={`food-${idx}`} style={styles.foodItemRow}>
                <View style={styles.foodItemLeft}>
                  <Text style={styles.foodItemName}>{food.foodName}</Text>
                  {food.size && (
                    <Text style={styles.foodItemSize}>Kích cỡ: {food.size}</Text>
                  )}
                </View>
                <Text style={styles.foodItemPrice}>{formatVND(food.price)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 5. Thông tin Khách hàng */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="person-outline" size={18} color="#00B5B8" />
            <Text style={styles.cardTitle}>Thông tin khách hàng</Text>
          </View>

          <View style={styles.customerRow}>
            <View style={styles.customerLeft}>
              <View style={styles.customerAvatar}>
                <Text style={styles.customerAvatarText}>
                  {trip.customer?.name?.charAt(0)?.toUpperCase() || 'K'}
                </Text>
              </View>
              <View>
                <Text style={styles.customerName}>
                  {trip.customer?.name || 'Khách hàng'}
                </Text>
                <Text style={styles.customerPhone}>
                  {trip.customer?.phoneNumber || 'SĐT bảo mật'}
                </Text>
              </View>
            </View>

            {trip.customer?.phoneNumber && (
              <TouchableOpacity
                style={styles.callButton}
                activeOpacity={0.8}
                onPress={handleCallCustomer}
              >
                <Ionicons name="call" size={14} color="#00B5B8" />
                <Text style={styles.callButtonText}>Gọi điện</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 6. Đánh giá từ khách hàng (API 2) */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Text style={styles.cardTitle}>Đánh giá & Nhận xét từ khách hàng</Text>
          </View>

          {loadingReviews ? (
            <View style={styles.emptyReviewsBox}>
              <ActivityIndicator size="small" color="#00B5B8" />
              <Text style={styles.emptyReviewsText}>Đang tải đánh giá...</Text>
            </View>
          ) : reviews && reviews.length > 0 ? (
            reviews.map((rev, idx) => {
              const stars = Math.round(Number(rev.rating) || 5);
              return (
                <View key={rev.id || `review-${idx}`} style={styles.reviewCardItem}>
                  <View style={styles.reviewHeaderRow}>
                    <Text style={styles.reviewerName}>
                      {rev.reviewerName || 'Khách hàng'}
                    </Text>
                    <View style={styles.ratingStarsRow}>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Ionicons
                          key={s}
                          name={s <= stars ? 'star' : 'star-outline'}
                          size={13}
                          color="#F59E0B"
                        />
                      ))}
                      <Text style={styles.ratingNumberText}>
                        {Number(rev.rating).toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.reviewContentText}>
                    "{rev.content || 'Đánh giá tích cực.'}"
                  </Text>

                  {rev.createdAt && (
                    <Text style={styles.reviewTimeText}>
                      {formatDateTime(rev.createdAt)}
                    </Text>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyReviewsBox}>
              <Ionicons name="chatbubble-ellipses-outline" size={32} color="#D1D5DB" />
              <Text style={styles.emptyReviewsText}>
                Chưa có đánh giá nào cho cuốc xe này.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
