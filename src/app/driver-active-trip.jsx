import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { tripService, TRIP_STATUS } from '@/services/trip.service';
import { driverTripStyles as styles } from '@/styles/screens/driver-active-trip.styles';

export default function DriverActiveTripScreen() {
  const params = useLocalSearchParams();
  const tripId = params.tripId;

  const [trip, setTrip] = useState(() => {
    try {
      if (params.tripData) {
        return JSON.parse(params.tripData);
      }
    } catch {
      // Bỏ qua lỗi parse
    }
    return {
      id: tripId || 'TRIP-DEMO',
      status: TRIP_STATUS.DRIVER_ASSIGNED,
      pickUpAddress: params.pickUpAddress || 'Ngã tư Sở, Đống Đa, Hà Nội',
      destinationAddress: params.destinationAddress || 'Keangnam Landmark 72, Phạm Hùng, Nam Từ Liêm',
      shippFare: Number(params.shippFare) || 45000,
      vehicleType: params.vehicleType || 'MOTORBIKE',
      customerName: params.customerName || 'Nguyễn Văn An',
      customerPhone: params.customerPhone || '0988123456',
      customerRating: '4.9',
      distanceKm: params.distanceKm || '2.5',
    };
  });

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Polling cập nhật trạng thái cuốc nếu có kết nối backend
  useEffect(() => {
    if (!trip?.id || String(trip.id).startsWith('sample')) return;

    const interval = setInterval(async () => {
      try {
        const updated = await tripService.getTripById(trip.id);
        if (updated) {
          if (updated.status === TRIP_STATUS.COMPLETED || updated.status === TRIP_STATUS.CANCELLED) {
            Alert.alert(
              'Cuốc xe kết thúc',
              updated.status === TRIP_STATUS.COMPLETED
                ? 'Chúc mừng! Bạn đã hoàn thành chuyến đi thành công.'
                : 'Chuyến đi đã bị hủy.',
              [{ text: 'Về trang chủ', onPress: () => router.replace('/(tabs)/driver') }]
            );
          } else {
            setTrip((prev) => ({ ...prev, ...updated }));
          }
        }
      } catch {
        // Bỏ qua lỗi polling tạm thời
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [trip?.id]);

  // Hành động cập nhật tiến trình chuyến đi
  const handleAdvanceStatus = () => {
    let nextStatus = null;
    let confirmMsg = '';

    if (trip.status === TRIP_STATUS.DRIVER_ASSIGNED) {
      nextStatus = TRIP_STATUS.DRIVER_ARRIVING;
      confirmMsg = 'Xác nhận bạn đã đến điểm đón khách?';
    } else if (trip.status === TRIP_STATUS.DRIVER_ARRIVING) {
      nextStatus = TRIP_STATUS.IN_PROGRESS;
      confirmMsg = 'Khách đã lên xe. Xác nhận bắt đầu chuyến đi?';
    } else if (trip.status === TRIP_STATUS.IN_PROGRESS) {
      nextStatus = TRIP_STATUS.COMPLETED;
      confirmMsg = 'Đã đến điểm trả khách. Xác nhận hoàn thành chuyến đi và thu cước?';
    }

    if (!nextStatus) return;

    Alert.alert('Xác nhận tiến trình', confirmMsg, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đồng ý',
        onPress: async () => {
          setIsUpdatingStatus(true);
          try {
            if (!String(trip.id).startsWith('sample')) {
              await tripService.updateTripStatus(trip.id, nextStatus);
            }

            if (nextStatus === TRIP_STATUS.COMPLETED) {
              Alert.alert(
                'Hoàn thành cuốc xe 🎉',
                `Đã thu cước phí: ${Number(trip.shippFare || 45000).toLocaleString('vi-VN')} đ. Bạn đã sẵn sàng nhận cuốc xe tiếp theo!`,
                [
                  {
                    text: 'Về trang chủ tài xế',
                    onPress: () => router.replace('/(tabs)/driver'),
                  },
                ]
              );
            } else {
              setTrip((prev) => ({ ...prev, status: nextStatus }));
            }
          } catch (err) {
            Alert.alert('Lỗi cập nhật', err.message || 'Không thể cập nhật trạng thái.');
          } finally {
            setIsUpdatingStatus(false);
          }
        },
      },
    ]);
  };

  // Gọi điện cho khách hàng
  const handleCallCustomer = () => {
    const phone = trip.customerPhone || '0988123456';
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Thông tin liên hệ', `Số điện thoại khách hàng: ${phone}`);
    });
  };

  // Nhắn tin SMS cho khách
  const handleMessageCustomer = () => {
    const phone = trip.customerPhone || '0988123456';
    Linking.openURL(`sms:${phone}`).catch(() => {
      Alert.alert('Nhắn tin', `Gửi tin nhắn tới khách qua số: ${phone}`);
    });
  };

  const getStatusText = () => {
    switch (trip.status) {
      case TRIP_STATUS.DRIVER_ASSIGNED:
        return 'Đang đến đón khách';
      case TRIP_STATUS.DRIVER_ARRIVING:
        return 'Đã đến điểm đón';
      case TRIP_STATUS.IN_PROGRESS:
        return 'Đang chở khách';
      case TRIP_STATUS.COMPLETED:
        return 'Đã hoàn thành';
      default:
        return 'Đang diễn ra';
    }
  };

  const getButtonActionLabel = () => {
    switch (trip.status) {
      case TRIP_STATUS.DRIVER_ASSIGNED:
        return '1. TÔI ĐÃ ĐẾN ĐIỂM ĐÓN';
      case TRIP_STATUS.DRIVER_ARRIVING:
        return '2. BẮT ĐẦU CHUYẾN ĐI';
      case TRIP_STATUS.IN_PROGRESS:
        return '3. HOÀN THÀNH CHUYẾN ĐI';
      default:
        return 'CẬP NHẬT TRẠNG THÁI';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.headerBackBtn}
            onPress={() => router.replace('/(tabs)/driver')}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Chi tiết cuốc xe</ThemedText>
          <View style={styles.statusHeaderBadge}>
            <ThemedText style={styles.statusHeaderText}>{getStatusText()}</ThemedText>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 1. THẺ THÔNG TIN KHÁCH HÀNG */}
          <View style={styles.customerCard}>
            <View style={styles.customerTopRow}>
              <View style={styles.customerAvatar}>
                <ThemedText style={styles.customerAvatarText}>
                  {(trip.customerName || 'K').charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.customerInfo}>
                <ThemedText style={styles.customerName}>{trip.customerName || 'Nguyễn Văn An'}</ThemedText>
                <View style={styles.customerRatingRow}>
                  <Ionicons name="star" size={15} color="#FBBF24" />
                  <ThemedText style={styles.customerRatingText}>
                    {trip.customerRating || '4.9'} • Khách hàng thân thiết
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Nút Gọi & Nhắn tin cho khách */}
            <View style={styles.customerActions}>
              <Pressable style={styles.actionBtnCall} onPress={handleCallCustomer}>
                <Ionicons name="call" size={18} color="#059669" />
                <ThemedText style={styles.actionTextCall}>Gọi cho khách</ThemedText>
              </Pressable>
              <Pressable style={styles.actionBtnMsg} onPress={handleMessageCustomer}>
                <Ionicons name="chatbubble-ellipses" size={18} color="#2563EB" />
                <ThemedText style={styles.actionTextMsg}>Nhắn tin</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* 2. THẺ LỘ TRÌNH CHUYẾN ĐI */}
          <View style={styles.routeCard}>
            <ThemedText style={styles.sectionTitle}>Lộ trình di chuyển</ThemedText>

            {/* Điểm đón */}
            <View style={styles.routeRow}>
              <View style={styles.routeDotCol}>
                <Ionicons name="radio-button-on" size={18} color="#00B5B8" />
                <View style={styles.routeLine} />
              </View>
              <View style={styles.routeTextCol}>
                <ThemedText style={styles.routeLabel}>Điểm đón khách</ThemedText>
                <ThemedText style={styles.routeAddress} numberOfLines={2}>
                  {trip.pickUpAddress}
                </ThemedText>
              </View>
            </View>

            {/* Điểm đến */}
            <View style={[styles.routeRow, { marginTop: 4 }]}>
              <View style={styles.routeDotCol}>
                <Ionicons name="radio-button-on" size={18} color="#F97316" />
              </View>
              <View style={styles.routeTextCol}>
                <ThemedText style={styles.routeLabel}>Điểm trả khách</ThemedText>
                <ThemedText style={styles.routeAddress} numberOfLines={2}>
                  {trip.destinationAddress}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* 3. THẺ CHI TIẾT CƯỚC & PHƯƠNG TIỆN */}
          <View style={styles.detailCard}>
            <View style={styles.fareHighlightRow}>
              <ThemedText style={styles.fareLabel}>Tiền cước thu khách</ThemedText>
              <ThemedText style={styles.fareAmount}>
                {Number(trip.shippFare || 45000).toLocaleString('vi-VN')} đ
              </ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailItemLabel}>Khoảng cách di chuyển:</ThemedText>
              <ThemedText style={styles.detailItemValue}>{trip.distanceKm || '2.5'} km</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailItemLabel}>Phương tiện:</ThemedText>
              <ThemedText style={styles.detailItemValue}>
                {trip.vehicleType === 'CAR' ? '🚗 Ô tô (Car)' : '🛵 Xe máy (Motorbike)'}
              </ThemedText>
            </View>

            <View style={[styles.detailRow, { marginBottom: 0 }]}>
              <ThemedText style={styles.detailItemLabel}>Hình thức thanh toán:</ThemedText>
              <ThemedText style={styles.detailItemValue}>Tiền mặt / Trực tiếp</ThemedText>
            </View>
          </View>

          {/* Khoảng trống để không bị che bởi BottomBar */}
          <View style={{ height: 90 }} />
        </ScrollView>

        {/* Thanh nút bấm trạng thái cố định ở đáy */}
        <View style={styles.bottomBar}>
          <Pressable
            style={styles.actionStepBtn}
            onPress={handleAdvanceStatus}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.actionStepBtnText}>{getButtonActionLabel()}</ThemedText>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}
