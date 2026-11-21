import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { tripService, TRIP_STATUS, SHIPPING_TYPE } from '@/services/trip.service';
import { feedbackService } from '@/services/feedback.service';
import { RatingModal } from '@/components/ui/rating-modal';

export default function ActivityScreen() {
  const [trips, setTrips] = useState([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'CANCELLED'

  // Trạng thái kiểm tra review của các chuyến đi { [tripId]: boolean }
  const [reviewedMap, setReviewedMap] = useState({});

  // Modal Đánh giá
  const [selectedTripForRating, setSelectedTripForRating] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);

  const fetchTrips = useCallback(async (pageNumber = 0, refresh = false) => {
    try {
      if (refresh) setIsRefreshing(true);
      else if (pageNumber === 0) setIsLoading(true);

      const res = await tripService.getCustomerTripHistory(pageNumber, 15);
      const content = res?.content || (Array.isArray(res) ? res : []);
      const totalP = res?.totalPages || (content.length > 0 ? 1 : 0);

      setTotalPages(totalP);
      setPage(pageNumber);

      if (refresh || pageNumber === 0) {
        setTrips(content);
      } else {
        setTrips((prev) => [...prev, ...content]);
      }

      // Kiểm tra trạng thái đánh giá cho các chuyến đi đã hoàn thành
      const completedTrips = content.filter((t) => t.status === TRIP_STATUS.COMPLETED);
      completedTrips.forEach(async (trip) => {
        if (trip?.id) {
          try {
            const statusRes = await feedbackService.getTripFeedbackStatus(trip.id);
            setReviewedMap((prev) => ({
              ...prev,
              [trip.id]: !!(statusRes?.isRated ?? statusRes?.isReviewed),
            }));
          } catch {
            // bỏ qua lỗi kiểm tra status
          }
        }
      });
    } catch (err) {
      console.warn('Lỗi tải danh sách chuyến đi:', err?.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips(0);
  }, []);

  const handleRefresh = () => {
    fetchTrips(0, true);
  };

  const handleLoadMore = () => {
    if (!isLoading && !isRefreshing && page + 1 < totalPages) {
      fetchTrips(page + 1);
    }
  };

  const filteredTrips = trips.filter((t) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'COMPLETED') return t.status === TRIP_STATUS.COMPLETED;
    if (filterStatus === 'CANCELLED') return t.status === TRIP_STATUS.CANCELLED || t.status === TRIP_STATUS.NO_DRIVER_FOUND;
    return true;
  });

  const openRatingModal = (trip) => {
    setSelectedTripForRating(trip);
    setShowRatingModal(true);
  };

  const handleRatingSuccess = (tripId) => {
    setReviewedMap((prev) => ({
      ...prev,
      [tripId]: true,
    }));
    setShowRatingModal(false);
    setSelectedTripForRating(null);
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case TRIP_STATUS.COMPLETED:
        return (
          <View style={[styles.badge, styles.badgeCompleted]}>
            <Ionicons name="checkmark-circle" size={14} color="#059669" style={{ marginRight: 4 }} />
            <Text style={styles.badgeCompletedText}>Hoàn thành</Text>
          </View>
        );
      case TRIP_STATUS.CANCELLED:
        return (
          <View style={[styles.badge, styles.badgeCancelled]}>
            <Ionicons name="close-circle" size={14} color="#DC2626" style={{ marginRight: 4 }} />
            <Text style={styles.badgeCancelledText}>Đã hủy</Text>
          </View>
        );
      case TRIP_STATUS.IN_PROGRESS:
      case TRIP_STATUS.DRIVER_ARRIVING:
      case TRIP_STATUS.DRIVER_ASSIGNED:
        return (
          <View style={[styles.badge, styles.badgeOngoing]}>
            <Ionicons name="navigate" size={14} color="#0284C7" style={{ marginRight: 4 }} />
            <Text style={styles.badgeOngoingText}>Đang diễn ra</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.badge, styles.badgePending]}>
            <Text style={styles.badgePendingText}>{status || 'Chờ xử lý'}</Text>
          </View>
        );
    }
  };

  const renderTripItem = ({ item }) => {
    const isCompleted = item.status === TRIP_STATUS.COMPLETED;
    const isRated = reviewedMap[item.id];
    const isFood = item.shippingType === SHIPPING_TYPE.FOOD_DELIVERY;

    return (
      <View style={styles.tripCard}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.serviceTypeRow}>
            <View style={styles.serviceIconCircle}>
              <Ionicons
                name={isFood ? 'fast-food' : item.vehicleType === 'CAR' ? 'car' : 'bicycle'}
                size={18}
                color="#00B5B8"
              />
            </View>
            <View>
              <Text style={styles.serviceTypeName}>
                {isFood
                  ? 'Giao đồ ăn'
                  : item.vehicleType === 'CAR'
                  ? 'Ô tô (4 chỗ)'
                  : 'Xe máy (Ride)'}
              </Text>
              <Text style={styles.tripDateText}>{formatDateTime(item.createdAt)}</Text>
            </View>
          </View>
          {renderStatusBadge(item.status)}
        </View>

        {/* Route Info */}
        <View style={styles.routeContainer}>
          <View style={styles.routeTimeline}>
            <View style={styles.startDot} />
            <View style={styles.dashLine} />
            <View style={styles.endPin}>
              <Ionicons name="location" size={12} color="#EF4444" />
            </View>
          </View>

          <View style={styles.addressList}>
            <View style={styles.addressItem}>
              <Text style={styles.addressLabel}>Điểm đón:</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {item.pickUpAddress || 'Vị trí hiện tại'}
              </Text>
            </View>
            <View style={styles.addressItem}>
              <Text style={styles.addressLabel}>Điểm đến:</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {item.destinationAddress || 'Điểm đến'}
              </Text>
            </View>
          </View>
        </View>

        {/* Card Footer: Price & Rating Action */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.fareLabel}>Tổng thanh toán</Text>
            <Text style={styles.fareAmount}>
              {Number(item.shippFare || 0).toLocaleString('vi-VN')} đ
            </Text>
          </View>

          {isCompleted && (
            <View>
              {isRated ? (
                <View style={styles.ratedBadge}>
                  <Ionicons name="star" size={14} color="#F59E0B" style={{ marginRight: 4 }} />
                  <Text style={styles.ratedBadgeText}>Đã đánh giá</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.rateButton}
                  onPress={() => openRatingModal(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="star" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.rateButtonText}>Đánh giá</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyComponent = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
        </View>
        <ThemedText style={styles.emptyTitle}>Chưa có lịch sử hoạt động</ThemedText>
        <ThemedText style={styles.emptySubtitle}>
          Khi bạn đặt chuyến xe hoặc đặt món ăn, các lịch sử và đánh giá sẽ được lưu trữ tại đây.
        </ThemedText>
        <TouchableOpacity
          style={styles.bookNowButton}
          onPress={() => router.push('/book-trip')}
          activeOpacity={0.8}
        >
          <Text style={styles.bookNowButtonText}>Đặt chuyến ngay</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Lịch sử hoạt động</Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterTabsRow}>
          {[
            { key: 'ALL', label: 'Tất cả' },
            { key: 'COMPLETED', label: 'Hoàn thành' },
            { key: 'CANCELLED', label: 'Đã hủy' },
          ].map((tab) => {
            const active = filterStatus === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => setFilterStatus(tab.key)}
              >
                <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List Content */}
        {isLoading && trips.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00B5B8" />
            <Text style={styles.loadingText}>Đang tải lịch sử...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTrips}
            keyExtractor={(item, index) => item?.id || String(index)}
            renderItem={renderTripItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#00B5B8']}
              />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListEmptyComponent={renderEmptyComponent}
          />
        )}

        {/* Rating Modal */}
        {selectedTripForRating && (
          <RatingModal
            visible={showRatingModal}
            onClose={() => setShowRatingModal(false)}
            onSuccess={() => handleRatingSuccess(selectedTripForRating?.id)}
            targetType="DRIVER"
            tripId={selectedTripForRating?.id}
            driverId={selectedTripForRating?.driverId}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  filterTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#00B5B8',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6B7280',
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  tripCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  serviceTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E6F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  serviceTypeName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  tripDateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeCompleted: {
    backgroundColor: '#ECFDF5',
  },
  badgeCompletedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  badgeCancelled: {
    backgroundColor: '#FEF2F2',
  },
  badgeCancelledText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  badgeOngoing: {
    backgroundColor: '#F0F9FF',
  },
  badgeOngoingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  badgePending: {
    backgroundColor: '#F3F4F6',
  },
  badgePendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  routeContainer: {
    flexDirection: 'row',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  routeTimeline: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  startDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
  },
  dashLine: {
    width: 1,
    flex: 1,
    backgroundColor: '#D1D5DB',
    marginVertical: 4,
  },
  endPin: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressList: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'space-between',
    gap: 10,
  },
  addressItem: {
    justifyContent: 'center',
  },
  addressLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  addressText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
    marginTop: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
  },
  fareLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  fareAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#00B5B8',
    marginTop: 2,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rateButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  ratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ratedBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  bookNowButton: {
    backgroundColor: '#00B5B8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookNowButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
