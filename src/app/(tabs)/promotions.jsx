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
import Ionicons from '@expo/vector-icons/Ionicons';

import { VoucherTicketCard } from '@/components/ui/voucher-ticket-card';
import { voucherService } from '@/services/voucher.service';
import { promotionsStyles as styles } from '@/styles/screens/promotions.styles';

export default function PromotionsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('NEW'); // 'NEW' | 'CLAIMED'
  const [newVouchers, setNewVouchers] = useState([]);
  const [myVouchers, setMyVouchers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchVouchers = useCallback(async () => {
    try {
      const [appVouchersData, myVouchersData] = await Promise.all([
        voucherService.getAppVouchers(),
        voucherService.getMyVouchers(),
      ]);
      setNewVouchers(appVouchersData || []);
      setMyVouchers(myVouchersData || []);
    } catch (err) {
      console.warn('Lỗi khi tải danh sách voucher:', err);
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

  const handleClaim = async (voucher) => {
    try {
      await voucherService.claimVoucher(voucher.id, 1);
      Alert.alert('Thành công', 'Đã nhận voucher vào ví ưu đãi của bạn!', [
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
      ]);
    } catch (err) {
      Alert.alert('Không thể nhận voucher', err.message || 'Đã có lỗi xảy ra.');
    }
  };

  const handleVoucherPress = (voucher, isClaimed) => {
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

  return (
    <View style={styles.container}>
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
            displayedList.map((voucher) => (
              <VoucherTicketCard
                key={voucher.id}
                voucher={voucher}
                isClaimed={activeTab === 'CLAIMED'}
                onClaim={handleClaim}
                onPress={() => handleVoucherPress(voucher, activeTab === 'CLAIMED')}
              />
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}
