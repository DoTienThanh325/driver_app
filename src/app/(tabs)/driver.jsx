import React, { useState, useEffect } from 'react';
import {
  View,
  Switch,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDriverAvailability } from '@/hooks/use-driver-availability';
import { authService } from '@/services/auth.service';
import { userStorage } from '@/services/storage/user.storage';
import { tripService, TRIP_STATUS } from '@/services/trip.service';
import { driverStyles as styles } from '@/styles/screens/driver.styles';

// Vị trí mặc định tài xế quanh trung tâm Hà Nội để dễ dàng bắt matching
const DEFAULT_DRIVER_COORDS = {
  latitude: 21.028511,
  longitude: 105.854444,
  name: 'Hồ Hoàn Kiếm, Hoàn Kiếm, Hà Nội',
};

export default function DriverScreen() {
  const [userProfile, setUserProfile] = useState(null);
  const { isAvailable, isUpdating, toggleAvailability } = useDriverAvailability(false);

  // Tọa độ GPS của tài xế
  const [driverCoords, setDriverCoords] = useState(DEFAULT_DRIVER_COORDS);

  // Danh sách lời mời cuốc xe từ AI Matching
  const [pendingOffers, setPendingOffers] = useState([]);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Cuốc xe đang nhận và thực hiện
  const [activeTrip, setActiveTrip] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Kiểm tra quyền đối tác tài xế
  useEffect(() => {
    let isMounted = true;
    (async () => {
      let profile = await userStorage.getUserProfile();
      if (!profile) return;

      let hasDriverRole = profile.roles?.some(
        (r) => String(r).toUpperCase() === 'DRIVER' || String(r).toUpperCase() === 'ROLE_DRIVER'
      );

      // Nếu trong local cache chưa có DRIVER role, thử sync lại với backend (admin vừa cấp quyền)
      if (!hasDriverRole) {
        const syncRes = await authService.syncRolesAndProfile();
        if (syncRes?.profile) {
          profile = syncRes.profile;
          hasDriverRole = profile.roles?.some(
            (r) => String(r).toUpperCase() === 'DRIVER' || String(r).toUpperCase() === 'ROLE_DRIVER'
          );
        }
      }

      if (!isMounted) return;

      if (!hasDriverRole) {
        Alert.alert('Thông báo', 'Tài khoản của bạn chưa được cấp quyền đối tác Tài xế.');
        router.replace('/(tabs)');
      } else {
        setUserProfile(profile);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Gửi vị trí GPS định kỳ khi tài xế đang online (mỗi 6 giây)
  useEffect(() => {
    if (!isAvailable) return;

    // Gửi ngay 1 lần khi bật
    tripService.updateLocation(driverCoords.latitude, driverCoords.longitude);

    const locInterval = setInterval(() => {
      tripService.updateLocation(driverCoords.latitude, driverCoords.longitude);
    }, 6000);

    return () => clearInterval(locInterval);
  }, [isAvailable, driverCoords.latitude, driverCoords.longitude]);

  // Quét cuốc xe mới từ AI Matching khi tài xế đang online
  // Cho phép quét khi chưa có cuốc HOẶC khi đang chở khách (IN_PROGRESS) để nhận cuốc gối đầu
  useEffect(() => {
    if (!isAvailable) return;
    if (activeTrip && activeTrip.status !== TRIP_STATUS.IN_PROGRESS) return;

    const fetchOffers = async () => {
      try {
        const offers = await tripService.getMyPendingOffers();
        setPendingOffers(offers);
      } catch {
        // Bỏ qua lỗi kết nối tạm thời
      }
    };

    fetchOffers();
    const offerInterval = setInterval(fetchOffers, 2500);

    return () => clearInterval(offerInterval);
  }, [isAvailable, activeTrip]);

  // Cập nhật chi tiết cuốc xe đang chạy nếu có
  useEffect(() => {
    if (!activeTrip?.id) return;

    const interval = setInterval(async () => {
      try {
        const updated = await tripService.getTripById(activeTrip.id);
        if (updated) {
          if (updated.status === TRIP_STATUS.COMPLETED || updated.status === TRIP_STATUS.CANCELLED) {
            Alert.alert(
              'Cuốc xe kết thúc',
              updated.status === TRIP_STATUS.COMPLETED
                ? 'Chúc mừng! Chuyến đi đã hoàn thành thành công.'
                : 'Chuyến đi đã bị hủy.'
            );
            setActiveTrip(null);
          } else {
            setActiveTrip(updated);
          }
        }
      } catch {
        // Bỏ qua lỗi polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeTrip?.id]);

  // Nhận cuốc xe (Hỗ trợ cả cuốc mới & cuốc gối đầu)
  const handleAcceptOffer = async (offer) => {
    setIsAccepting(true);
    try {
      await tripService.acceptTrip(offer.tripId);
      setPendingOffers([]);
      if (activeTrip) {
        Alert.alert(
          'Nhận cuốc gối đầu thành công 🎉',
          'Bạn đã nhận trước cuốc xe tiếp theo! Hãy hoàn thành cuốc xe hiện tại, hệ thống sẽ tự động chuyển sang đón khách mới.'
        );
      } else {
        Alert.alert('Thành công', 'Bạn đã nhận chuyến xe thành công! Bắt đầu đón khách.');
        const trip = await tripService.getTripById(offer.tripId);
        setActiveTrip(trip || { id: offer.tripId, status: TRIP_STATUS.DRIVER_ASSIGNED, ...offer });
      }
    } catch (err) {
      Alert.alert('Không thể nhận chuyến', err.message || 'Cuốc xe đã được tài xế khác nhận hoặc đã hết hạn.');
      setPendingOffers((prev) => prev.filter((o) => o.offerId !== offer.offerId));
    } finally {
      setIsAccepting(false);
    }
  };

  // Từ chối cuốc xe
  const handleRejectOffer = async (offer) => {
    setIsRejecting(true);
    try {
      await tripService.rejectOffer(offer.offerId);
      setPendingOffers((prev) => prev.filter((o) => o.offerId !== offer.offerId));
    } catch {
      setPendingOffers((prev) => prev.filter((o) => o.offerId !== offer.offerId));
    } finally {
      setIsRejecting(false);
    }
  };

  // Tài xế cập nhật trạng thái chuyến đi theo quy trình
  const handleAdvanceTripStatus = async () => {
    if (!activeTrip?.id) return;

    let nextStatus = null;
    let confirmMsg = '';

    if (activeTrip.status === TRIP_STATUS.DRIVER_ASSIGNED) {
      nextStatus = TRIP_STATUS.DRIVER_ARRIVING;
      confirmMsg = 'Xác nhận bạn đã đến điểm đón khách?';
    } else if (activeTrip.status === TRIP_STATUS.DRIVER_ARRIVING) {
      nextStatus = TRIP_STATUS.IN_PROGRESS;
      confirmMsg = 'Khách đã lên xe. Xác nhận bắt đầu chuyến đi?';
    } else if (activeTrip.status === TRIP_STATUS.IN_PROGRESS) {
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
            await tripService.updateTripStatus(activeTrip.id, nextStatus);
            if (nextStatus === TRIP_STATUS.COMPLETED) {
              Alert.alert(
                'Hoàn thành cuốc xe 🎉',
                `Đã thu cước phí: ${Number(activeTrip.shippFare || 25000).toLocaleString('vi-VN')} đ. Bạn đã sẵn sàng nhận cuốc xe tiếp theo!`
              );
              setActiveTrip(null);
            } else {
              setActiveTrip((prev) => ({ ...prev, status: nextStatus }));
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

  // Đổi tọa độ GPS giả lập của tài xế qua danh sách các khu vực trung tâm
  const handleChangeDriverLocation = () => {
    Alert.alert(
      'Chọn vị trí tài xế (Giả lập GPS)',
      'Chọn khu vực bạn muốn đỗ xe để nhận cuốc xe gần đó:',
      [
        {
          text: '📍 Hồ Hoàn Kiếm (Trung tâm)',
          onPress: () => {
            const loc = { latitude: 21.028511, longitude: 105.854444, name: 'Hồ Hoàn Kiếm, Hoàn Kiếm, Hà Nội' };
            setDriverCoords(loc);
            tripService.updateLocation(loc.latitude, loc.longitude);
          },
        },
        {
          text: '📍 ĐH Bách Khoa (Hai Bà Trưng)',
          onPress: () => {
            const loc = { latitude: 21.00705, longitude: 105.84318, name: 'Đại học Bách Khoa, Hai Bà Trưng, Hà Nội' };
            setDriverCoords(loc);
            tripService.updateLocation(loc.latitude, loc.longitude);
          },
        },
        {
          text: '📍 Cầu Giấy (Duy Tân)',
          onPress: () => {
            const loc = { latitude: 21.0362, longitude: 105.7906, name: 'Quận Cầu Giấy, Hà Nội' };
            setDriverCoords(loc);
            tripService.updateLocation(loc.latitude, loc.longitude);
          },
        },
        {
          text: '✈️ Sân bay Nội Bài',
          onPress: () => {
            const loc = { latitude: 21.218715, longitude: 105.804176, name: 'Sân bay Quốc tế Nội Bài, Hà Nội' };
            setDriverCoords(loc);
            tripService.updateLocation(loc.latitude, loc.longitude);
          },
        },
        { text: 'Đóng', style: 'cancel' },
      ]
    );
  };

  const handleSimulateMatch = async () => {
    try {
      await tripService.simulateTripNearMe(driverCoords.latitude, driverCoords.longitude);
      Alert.alert('Thành công', 'Đã mô phỏng 1 khách đặt chuyến gần bạn! Cuốc xe sẽ xuất hiện trong giây lát.');
    } catch (err) {
      Alert.alert('Lỗi', err.message || 'Không thể tạo cuốc xe mô phỏng');
    }
  };

  const driverName = userProfile?.fullName || userProfile?.username || 'Thành Trung';
  const initialLetter = driverName.charAt(0).toUpperCase();

  // Nhãn nút tiến trình cho tài xế
  const getNextActionLabel = () => {
    switch (activeTrip?.status) {
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
    <ThemedView style={styles.safeArea}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 1. Header Card: Profile và Công tắc nhận chuyến */}
          <View style={styles.headerCard}>
            <View style={styles.profileCard}>
              <View style={styles.profileLeft}>
                <View style={styles.avatarCircle}>
                  <ThemedText style={styles.avatarText}>{initialLetter}</ThemedText>
                </View>
                <View style={styles.nameBlock}>
                  <ThemedText style={styles.driverRoleLabel}>Đối tác Tài xế T&M</ThemedText>
                  <ThemedText style={styles.driverFullName}>{driverName}</ThemedText>
                </View>
              </View>

              <Pressable
                style={styles.bellButton}
                onPress={() => Alert.alert('Thông báo', 'Không có thông báo tài xế mới.')}
                hitSlop={8}
              >
                <Ionicons name="notifications-outline" size={22} color="#111827" />
              </Pressable>
            </View>

            {/* Công tắc nhận chuyến: Bật: AVAILABLE | Tắt: OFFLINE */}
            <View style={styles.switchCard}>
              <View style={styles.switchInfo}>
                <ThemedText style={styles.switchTitle}>Sẵn sàng nhận chuyến</ThemedText>
                <ThemedText style={styles.switchSubtitle}>
                  {isAvailable
                    ? 'Đang trực tuyến (Sẵn sàng nhận cuốc xe)'
                    : 'Bạn đang tạm nghỉ (Offline)'}
                </ThemedText>
              </View>

              {isUpdating ? (
                <ActivityIndicator size="small" color="#00B5B8" style={{ marginRight: 8 }} />
              ) : (
                <Switch
                  value={isAvailable}
                  onValueChange={toggleAvailability}
                  trackColor={{ false: '#D1D5DB', true: '#00B5B8' }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor="#D1D5DB"
                />
              )}
            </View>
          </View>

          {/* 2. Thẻ hiển thị vị trí GPS hiện tại của Tài xế */}
          {isAvailable && (
            <>
              <View style={styles.gpsCard}>
                <View style={styles.gpsInfoBox}>
                  <View style={styles.gpsIconBox}>
                    <Ionicons name="navigate" size={18} color="#00B5B8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.gpsTitle}>VỊ TRÍ GPS CỦA TÀI XẾ</ThemedText>
                    <ThemedText style={styles.gpsValue} numberOfLines={1}>
                      {driverCoords.name || `${driverCoords.latitude.toFixed(4)}, ${driverCoords.longitude.toFixed(4)}`}
                    </ThemedText>
                  </View>
                </View>
                <Pressable style={styles.gpsChangeBtn} onPress={handleChangeDriverLocation}>
                  <ThemedText style={styles.gpsChangeText}>Đổi vị trí</ThemedText>
                </Pressable>
              </View>

              {!activeTrip && (
                <Pressable
                  style={{
                    backgroundColor: '#FFF7ED',
                    borderColor: '#FF7A00',
                    borderWidth: 1.5,
                    borderRadius: 14,
                    padding: 12,
                    marginBottom: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={handleSimulateMatch}
                >
                  <Ionicons name="flash" size={18} color="#EA580C" style={{ marginRight: 6 }} />
                  <ThemedText style={{ color: '#EA580C', fontWeight: '700', fontSize: 13 }}>
                    ⚡ Test nhanh: Giả lập 1 khách đặt chuyến gần bạn
                  </ThemedText>
                </Pressable>
              )}
            </>
          )}

          {/* 3. NỘI DUNG CHÍNH THEO TRẠNG THÁI */}
          {!isAvailable ? (
            /* TRẠNG THÁI: OFFLINE */
            <View style={styles.offlineStateContainer}>
              <View style={styles.exclamationCircle}>
                <ThemedText style={styles.exclamationText}>!</ThemedText>
              </View>
              <ThemedText style={styles.offlineMainNotice}>Bạn đang tạm nghỉ.</ThemedText>
              <ThemedText style={styles.offlineSubNotice}>
                Bật công tắc nhận chuyến ở trên để hệ thống AI Matching gửi cuốc xe cho bạn.
              </ThemedText>
            </View>
          ) : activeTrip ? (
            /* TRẠNG THÁI: ĐANG THỰC HIỆN CUỐC XE */
            <View style={styles.activeTripCard}>
              <View style={styles.activeTripHeader}>
                <View style={styles.statusBadge}>
                  <ThemedText style={styles.statusBadgeText}>
                    {activeTrip.status === TRIP_STATUS.DRIVER_ASSIGNED
                      ? 'ĐÃ NHẬN CHUYẾN'
                      : activeTrip.status === TRIP_STATUS.DRIVER_ARRIVING
                      ? 'ĐANG TỚI ĐIỂM ĐÓN'
                      : 'ĐANG CHỞ KHÁCH'}
                  </ThemedText>
                </View>
                <ThemedText style={styles.tripIdText}>
                  Mã: #{String(activeTrip.id || '').slice(-6).toUpperCase()}
                </ThemedText>
              </View>

              {/* Thông tin lộ trình */}
              <View style={styles.offerRouteBox}>
                <View style={styles.offerRouteRow}>
                  <Ionicons name="location" size={18} color="#10B981" />
                  <ThemedText style={styles.offerRouteText} numberOfLines={2}>
                    <ThemedText style={{ fontWeight: '700' }}>Điểm đón: </ThemedText>
                    {activeTrip.pickUpAddress}
                  </ThemedText>
                </View>

                <View style={[styles.offerRouteRow, { marginBottom: 0 }]}>
                  <Ionicons name="flag" size={18} color="#EF4444" />
                  <ThemedText style={styles.offerRouteText} numberOfLines={2}>
                    <ThemedText style={{ fontWeight: '700' }}>Điểm đến: </ThemedText>
                    {activeTrip.destinationAddress}
                  </ThemedText>
                </View>
              </View>

              {/* Cước phí */}
              <View style={styles.offerMetaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="wallet-outline" size={16} color="#00B5B8" />
                  <ThemedText style={[styles.metaText, { fontWeight: '700', color: '#00B5B8', fontSize: 14 }]}>
                    Thu cước: {Number(activeTrip.shippFare || 25000).toLocaleString('vi-VN')} đ
                  </ThemedText>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="car-outline" size={16} color="#6B7280" />
                  <ThemedText style={styles.metaText}>
                    {activeTrip.vehicleType === 'CAR' ? '🚗 Ô tô' : '🛵 Xe máy'}
                  </ThemedText>
                </View>
              </View>

              {/* Nút hành động theo từng bước của tài xế */}
              <Pressable
                style={styles.activeStepBtn}
                onPress={handleAdvanceTripStatus}
                disabled={isUpdatingStatus}
              >
                {isUpdatingStatus ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.activeStepBtnText}>{getNextActionLabel()}</ThemedText>
                )}
              </Pressable>
            </View>
          ) : pendingOffers.length > 0 ? (
            /* TRẠNG THÁI: CÓ LỜI MỜI CUỐC XE TỪ AI MATCHING */
            <View>
              <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#EA580C', marginBottom: 12 }}>
                ⚡ CÓ {pendingOffers.length} CUỐC XE ĐƯỢC AI PHÂN PHỐI CHO BẠN:
              </ThemedText>

              {pendingOffers.map((offer) => (
                <View key={offer.offerId} style={styles.offerCard}>
                  {/* Badge AI & Cước phí */}
                  <View style={styles.offerHeader}>
                    <View style={styles.aiBadge}>
                      <Ionicons name="sparkles" size={14} color="#EA580C" />
                      <ThemedText style={styles.aiBadgeText}>
                        Đề xuất AI {offer.aiRank ? `(Hạng ${offer.aiRank})` : ''}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.fareHighlight}>
                      +{Number(offer.shippFare || 25000).toLocaleString('vi-VN')} đ
                    </ThemedText>
                  </View>

                  {offer.backToBack && (
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F0FDFA',
                        borderColor: '#0D9488',
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        marginBottom: 10,
                      }}
                    >
                      <Ionicons name="repeat" size={14} color="#0D9488" style={{ marginRight: 6 }} />
                      <ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#0F766E' }}>
                        ⚡ Cuốc gối đầu (Khách đón gần điểm trả của bạn)
                      </ThemedText>
                    </View>
                  )}

                  {/* Lộ trình đón - trả */}
                  <View style={styles.offerRouteBox}>
                    <View style={styles.offerRouteRow}>
                      <Ionicons name="location" size={18} color="#10B981" />
                      <ThemedText style={styles.offerRouteText} numberOfLines={2}>
                        <ThemedText style={{ fontWeight: '700' }}>Đón: </ThemedText>
                        {offer.pickUpAddress}
                      </ThemedText>
                    </View>

                    <View style={[styles.offerRouteRow, { marginBottom: 0 }]}>
                      <Ionicons name="flag" size={18} color="#EF4444" />
                      <ThemedText style={styles.offerRouteText} numberOfLines={2}>
                        <ThemedText style={{ fontWeight: '700' }}>Đến: </ThemedText>
                        {offer.destinationAddress}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Cự ly & Thời gian đón */}
                  <View style={styles.offerMetaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="navigate-outline" size={16} color="#6B7280" />
                      <ThemedText style={styles.metaText}>
                        Khoảng cách: {offer.distanceKm ? offer.distanceKm.toFixed(1) : '1.2'} km
                      </ThemedText>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="time-outline" size={16} color="#6B7280" />
                      <ThemedText style={styles.metaText}>
                        Tiếp cận: ~{offer.etaMinutes ? Math.round(offer.etaMinutes) : '3'} phút
                      </ThemedText>
                    </View>
                    <View style={styles.metaItem}>
                      <ThemedText style={styles.metaText}>
                        {offer.vehicleType === 'CAR' ? '🚗 Ô tô' : '🛵 Xe máy'}
                      </ThemedText>
                    </View>
                  </View>

                  {/* Nút Từ chối & Nhận cuốc */}
                  <View style={styles.offerActionsRow}>
                    <Pressable
                      style={styles.rejectBtn}
                      onPress={() => handleRejectOffer(offer)}
                      disabled={isRejecting || isAccepting}
                    >
                      <ThemedText style={styles.rejectBtnText}>Bỏ qua</ThemedText>
                    </Pressable>

                    <Pressable
                      style={styles.acceptBtn}
                      onPress={() => handleAcceptOffer(offer)}
                      disabled={isAccepting || isRejecting}
                    >
                      {isAccepting ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <ThemedText style={styles.acceptBtnText}>NHẬN CHUYẾN</ThemedText>
                      )}
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            /* TRẠNG THÁI: ONLINE VÀ ĐANG CHỜ CUỐC */
            <View style={styles.onlineStateContainer}>
              <View style={styles.radarPulse}>
                <Ionicons name="radio" size={36} color="#00B5B8" />
              </View>
              <ThemedText style={styles.onlineTitle}>Đang quét cuốc xe xung quanh...</ThemedText>
              <ThemedText style={styles.onlineSubtitle}>
                Hệ thống AI Matching đang tìm và xếp hạng các chuyến đi gần tọa độ của bạn nhất.
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

    </ThemedView>
  );
}
