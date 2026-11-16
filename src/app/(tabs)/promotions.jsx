import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';

import { VoucherTicketCard } from '@/components/ui/voucher-ticket-card';
import { voucherService } from '@/services/voucher.service';
import { promotionsStyles as styles } from '@/styles/screens/promotions.styles';

const DEFAULT_APP_VOUCHERS = [
  {
    id: 'VOUCHER-TRANSIT-FREESHIP',
    discount: 20000,
    maxDiscount: 20000,
    minValue: 0,
    type: 'TRANSIT',
    providerType: 'APP',
    claimableCount: 3,
    numberOfVouchersPerCus: 3,
    expiredAt: '2027-12-31T23:59:59Z',
  },
  {
    id: 'VOUCHER-NEWUSER-30PCT',
    discount: 30,
    maxDiscount: 35000,
    minValue: 0,
    type: 'TRANSIT',
    providerType: 'APP',
    claimableCount: 1,
    numberOfVouchersPerCus: 1,
    expiredAt: '2027-12-31T23:59:59Z',
  },
  {
    id: 'VOUCHER-TRANSIT-EXPIRED',
    discount: 20000,
    maxDiscount: 20000,
    minValue: 0,
    type: 'TRANSIT',
    providerType: 'APP',
    claimableCount: 0,
    numberOfVouchersPerCus: 1,
    expiredAt: '2025-01-01T00:00:00Z',
  },
];

const DEFAULT_MY_VOUCHERS = [
  {
    id: 'VOUCHER-TRANSIT-50PCT',
    discount: 50,
    maxDiscount: 30000,
    minValue: 0,
    type: 'TRANSIT',
    providerType: 'APP',
    quantity: 2,
    expiredAt: '2027-12-31T23:59:59Z',
  },
  {
    id: 'VOUCHER-TRANSIT-10K',
    discount: 10000,
    maxDiscount: 10000,
    minValue: 0,
    type: 'TRANSIT',
    providerType: 'APP',
    quantity: 1,
    expiredAt: '2027-12-31T23:59:59Z',
  },
  {
    id: 'VOUCHER-FOOD-25K',
    discount: 25000,
    maxDiscount: 25000,
    minValue: 0,
    type: 'FOOD',
    providerType: 'APP',
    quantity: 1,
    expiredAt: '2027-12-31T23:59:59Z',
  },
  {
    id: 'VOUCHER-TRANSIT-100K-MIN',
    discount: 30000,
    maxDiscount: 30000,
    minValue: 100000,
    type: 'TRANSIT',
    providerType: 'APP',
    quantity: 1,
    expiredAt: '2027-12-31T23:59:59Z',
  },
  {
    id: 'VOUCHER-TRANSIT-EXPIRED',
    discount: 20000,
    maxDiscount: 20000,
    minValue: 0,
    type: 'TRANSIT',
    providerType: 'APP',
    quantity: 1,
    expiredAt: '2025-01-01T00:00:00Z',
  },
];

