import React, { useState } from 'react';
import { View, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { voucherService } from '@/services/voucher.service';
import { voucherDetailStyles as styles } from '@/styles/screens/voucher-detail.styles';

export default function VoucherDetailScreen() {
  const params = useLocalSearchParams();
  const isClaimed = params.isClaimed === 'true';

  let voucher = null;
  try {
    voucher = params.voucherJson ? JSON.parse(params.voucherJson) : null;
  } catch {
    voucher = null;
  }

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!voucher) {
    return (
      <ThemedView style={styles.container}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ThemedText>Không tìm thấy thông tin ưu đãi</ThemedText>
        </View>
      </ThemedView>
    );
  }

  const isTransit = String(voucher.type).toUpperCase() === 'TRANSIT';
  const isPercent = Number(voucher.discount) < 100;
  const discountDisplay = isPercent
    ? `${Math.round(voucher.discount)}%`
    : `${Math.round(voucher.discount / 1000)}k`;

  const maxDiscountText = voucher.maxDiscount > 0
    ? `Giảm tối đa: ${voucher.maxDiscount.toLocaleString('vi-VN')}đ`
    : isPercent ? 'Giảm trực tiếp' : 'Miễn phí vận chuyển';

  const voucherTitle = voucher.title || (
    isTransit
      ? `Giảm ${discountDisplay} tối đa ${Math.round(voucher.maxDiscount / 1000)}k cho chuyến xe T&M Transit`
      : `Giảm ${discountDisplay} cho đơn hàng T&M Meal`
  );

  const providerLabel = isTransit
    ? 'Hệ thống T&M'
    : (voucher.providerType === 'RESTAURANT' ? 'T&M Quán Ăn' : 'Hệ thống T&M');

  const expiryDate = voucher.expiredAt
    ? new Date(voucher.expiredAt).toLocaleDateString('vi-VN')
    : '31/12/2026';

  const handleAction = async () => {
    if (isClaimed) {
      // Dùng ngay -> điều hướng sang đặt xe hoặc đặt món
      if (isTransit) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(tabs)');
      }
      return;
    }

    try {
      setIsSubmitting(true);
      await voucherService.claimVoucher(voucher.id, 1);
      Alert.alert('Thành công', 'Đã nhận ưu đãi vào ví của bạn!', [
        {
          text: 'Đóng',
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      Alert.alert('Lỗi nhận ưu đãi', err.message || 'Không thể nhận voucher lúc này.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* 1. Hero Section (Màu xanh lớn trên cùng) */}
      <View style={styles.heroBanner}>
        {/* Thanh điều hướng quay lại */}
        <View style={styles.headerNav}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </Pressable>
          <ThemedText style={styles.headerTitle}>Chi tiết ưu đãi</ThemedText>
        </View>

        {/* Mức giảm khổng lồ */}
        <ThemedText style={styles.heroDiscountText}>{discountDisplay}</ThemedText>

        {/* Mức giảm tối đa */}
        <ThemedText style={styles.heroMaxDiscountText}>{maxDiscountText}</ThemedText>

        {/* Tên Voucher */}
        <ThemedText style={styles.heroVoucherTitle}>{voucherTitle}</ThemedText>

        {/* Nhãn nhà cung cấp */}
        <View style={styles.providerBadge}>
          <ThemedText style={styles.providerBadgeText}>{providerLabel}</ThemedText>
        </View>
      </View>

      {/* 2. Thông tin chi tiết các điều khoản */}
      <View style={styles.contentContainer}>
        <View style={styles.detailCard}>
          {/* Đơn tối thiểu */}
          <View style={styles.detailRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="logo-usd" size={18} color="#00B5B8" />
              <ThemedText style={styles.rowLabel}>Đơn tối thiểu</ThemedText>
            </View>
            <ThemedText style={styles.rowValue}>
              {voucher.minValue > 0
                ? `${Number(voucher.minValue).toLocaleString('vi-VN')}đ`
                : 'Không yêu cầu'}
            </ThemedText>
          </View>

          <View style={styles.rowDivider} />

          {/* Hạn sử dụng */}
          <View style={styles.detailRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="time-outline" size={18} color="#00B5B8" />
              <ThemedText style={styles.rowLabel}>Hạn sử dụng</ThemedText>
            </View>
            <ThemedText style={styles.expiryValue}>{expiryDate}</ThemedText>
          </View>

          <View style={styles.rowDivider} />

          {/* Số lượng: Đổi theo trạng thái Đã nhận vs Mới */}
          <View style={styles.detailRow}>
            <View style={styles.rowLeft}>
              <Ionicons
                name={
                  isClaimed
                    ? 'cube-outline'
                    : voucher.providerType === 'RESTAURANT'
                    ? 'person-outline'
                    : 'pricetag-outline'
                }
                size={18}
                color="#00B5B8"
              />
              <ThemedText style={styles.rowLabel}>
                {isClaimed
                  ? 'Số lượng'
                  : voucher.providerType === 'RESTAURANT'
                  ? 'Số lượng tối đa có thể nhận'
                  : 'Số lượng có thể nhận'}
              </ThemedText>
            </View>
            <ThemedText style={styles.quantityValue}>
              {isClaimed
                ? voucher.quantity || 1
                : voucher.claimableCount || voucher.numberOfVouchersPerCus || 1}
            </ThemedText>
          </View>
        </View>

        {/* 3. Nút hành động */}
        <View style={styles.bottomActionArea}>
          <Pressable
            style={[styles.primaryActionButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleAction}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.primaryActionText}>
                {isClaimed ? 'Sử dụng ngay' : 'Nhận ưu đãi'}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </ThemedView>
  );
}
