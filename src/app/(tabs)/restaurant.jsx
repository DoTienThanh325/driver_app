import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { FoodCard } from '@/components/ui/food-card';
import { CreateFoodModal } from '@/components/ui/create-food-modal';
import { CreateVoucherModal } from '@/components/ui/create-voucher-modal';
import { foodService } from '@/services/food.service';
import { voucherService } from '@/services/voucher.service';
import { businessService } from '@/services/business.service';
import { userStorage } from '@/services/storage/user.storage';
import { offlineCacheStorage } from '@/services/storage/offline-cache.storage';
import { restaurantTabStyles as styles } from '@/styles/screens/restaurant-tab.styles';

const DEFAULT_DEMO_FOODS = [
  {
    id: 'demo-food-1',
    name: 'Phở Bò Tái Nạm',
    restaurantName: 'Nhà hàng của tôi',
    minPrice: 45000,
    maxPrice: 60000,
    averageRating: 4.9,
    totalReviews: 128,
    thumbnailUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=500',
    options: [
      { size: 'Tô Nhỏ', price: 45000 },
      { size: 'Tô Lớn', price: 55000 },
      { size: 'Đặc Biệt', price: 60000 },
    ],
  },
  {
    id: 'demo-food-2',
    name: 'Phở Bò Sốt Vang',
    restaurantName: 'Nhà hàng của tôi',
    minPrice: 55000,
    maxPrice: 55000,
    averageRating: 5.0,
    totalReviews: 94,
    thumbnailUrl: 'https://images.unsplash.com/photo-1594998893017-36147cbcae05?w=500',
    options: [{ size: 'Tô Chuẩn', price: 55000 }],
  },
  {
    id: 'demo-food-3',
    name: 'Quẩy Giòn Hà Nội',
    restaurantName: 'Nhà hàng của tôi',
    minPrice: 5000,
    maxPrice: 10000,
    averageRating: 4.8,
    totalReviews: 310,
    thumbnailUrl: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0?w=500',
    options: [
      { size: '1 Đôi', price: 5000 },
      { size: 'Đĩa 3 Đôi', price: 10000 },
    ],
  },
  {
    id: 'demo-food-4',
    name: 'Trà Tắc Mật Ong',
    restaurantName: 'Nhà hàng của tôi',
    minPrice: 15000,
    maxPrice: 15000,
    averageRating: 4.9,
    totalReviews: 87,
    thumbnailUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=500',
    options: [{ size: 'Cốc 500ml', price: 15000 }],
  },
];