export default function PromotionsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('NEW'); // 'NEW' | 'CLAIMED'
  const [newVouchers, setNewVouchers] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchVouchers = useCallback(async () => {
    try {
      const [appVouchersData, myVouchersData] = await Promise.allSettled([
        voucherService.getAppVouchers(),
        voucherService.getMyVouchers(),
      ]);

      const loadedApp =
        appVouchersData.status === 'fulfilled' &&
        Array.isArray(appVouchersData.value) &&
        appVouchersData.value.length > 0
          ? appVouchersData.value
          : DEFAULT_APP_VOUCHERS;

      let loadedMy =
        myVouchersData.status === 'fulfilled' &&
        Array.isArray(myVouchersData.value) &&
        myVouchersData.value.length > 0
          ? myVouchersData.value
          : DEFAULT_MY_VOUCHERS;

      // Đảm bảo luôn có voucher hết hạn mẫu để kiểm thử trực quan hiệu ứng làm xám
      const hasExpiredInMy = loadedMy.some(
        (v) => v.expiredAt && new Date(v.expiredAt) < new Date()
      );
      if (!hasExpiredInMy) {
        loadedMy = [
          ...loadedMy,
          {
            id: 'VOUCHER-TRANSIT-EXPIRED',
            discount: 20000,
            maxDiscount: 20000,
            minValue: 0,
            type: 'TRANSIT',
            providerType: 'APP',
            quantity: 1,
            expiredAt: '2025-01-01T00:00:00Z',
          },
        ];
      }

      setNewVouchers(loadedApp);
      setMyVouchers(loadedMy);
    } catch (err) {
      console.warn('Lỗi khi tải danh sách voucher:', err);
      setNewVouchers(DEFAULT_APP_VOUCHERS);
      setMyVouchers(DEFAULT_MY_VOUCHERS);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchVouchers();
    }, [fetchVouchers])
  );

  const handlePullRefresh = () => {
    setIsRefreshing(true);
    fetchVouchers();
  };

  const isVoucherExpired = (v) => {
    if (!v?.expiredAt) return false;
    try {
      return new Date(v.expiredAt) < new Date();
    } catch {
      return false;
    }
  };

  const handleClaim = async (voucher) => {
    if (isVoucherExpired(voucher)) {
      Alert.alert('Không thể nhận', 'Ưu đãi này đã hết thời hạn chương trình.');
      return;
    }

    try {
      const quantity = Number(
        voucher.numberOfVouchersPerCus ||
        voucher.numberOfVouchers ||
        voucher.quantity ||
        1
      );
      await voucherService.claimVoucher(voucher.id, quantity);
      Alert.alert(
        'Thành công',
        `Đã nhận ${quantity > 1 ? `${quantity} ` : ''}voucher vào ví ưu đãi của bạn!`,
        [
          {
            text: 'Xem đã nhận',
            onPress: () => {
              setActiveTab('CLAIMED');
              fetchVouchers();
            },
          },
          {
            text: 'Ở lại',
            onPress: () => fetchVouchers(),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Không thể nhận voucher', err.message || 'Đã có lỗi xảy ra.');
    }
  };

  const handleVoucherPress = (voucher, isClaimed) => {
    if (isVoucherExpired(voucher)) {
      Alert.alert(
        'Ưu đãi đã hết hạn',
        'Mã ưu đãi này đã hết hạn sử dụng nên không thể áp dụng cho các chuyến đi.',
        [{ text: 'Đã hiểu' }]
      );
      return;
    }

    router.push({
      pathname: '/voucher-detail',
      params: {
        id: voucher.id,
        isClaimed: isClaimed ? 'true' : 'false',
        voucherJson: JSON.stringify(voucher),
      },
    });
  };

  const displayedList = activeTab === 'NEW' ? newVouchers : myVouchers;
  const activeVouchers = displayedList.filter((v) => !isVoucherExpired(v));
  const expiredVouchers = displayedList.filter((v) => isVoucherExpired(v));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {/* 1. Header Teal Cong */}
      <View style={[styles.headerBanner, { paddingTop: Math.max(insets.top + 10, 44) }]}>
        <Text style={styles.headerTitle}>Ưu đãi</Text>

        {/* 2 Tab Toggle: Mới vs Đã nhận */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === 'NEW' && styles.tabButtonActive]}
            onPress={() => setActiveTab('NEW')}
          >
            <Text style={[styles.tabText, activeTab === 'NEW' && styles.tabTextActive]}>
              Mới
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'CLAIMED' && styles.tabButtonActive]}
            onPress={() => setActiveTab('CLAIMED')}
          >
            <Text style={[styles.tabText, activeTab === 'CLAIMED' && styles.tabTextActive]}>
              Đã nhận
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 2. Danh sách Voucher */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B5B8" />
          <Text style={styles.loadingText}>Đang tải danh sách ưu đãi...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handlePullRefresh}
              colors={['#00B5B8']}
              tintColor="#00B5B8"
            />
          }
        >
          {displayedList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name={activeTab === 'NEW' ? 'pricetags-outline' : 'wallet-outline'}
                size={54}
                color="#CBD5E1"
              />
              <Text style={styles.emptyTitle}>
                {activeTab === 'NEW' ? 'Chưa có ưu đãi mới' : 'Chưa có voucher nào'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'NEW'
                  ? 'Hiện tại không có ưu đãi mới nào. Hãy quay lại sau bạn nhé!'
                  : 'Bạn chưa nhận mã ưu đãi nào. Hãy chuyển sang tab Mới để nhận ưu đãi!'}
              </Text>
            </View>
          ) : (
            <>
              {/* 1. Nhóm voucher khả dụng */}
              {activeVouchers.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Ionicons name="sparkles" size={15} color="#00B5B8" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937', marginLeft: 6 }}>
                      {activeTab === 'NEW' ? 'Ưu đãi mới có thể nhận' : 'Ưu đãi khả dụng'} ({activeVouchers.length})
                    </Text>
                  </View>
                  {activeVouchers.map((voucher) => (
                    <VoucherTicketCard
                      key={voucher.id}
                      voucher={voucher}
                      isClaimed={activeTab === 'CLAIMED'}
                      onClaim={handleClaim}
                      onPress={() => handleVoucherPress(voucher, activeTab === 'CLAIMED')}
                    />
                  ))}
                </View>
              )}

              {/* 2. Nhóm voucher đã hết hạn (Làm xám) */}
              {expiredVouchers.length > 0 && (
                <View style={{ marginTop: activeVouchers.length > 0 ? 8 : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Ionicons name="time-outline" size={15} color="#9CA3AF" />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#6B7280', marginLeft: 6 }}>
                      Ưu đãi đã hết hạn ({expiredVouchers.length})
                    </Text>
                  </View>
                  {expiredVouchers.map((voucher) => (
                    <VoucherTicketCard
                      key={voucher.id}
                      voucher={voucher}
                      isClaimed={activeTab === 'CLAIMED'}
                      onClaim={handleClaim}
                      onPress={() => handleVoucherPress(voucher, activeTab === 'CLAIMED')}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}
