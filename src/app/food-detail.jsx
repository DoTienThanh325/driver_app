import { getUserErrorMessage } from '../utils/error-message';
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, router } from 'expo-router';
import { foodService } from '@/services/food.service';
import { voucherService } from '@/services/voucher.service';
import { normalizeImageUrl, DEFAULT_FOOD_IMAGE } from '@/utils/image-url';
import { foodDetailStyles as styles } from '@/styles/screens/food-detail.styles';
import * as Location from 'expo-location';
import { reverseGeocodeCoords } from '@/utils/geocoding';

export default function FoodDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id, isOwner } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [imageError, setImageError] = useState(false);
  const [claimingVoucherId, setClaimingVoucherId] = useState(null);
  const [claimedVoucherIds, setClaimedVoucherIds] = useState(new Set());
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Lưu trữ vị trí khách ngầm để phản hồi tức thì khi bấm Đặt món (< 100ms)
  const userLocationRef = useRef({
    latitude: 21.028511,
    longitude: 105.854444,
    address: 'Vị trí hiện tại của bạn',
  });

  // Pre-fetch vị trí GPS của khách ngầm ngay khi mở xem chi tiết món ăn (không block giao diện)
  useEffect(() => {
    let isMounted = true;
    async function prefetchLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        // 1. Đọc vị trí lưu gần nhất trong cache hệ điều hành (rất nhanh < 50ms)
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown?.coords && isMounted) {
          userLocationRef.current.latitude = lastKnown.coords.latitude;
          userLocationRef.current.longitude = lastKnown.coords.longitude;
          reverseGeocodeCoords(lastKnown.coords.latitude, lastKnown.coords.longitude)
            .then((addr) => {
              if (addr && isMounted) {
                userLocationRef.current.address = addr;
              }
            })
            .catch(() => {});
        }

        // 2. Cập nhật vị trí GPS chính xác hơn ở nền
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
          .then(async (loc) => {
            if (loc?.coords && isMounted) {
              userLocationRef.current.latitude = loc.coords.latitude;
              userLocationRef.current.longitude = loc.coords.longitude;
              const freshAddr = await reverseGeocodeCoords(loc.coords.latitude, loc.coords.longitude);
              if (freshAddr && isMounted) {
                userLocationRef.current.address = freshAddr;
              }
            }
          })
          .catch(() => {});
      } catch (e) {
        // Fallback ngầm không gián đoạn người dùng
      }
    }

    prefetchLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleClaimVoucher = async (voucher) => {
    if (!voucher?.id || claimedVoucherIds.has(voucher.id)) return;
    const quantity = Number(
      voucher.numberOfVouchersPerCus ||
      voucher.numberOfVouchers ||
      voucher.quantity ||
      1
    );
    try {
      setClaimingVoucherId(voucher.id);
      await voucherService.claimVoucher(voucher.id, quantity);
      setClaimedVoucherIds((prev) => new Set(prev).add(voucher.id));
      Alert.alert(
        'Thành công',
        `Đã nhận ${quantity > 1 ? `${quantity} ` : ''}voucher của nhà hàng vào ví ưu đãi của bạn!`
      );
    } catch (err) {
      if (/đã nhận|already claimed/i.test(err.serverMessage ?? err.message ?? '')) {
        setClaimedVoucherIds((prev) => new Set(prev).add(voucher.id));
        Alert.alert('Thông báo', 'Bạn đã nhận voucher này rồi.');
      } else {
        Alert.alert('Thông báo', getUserErrorMessage(err, 'Không thể nhận ưu đãi lúc này. Vui lòng thử lại.'));
      }
    } finally {
      setClaimingVoucherId(null);
    }
  };

  useEffect(() => {
    setImageError(false);
  }, [selectedIndex]);

  useEffect(() => {
    async function loadFoodDetail() {
      try {
        if (!id) return;
        const res = await foodService.getFoodDetail(id);
        setDetail(res);
      } catch (err) {
        console.warn('Lỗi tải chi tiết món ăn:', err.message);
      } finally {
        setLoading(false);
      }
    }
    loadFoodDetail();
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00B5B8" />
      </View>
    );
  }

  if (!detail || !detail.food) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#D1D5DB" />
        <Text style={[styles.errorText, { marginTop: 12 }]}>
          Không tìm thấy thông tin món ăn hoặc món đã ngừng phục vụ.
        </Text>
        <TouchableOpacity
          style={{ marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#00B5B8', borderRadius: 12 }}
          onPress={() => router.back()}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { food, restaurant, vouchers } = detail;
  const options = food.options || [];

  // Lấy option đang được chọn
  const currentOption = options[selectedIndex] || options[0] || {};
  const currentPrice = currentOption.price ?? 0;

  // Ảnh lớn trên cùng chuyển đổi linh hoạt theo option được bấm chọn (hỗ trợ cả URL ngoài lẫn MinIO)
  const rawHeroImage = currentOption.imageUrl || options[0]?.imageUrl;
  const resolvedHeroUrl = normalizeImageUrl(rawHeroImage) || DEFAULT_FOOD_IMAGE;
  const heroUri = imageError ? DEFAULT_FOOD_IMAGE : resolvedHeroUrl;

  const formatVND = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price);

  const handleOrderFood = () => {
    if (!food || !currentOption) return;
    setIsSubmittingOrder(true);
    try {
      // 1. Lấy vị trí đã pre-fetch ngầm (hoặc mặc định) ngay lập tức mà không phải chờ đợi
      const custLat = userLocationRef.current?.latitude || 21.028511;
      const custLon = userLocationRef.current?.longitude || 105.854444;
      const custAddress = userLocationRef.current?.address || 'Vị trí hiện tại của bạn';

      // 2. Điểm lấy món (Nhà hàng)
      const restAddress = restaurant?.locationAddress || 'Nhà hàng đối tác T&M';
      const restLat = restaurant?.locationLatitude || 20.9806;
      const restLon = restaurant?.locationLongitude || 105.7874;

      // 3. Chuẩn bị món ăn
      const foodItem = {
        foodId: food.id,
        foodName: food.name,
        size: currentOption.size || 'Tiêu chuẩn',
        price: currentPrice,
        quantity: quantity,
        totalPrice: currentPrice * quantity,
        imageUrl: heroUri,
      };

      // 4. Chuyển sang màn hình xác nhận đơn món ngay tức khắc (< 100ms)
      router.push({
        pathname: '/trip-confirm',
        params: {
          shippingType: 'FOOD_DELIVERY',
          restaurantId: restaurant?.id || food.restaurantId || '',
          restaurantName: restaurant?.name || 'Nhà hàng đối tác',
          pickUpAddress: restAddress,
          pickUpLat: restLat,
          pickUpLon: restLon,
          destinationAddress: custAddress,
          destLat: custLat,
          destLon: custLon,
          foodsJson: JSON.stringify([foodItem]),
          totalFoodPrice: currentPrice * quantity,
        },
      });
    } catch (err) {
      Alert.alert('Không thể tiếp tục', getUserErrorMessage(err, 'Có lỗi xảy ra khi chuẩn bị đơn đặt món.'));
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Nút Back (và nút Edit cho chủ quán) ghim cố định trên đầu khi scroll */}
      <View
        style={[
          styles.stickyHeader,
          { top: insets.top > 0 ? insets.top + 6 : Platform.OS === 'ios' ? 44 : 12 },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.floatingBackButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>

        {isOwner === 'true' && (
          <TouchableOpacity
            style={styles.floatingEditButton}
            onPress={() => router.push(`/edit-food?id=${id}`)}
            activeOpacity={0.7}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={20} color="#00B5B8" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Hero Image Container (Đổi theo option được chọn) */}
        <View style={styles.heroContainer}>
          <Image
            source={{ uri: heroUri }}
            style={styles.heroImage}
            contentFit="cover"
            transition={250}
            onError={() => setImageError(true)}
          />
        </View>

        {/* 2. Tiêu đề món, huy hiệu size đang chọn & Giá tiền tương ứng */}
        <View style={styles.mainInfo}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.foodName}>{food.name}</Text>
              {currentOption.size && (
                <View style={styles.selectedSizeTag}>
                  <Text style={styles.selectedSizeTagText}>
                    Loại: {currentOption.size}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.priceHighlight}>{formatVND(currentPrice)}</Text>
          </View>

          {/* 3. Thông tin Quán ăn (Rating lấy trực tiếp từ Database, Bỏ Distance) */}
          {restaurant && (
            <View style={styles.restaurantRow}>
              <View style={styles.homeIconBox}>
                <Ionicons name="home-outline" size={16} color="#EA580C" />
              </View>
              <View style={styles.restaurantMeta}>
                <Text style={styles.restaurantName}>{restaurant.name}</Text>
                <Text style={styles.restaurantSub}>
                  {restaurant.rating != null ? Number(restaurant.rating).toFixed(1) : '5.0'} ★ (
                  {food.totalReviews != null ? `${food.totalReviews}+` : '100+'} đánh giá)
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* 4. Khối Ưu đãi của nhà hàng (CHỈ HIỂN THỊ KHI CÓ VOUCHER) */}
        {vouchers && vouchers.length > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Ionicons name="pricetag-outline" size={17} color="#EA580C" />
                <Text style={styles.sectionTitle}>Ưu đãi của nhà hàng</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.voucherList}
              >
                {vouchers.map((v, idx) => {
                  const salePercent = v.discount
                    ? (v.discount <= 100 ? `${Math.round(v.discount)}%` : `${Math.round(v.discount / 1000)}k`)
                    : 'Ưu đãi';
                  const minOrder = v.minValue > 0 ? `Đơn tối thiểu: ${formatVND(v.minValue)}` : 'Đơn tối thiểu: 0đ';
                  const expiryText = v.expiredAt
                    ? `HSD: ${v.expiredAt.includes('T') ? v.expiredAt.split('T')[0] : v.expiredAt.substring(0, 10)}`
                    : 'HSD: 30 ngày';
                  const isClaimed = claimedVoucherIds.has(v.id);
                  const isClaiming = claimingVoucherId === v.id;
                  const quantity = Number(
                    v.numberOfVouchersPerCus ||
                    v.numberOfVouchers ||
                    v.quantity ||
                    1
                  );

                  return (
                    <View key={v.id || `voucher-item-${idx}`} style={styles.voucherCard}>
                      {/* 1. Phần trăm Sale */}
                      <View style={styles.voucherBadge}>
                        <Text style={styles.voucherBadgeText}>{salePercent}</Text>
                        <Text style={styles.voucherBadgeSubText}>GIẢM</Text>
                      </View>

                      {/* 2. Đơn tối thiểu & HSD & Số lượng do Business tạo */}
                      <View style={styles.voucherInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.voucherMinText}>
                            {minOrder}
                          </Text>
                          {quantity > 1 && (
                            <View style={styles.voucherQuantityBadge}>
                              <Text style={styles.voucherQuantityText}>x{quantity}</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.voucherExpiryText}>
                          {expiryText}
                        </Text>
                      </View>

                      {/* 3. Button Nhận gọi API /api/vouchers/claim */}
                      <TouchableOpacity
                        style={[styles.voucherClaimBtn, isClaimed && styles.voucherClaimBtnClaimed]}
                        activeOpacity={0.8}
                        disabled={isClaimed || isClaiming}
                        onPress={() => handleClaimVoucher(v)}
                      >
                        {isClaiming ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text style={[styles.voucherClaimBtnText, isClaimed && styles.voucherClaimBtnTextClaimed]}>
                            {isClaimed
                              ? (quantity > 1 ? `Đã nhận (x${quantity})` : 'Đã nhận')
                              : (quantity > 1 ? `Nhận x${quantity}` : 'Nhận')}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </>
        )}

        <View style={styles.divider} />

        {/* 5. Chọn loại (Chỉ hiển thị size và giá, ảnh hiển thị ở mục ảnh chính) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn loại</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.optionsList}
          >
            {options.map((opt, idx) => {
              const isSelected = idx === selectedIndex;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedIndex(idx)} // Click đổi ảnh chính, size và giá
                >
                  <View style={styles.optionDetails}>
                    <Text
                      style={[styles.optionSize, isSelected && styles.optionSizeSelected]}
                      numberOfLines={2}
                    >
                      {opt.size}
                    </Text>
                    <Text style={[styles.optionPrice, isSelected && styles.optionPriceSelected]}>
                      {formatVND(opt.price)}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.selectedCheckBadge}>
                      <Ionicons name="checkmark-circle" size={16} color="#00B5B8" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 5. Chọn số lượng món (Chỉ hiển thị cho khách đặt mua) */}
        {isOwner !== 'true' && (
          <View style={[styles.section, { marginTop: 20 }]}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="cart-outline" size={18} color="#00B5B8" />
              <Text style={styles.sectionTitle}>Số lượng món</Text>
            </View>
            <View style={styles.quantityCard}>
              {/* Hàng 1: Tên món ăn và kích cỡ / đơn giá */}
              <View style={styles.quantityFoodInfo}>
                <Text style={styles.quantityFoodName} numberOfLines={2}>
                  {food.name}
                </Text>
                <Text style={styles.quantityFoodOption}>
                  {currentOption.size ? `Size: ${currentOption.size}` : 'Tiêu chuẩn'} • {formatVND(currentPrice)} / phần
                </Text>
              </View>

              {/* Đường gạch phân chia */}
              <View style={styles.quantityDivider} />

              {/* Hàng 2: Nhãn số lượng + Tạm tính bên trái, bộ đếm [-] 1 [+] bên phải */}
              <View style={styles.quantityActionRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.quantityActionLabel}>Số lượng đặt</Text>
                  <Text style={styles.quantitySubTotal}>
                    Tạm tính: <Text style={{ color: '#00B5B8', fontWeight: '800' }}>{formatVND(currentPrice * quantity)}</Text>
                  </Text>
                </View>

                <View style={styles.quantityCounterBox}>
                  <TouchableOpacity
                    style={[styles.counterBtn, quantity <= 1 && styles.counterBtnDisabled]}
                    disabled={quantity <= 1}
                    onPress={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={16} color={quantity <= 1 ? '#9CA3AF' : '#008B8D'} />
                  </TouchableOpacity>

                  <Text style={styles.counterValue}>
                    {quantity}
                  </Text>

                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setQuantity((prev) => prev + 1)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color="#00B5B8" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 6. Sticky Bottom Checkout Bar or Owner Action Bar */}
      <SafeAreaView style={styles.bottomBarContainer} edges={['bottom']}>
        <View style={styles.bottomBar}>
          <View style={styles.totalBlock}>
            <Text style={styles.totalLabel}>
              {isOwner === 'true'
                ? 'Đang quản lý'
                : `Tổng cộng ${quantity > 1 ? `(${quantity} phần)` : ''}`}
            </Text>
            <Text style={styles.totalPrice}>{formatVND(currentPrice * quantity)}</Text>
          </View>
          {isOwner === 'true' ? (
            <TouchableOpacity
              style={[styles.orderButton, { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB' }]}
              activeOpacity={0.85}
              onPress={() => router.push(`/edit-food?id=${id}`)}
            >
              <Text style={[styles.orderButtonText, { color: '#1F2937' }]}>Chỉnh sửa món</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.orderButton, isSubmittingOrder && { opacity: 0.7 }]}
              activeOpacity={0.85}
              disabled={isSubmittingOrder}
              onPress={handleOrderFood}
            >
              {isSubmittingOrder ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.orderButtonText}>Đặt giao ngay</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}