export default function RestaurantScreen() {
  const [activeSubTab, setActiveSubTab] = useState('food'); // 'food' | 'voucher'
  const [businessInfo, setBusinessInfo] = useState(null);
  const businessInfoRef = useRef(null);

  // Giữ ref đồng bộ để các callback không cần re-create liên tục
  useEffect(() => {
    businessInfoRef.current = businessInfo;
  }, [businessInfo]);

  // Món ăn
  const [foods, setFoods] = useState([]);
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [isCreateFoodModalOpen, setIsCreateFoodModalOpen] = useState(false);

  // Voucher
  const [vouchers, setVouchers] = useState([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);
  const [isCreateVoucherModalOpen, setIsCreateVoucherModalOpen] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  // 1. Tải thông tin Nhà hàng (Check cache trước, nếu cache không có gì hoặc force thì gọi API)
  const loadRestaurantInfo = useCallback(async (force = false) => {
    let info = null;
    if (!force) {
      info = await userStorage.getBusinessInfo();
      if (!info) {
        info = await offlineCacheStorage.getBusinessProfile();
      }
    }

    // Nếu cache không có gì (máy chưa lưu cache) hoặc thiếu restaurantId, hoặc ép làm mới (force) -> Gọi API
    if (!info || (!info.restaurantId && !info.id) || force) {
      try {
        const backendData = await businessService.getBusinessRegistration();
        if (backendData) {
          const merged = {
            ...(info || {}),
            ...backendData,
            restaurantId:
              backendData.restaurantId ||
              backendData.businessRegistrationId ||
              backendData.id ||
              info?.restaurantId,
            restaurantName:
              backendData.restaurantName || info?.restaurantName || 'Nhà hàng của tôi',
            restaurantAddress:
              backendData.restaurantAddress || info?.restaurantAddress || '',
          };
          info = merged;
          await Promise.all([
            userStorage.saveBusinessInfo(merged),
            offlineCacheStorage.saveBusinessProfile(backendData),
          ]);
        }
      } catch (e) {
        console.warn('Lỗi lấy thông tin nhà hàng qua API:', e?.message);
      }
    }

    businessInfoRef.current = info;
    setBusinessInfo(info);
    return info;
  }, []);

  // 2. Tải danh sách Món ăn của quán (Check cache trước, nếu cache không có gì thì call API rồi cập nhật cache)
  const loadFoods = useCallback(
    async (currentRestId, force = false) => {
      const targetId = currentRestId || businessInfoRef.current?.restaurantId || businessInfoRef.current?.id;
      if (!targetId) {
        setFoods([]);
        setLoadingFoods(false);
        return;
      }

      try {
        // Kiểm tra cache trước nếu không force làm mới (kể cả khi cache là mảng rỗng [] cũng chấp nhận)
        if (!force) {
          const cached = await offlineCacheStorage.getRestaurantFoods(targetId);
          if (cached !== null && Array.isArray(cached)) {
            setFoods(cached);
            setLoadingFoods(false);
            return;
          }
        }

        // Nếu cache chưa có hoặc đang kéo làm mới (force) -> Call API lấy dữ liệu thực tế
        setLoadingFoods(true);
        const list = await foodService.getFoodsByRestaurant(targetId);
        const realList = Array.isArray(list) ? list : [];
        setFoods(realList);

        // Cập nhật lại cache thiết bị với dữ liệu vừa nhận được từ API
        await offlineCacheStorage.saveRestaurantFoods(realList, targetId);
      } catch (err) {
        console.warn('Lỗi tải danh sách món ăn nhà hàng từ API:', err?.message);
        const fallback = await offlineCacheStorage.getRestaurantFoods(targetId);
        if (fallback) setFoods(fallback);
      } finally {
        setLoadingFoods(false);
      }
    },
    []
  );

  // 3. Tải danh sách Voucher của quán (Check cache trước, nếu cache không có gì thì call API rồi cập nhật cache)
  const loadVouchers = useCallback(
    async (currentRestId, force = false) => {
      const targetId = currentRestId || businessInfoRef.current?.restaurantId || businessInfoRef.current?.id;
      if (!targetId) {
        setVouchers([]);
        setLoadingVouchers(false);
        return;
      }

      try {
        // Kiểm tra cache trước nếu không force làm mới
        if (!force) {
          const cached = await offlineCacheStorage.getRestaurantVouchers(targetId);
          if (cached !== null && Array.isArray(cached)) {
            const validCached = cached.filter((v) => !v.id?.startsWith('demo-voucher'));
            setVouchers(validCached);
            setLoadingVouchers(false);
            return;
          }
        }

        // Nếu cache chưa có hoặc đang kéo làm mới (force) -> Call API lấy dữ liệu thực tế
        setLoadingVouchers(true);
        const list = await voucherService.getRestaurantVouchers(targetId);
        const realList = (Array.isArray(list) ? list : []).filter(
          (v) => !v.id?.startsWith('demo-voucher')
        );
        setVouchers(realList);

        // Cập nhật lại cache thiết bị với dữ liệu vừa nhận được từ API
        await offlineCacheStorage.saveRestaurantVouchers(realList, targetId);
      } catch (err) {
        console.warn('Lỗi tải danh sách voucher nhà hàng từ API:', err?.message);
        const fallback = await offlineCacheStorage.getRestaurantVouchers(targetId);
        if (fallback) {
          setVouchers(fallback.filter((v) => !v.id?.startsWith('demo-voucher')));
        }
      } finally {
        setLoadingVouchers(false);
      }
    },
    []
  );

  const initData = useCallback(
    async (force = false) => {
      const info = await loadRestaurantInfo(force);
      const restId = info?.restaurantId || info?.id;
      await Promise.all([loadFoods(restId, force), loadVouchers(restId, force)]);
    },
    [loadRestaurantInfo, loadFoods, loadVouchers]
  );

  const initDataRef = useRef(initData);
  useEffect(() => {
    initDataRef.current = initData;
  }, [initData]);

  // Chỉ kích hoạt một lần duy nhất khi người dùng chuyển tab sang Restaurant, tránh trigger vòng lặp vô hạn
  useFocusEffect(
    useCallback(() => {
      initDataRef.current?.(false);
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await initData(true);
    setRefreshing(false);
  };

  const formatVND = (price) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price || 0);

  const handleCreateFoodSuccess = async (mockItem) => {
    const targetId = businessInfo?.restaurantId || businessInfo?.id;
    if (mockItem) {
      const updated = [mockItem, ...foods];
      setFoods(updated);
      if (targetId) {
        await offlineCacheStorage.saveRestaurantFoods(updated, targetId);
      }
    } else {
      await loadFoods(targetId, true);
    }
  };

  const handleCreateVoucherSuccess = async (mockItem) => {
    const targetId = businessInfo?.restaurantId || businessInfo?.id;
    if (mockItem) {
      const updated = [mockItem, ...vouchers];
      setVouchers(updated);
      if (targetId) {
        await offlineCacheStorage.saveRestaurantVouchers(updated, targetId);
      }
    } else {
      await loadVouchers(targetId, true);
    }
  };

  const restaurantName = businessInfo?.restaurantName || 'Nhà hàng của tôi';
  const restaurantAddress = businessInfo?.restaurantAddress || 'Đang cập nhật địa chỉ';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#00B5B8" />

      {/* 1. Header Thông tin Quán ăn & Switcher 2 tab con */}
      <View style={styles.headerContainer}>
        <View style={styles.restaurantHeaderRow}>
          <View style={styles.restaurantIconBox}>
            <Ionicons name="storefront" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.restaurantMetaInfo}>
            <View style={styles.restaurantNameRow}>
              <Text style={styles.restaurantNameText} numberOfLines={1}>
                {restaurantName}
              </Text>
              <View style={styles.openBadge}>
                <Text style={styles.openBadgeText}>Đang mở</Text>
              </View>
            </View>
            <Text style={styles.restaurantAddressText}>
              <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.8)" /> {restaurantAddress}
            </Text>
          </View>
        </View>

        {/* Thanh chuyển đổi 2 phân hệ (KHÔNG hiển thị số đếm theo yêu cầu) */}
        <View style={styles.switcherContainer}>
          <TouchableOpacity
            style={[styles.switcherButton, activeSubTab === 'food' && styles.switcherButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveSubTab('food')}
          >
            <Ionicons
              name="fast-food-outline"
              size={15}
              color={activeSubTab === 'food' ? '#0D9488' : '#FFFFFF'}
            />
            <Text style={[styles.switcherText, activeSubTab === 'food' && styles.switcherTextActive]}>
              Món ăn
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switcherButton, activeSubTab === 'voucher' && styles.switcherButtonActive]}
            activeOpacity={0.8}
            onPress={() => setActiveSubTab('voucher')}
          >
            <Ionicons
              name="ticket-outline"
              size={15}
              color={activeSubTab === 'voucher' ? '#0D9488' : '#FFFFFF'}
            />
            <Text style={[styles.switcherText, activeSubTab === 'voucher' && styles.switcherTextActive]}>
              Voucher
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. Nội dung phân hệ con: Món ăn */}
      {activeSubTab === 'food' && (
        <View style={{ flex: 1 }}>
          {/* SubHeader: Tiêu đề danh sách & Nút + Thêm món (Nền trắng viền border) */}
          <View style={styles.subHeaderBar}>
            <View>
              <Text style={styles.subHeaderTitle}>Thực đơn món ăn</Text>
              <Text style={styles.subHeaderDesc}>Món ăn đang phục vụ tại quán</Text>
            </View>
            <TouchableOpacity
              style={styles.actionWhiteBtn}
              activeOpacity={0.8}
              onPress={() => setIsCreateFoodModalOpen(true)}
            >
              <Ionicons name="add" size={16} color="#1F2937" />
              <Text style={styles.actionWhiteBtnText}>Thêm món</Text>
            </TouchableOpacity>
          </View>

          {loadingFoods ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="large" color="#00B5B8" />
              <Text style={styles.emptySub}>Đang tải thực đơn quán...</Text>
            </View>
          ) : (
            <FlatList
              data={foods}
              keyExtractor={(item, index) => item.id || `food-${index}`}
              numColumns={2}
              contentContainerStyle={styles.gridContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#00B5B8']} />
              }
              renderItem={({ item }) => (
                <FoodCard
                  food={item}
                  onPress={() => router.push(`/food-detail?id=${item.id}&isOwner=true`)}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="restaurant-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>Chưa có món ăn nào</Text>
                  <Text style={styles.emptySub}>
                    Bấm vào "+ Thêm món" ở trên để đưa món ăn đầu tiên vào thực đơn quán nhé.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* 3. Nội dung phân hệ con: Voucher Nhà hàng */}
      {activeSubTab === 'voucher' && (
        <View style={{ flex: 1 }}>
          {/* Nút + Tạo Voucher (Màu xanh chủ đạo app #00B5B8) */}
          <View style={styles.voucherHeaderBar}>
            <TouchableOpacity
              style={styles.actionPrimaryTealBtn}
              activeOpacity={0.8}
              onPress={() => setIsCreateVoucherModalOpen(true)}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.actionPrimaryTealBtnText}>Tạo Voucher</Text>
            </TouchableOpacity>
          </View>

          {loadingVouchers ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="large" color="#00B5B8" />
              <Text style={styles.emptySub}>Đang tải danh sách ưu đãi...</Text>
            </View>
          ) : (
            <FlatList
              data={vouchers}
              keyExtractor={(item, index) => item.id || `voucher-${index}`}
              contentContainerStyle={styles.voucherListContainer}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#00B5B8']} />
              }
              renderItem={({ item }) => {
                const discountText = item.discount
                  ? item.discount >= 1000
                    ? `${Math.round(item.discount / 1000)}K`
                    : `${item.discount}%`
                  : 'ƯU ĐÃI';

                const quantityNum = item.numberOfVouchersPerCus || 1;

                return (
                  <View style={styles.voucherCard}>
                    <View style={styles.voucherCutoutLeft} />
                    <View style={styles.voucherCutoutRight} />

                    {/* Khối giảm giá màu cam nổi bật */}
                    <View style={styles.voucherDiscountBox}>
                      <Text style={styles.voucherDiscountValue}>{discountText}</Text>
                      <Text style={styles.voucherDiscountTag}>GIẢM</Text>
                    </View>

                    <View style={styles.voucherContent}>
                      <View style={styles.voucherHeaderRow}>
                        <Text style={styles.voucherTitleText}>
                          Giảm {discountText} {item.maxDiscount ? `tối đa ${formatVND(item.maxDiscount)}` : ''}
                        </Text>
                        <View style={styles.voucherStatusBadge}>
                          <Text style={styles.voucherStatusText}>Đang chạy</Text>
                        </View>
                      </View>

                      <Text style={styles.voucherMinText}>
                        Áp dụng cho đơn từ {formatVND(item.minValue || 0)}
                      </Text>

                      <View style={styles.voucherFooterRow}>
                        <Text style={styles.voucherExpiryText}>
                          HSD: {item.expiredAt ? item.expiredAt.substring(0, 10) : '30 ngày'}
                        </Text>
                        {/* Hiển thị số lượng voucher là x1, x2, x3 thay vì lượt/khách theo yêu cầu */}
                        <View style={styles.voucherQuantityBadge}>
                          <Text style={styles.voucherQuantityText}>x{quantityNum}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={styles.emptyBox}>
                  <Ionicons name="ticket-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyTitle}>Chưa có voucher nào</Text>
                  <Text style={styles.emptySub}>
                    Bấm vào "+ Tạo Voucher" để phát hành ưu đãi đầu tiên cho quán.
                  </Text>
                </View>
              }
            />
          )}
        </View>
      )}

      {/* Modal Tạo món ăn mới */}
      <CreateFoodModal
        visible={isCreateFoodModalOpen}
        onClose={() => setIsCreateFoodModalOpen(false)}
        onSuccess={handleCreateFoodSuccess}
      />

      {/* Modal Tạo Voucher mới */}
      <CreateVoucherModal
        visible={isCreateVoucherModalOpen}
        onClose={() => setIsCreateVoucherModalOpen(false)}
        onSuccess={handleCreateVoucherSuccess}
      />
    </SafeAreaView>
  );
}
