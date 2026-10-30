import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

export function VoucherTicketCard({ voucher, isClaimed = false, onClaim, onPress }) {
  const isTransit = String(voucher.type).toUpperCase() === 'TRANSIT';
  const badgeColor = isTransit ? '#00B5B8' : '#FF8A00';
  const softBgColor = isTransit ? '#E6F8F8' : '#FFF3E8';

  // Định dạng mức giảm (20% hoặc 30k)
  const isPercent = Number(voucher.discount) < 100;
  const isFreeship = (voucher.minValue === 0 || !voucher.minValue) && Number(voucher.discount) <= 20000 && !isPercent;

  const discountDisplay = isPercent
    ? `${Math.round(voucher.discount)}%`
    : `${Math.round(voucher.discount / 1000)}k`;

  // Mức giảm tối đa (Tối đa 50k / Giảm trực tiếp / Freeship)
  const maxDiscountText = isFreeship
    ? 'Freeship'
    : (voucher.maxDiscount && voucher.maxDiscount > 0 && isPercent)
    ? `Tối đa ${Math.round(voucher.maxDiscount / 1000)}k`
    : 'Giảm trực tiếp';

  // Điều kiện đơn tối thiểu
  const minOrderText = voucher.minValue > 0
    ? `Đơn tối thiểu: ${Number(voucher.minValue).toLocaleString('vi-VN')}đ`
    : 'Không yêu cầu đơn tối thiểu';

  // Ngày hết hạn định dạng DD/MM/YYYY
  let expiryDate = '31/12/2026';
  if (voucher.expiredAt) {
    try {
      const d = new Date(voucher.expiredAt);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      expiryDate = `${day}/${month}/${year}`;
    } catch {
      expiryDate = '31/12/2026';
    }
  }

  // Tên tiêu đề voucher
  const voucherTitle = voucher.title || (
    isFreeship
      ? 'Miễn phí giao hàng (Freeship)'
      : isTransit
      ? `Giảm ${discountDisplay}${voucher.maxDiscount > 0 ? ` tối đa ${Math.round(voucher.maxDiscount / 1000)}k` : ''} cho chuyến xe T&M Transit`
      : `Giảm ${discountDisplay} cho đơn hàng T&M Meal`
  );

  return (
    <Pressable style={styles.cardContainer} onPress={onPress}>
      {/* 1. Khối màu bên trái (Xanh ngọc Transit / Cam Meal) */}
      <View style={[styles.leftBlock, { backgroundColor: badgeColor }]}>
        <Text style={styles.discountText}>{discountDisplay}</Text>
        <Text style={styles.maxDiscountText}>{maxDiscountText}</Text>
      </View>

      {/* 2. Đường phân cách nét đứt & Nốt khuyết tròn cắt vé */}
      <View style={styles.separatorContainer}>
        {/* Đường kẻ nét đứt chạy dọc */}
        <View style={styles.dashedLine} />

        {/* Lỗ bấm tròn (Notch) đồng màu nền màn hình để cắt khuyết 2 bên như vé thật */}
        <View style={styles.centerNotch} />
      </View>

      {/* 3. Phần thân vé bên phải (Nền trắng) */}
      <View style={styles.rightBlock}>
        <Text style={styles.titleText} numberOfLines={2}>
          {voucherTitle}
        </Text>

        <Text style={styles.conditionText} numberOfLines={1}>
          {minOrderText}
        </Text>

        <View style={styles.footerRow}>
          {/* Hạn sử dụng màu đỏ */}
          <View style={styles.expiryBox}>
            <Ionicons name="time-outline" size={13} color="#EF4444" />
            <Text style={styles.expiryText}>HSD: {expiryDate}</Text>
          </View>

          {/* Nút Nhận hoặc Huy hiệu Đã nhận */}
          {isClaimed ? (
            <View style={[styles.claimedBadge, { backgroundColor: softBgColor }]}>
              <Text style={[styles.claimedBadgeText, { color: badgeColor }]}>
                Đã nhận (x{voucher.quantity || 1})
              </Text>
            </View>
          ) : (
            <Pressable
              style={[styles.actionBtn, { backgroundColor: softBgColor }]}
              onPress={(e) => {
                e.stopPropagation?.();
                onClaim?.(voucher);
              }}
              hitSlop={6}
            >
              <Text style={[styles.actionBtnText, { color: badgeColor }]}>
                Nhận
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 14,
    height: 102,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  leftBlock: {
    width: 86,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  maxDiscountText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 13,
    marginTop: 2,
    textAlign: 'center',
  },
  separatorContainer: {
    width: 1,
    height: '100%',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashedLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  centerNotch: {
    position: 'absolute',
    left: -7,
    top: '50%',
    marginTop: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F8F9FA',
    zIndex: 10,
  },
  rightBlock: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'space-between',
  },
  titleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 16.5,
  },
  conditionText: {
    fontSize: 10.5,
    color: '#6B7280',
    lineHeight: 14,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 30,
  },
  expiryBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  expiryText: {
    fontSize: 10.5,
    color: '#EF4444',
    fontWeight: '500',
    lineHeight: 14,
  },
  actionBtn: {
    minWidth: 70,
    height: 29,
    paddingHorizontal: 16,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  claimedBadge: {
    minWidth: 70,
    height: 29,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimedBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});
