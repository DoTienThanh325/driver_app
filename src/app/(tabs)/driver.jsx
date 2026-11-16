import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Switch,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDriverAvailability } from '@/hooks/use-driver-availability';
import { authService } from '@/services/auth.service';
import { userStorage } from '@/services/storage/user.storage';
import { tripService, TRIP_STATUS } from '@/services/trip.service';
import { paymentService } from '@/services/payment.service';
import { driverStyles as styles } from '@/styles/screens/driver.styles';

// Vị trí mặc định tài xế quanh trung tâm Hà Nội để dễ dàng bắt matching
const DEFAULT_DRIVER_COORDS = {
  latitude: 21.028511,
  longitude: 105.854444,
  name: 'Hồ Hoàn Kiếm, Hoàn Kiếm, Hà Nội',
};

export default function DriverScreen() {
  const [userProfile, setUserProfile] = useState(null);
  const { isAvailable, isUpdating, toggleAvailability } = useDriverAvailability(true);

  // Tọa độ GPS của tài xế
  const [driverCoords, setDriverCoords] = useState(DEFAULT_DRIVER_COORDS);

  // Cuốc xe đang xem chi tiết trong Modal ("sau đó tài xế bấm vào xem chuyến, ok thì nhận")
  const [selectedOfferForDetail, setSelectedOfferForDetail] = useState(null);

  // Tuyến đường thực tế OSRM hiển thị trong Modal chi tiết cuốc xe
  const [modalRouteCoords, setModalRouteCoords] = useState([]);
  const [modalDistanceKm, setModalDistanceKm] = useState(null);
  const [isLoadingModalRoute, setIsLoadingModalRoute] = useState(false);

  // Gọi OSRM lấy tuyến đường thực tế khi mở xem chi tiết cuốc xe
  useEffect(() => {
    if (!selectedOfferForDetail) {
      setModalRouteCoords([]);
      setModalDistanceKm(null);
      return;
    }

    let isMounted = true;
    async function fetchModalRoute() {
      setIsLoadingModalRoute(true);
      try {
        const pLat = selectedOfferForDetail.pickUpLatitude || (driverCoords.latitude - 0.006);
        const pLon = selectedOfferForDetail.pickUpLongitude || (driverCoords.longitude + 0.005);
        const dLat = selectedOfferForDetail.destinationLatitude || (driverCoords.latitude + 0.012);
        const dLon = selectedOfferForDetail.destinationLongitude || (driverCoords.longitude - 0.008);

        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pLon},${pLat};${dLon},${dLat}?overview=full&geometries=geojson`;
        const res = await fetch(osrmUrl, {
          headers: { 'User-Agent': 'DriverApp-Client/1.0', 'Accept': 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.routes && data.routes.length > 0) {
            const primary = data.routes[0];
            const distKm = Math.max(0.5, Math.round((primary.distance / 1000) * 10) / 10);
            const coords = primary.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

            if (isMounted) {
              setModalRouteCoords(coords);
              setModalDistanceKm(distKm);
              setIsLoadingModalRoute(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi lấy tuyến đường OSRM cho modal chi tiết:', err);
      }

      if (isMounted) {
        setIsLoadingModalRoute(false);
      }
    }

    fetchModalRoute();

    return () => {
      isMounted = false;
    };
  }, [selectedOfferForDetail]);

  // Danh sách lời mời cuốc xe từ AI Matching
  const [pendingOffers, setPendingOffers] = useState([]);
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  // Cuốc xe mẫu quanh đây khi online (khớp với giao diện hình ảnh người dùng yêu cầu)
  const sampleNearbyRides = useMemo(() => [
    {
      offerId: 'sample-ride-1',
      tripId: 'sample-trip-1',
      shippFare: 45000,
      distanceKm: 2.5,
      etaMinutes: 8,
      driverDistanceKm: 1.2,
      driverEtaMinutes: 3,
      pickUpAddress: 'Ngã tư Sở, Đống Đa, Hà Nội',
      destinationAddress: 'Keangnam Landmark 72, Phạm Hùng, Nam Từ Liêm',
      vehicleType: 'MOTORBIKE',
      isSample: true,
    },
    {
      offerId: 'sample-ride-2',
      tripId: 'sample-trip-2',
      shippFare: 32000,
      distanceKm: 1.8,
      etaMinutes: 6,
      driverDistanceKm: 0.9,
      driverEtaMinutes: 2,
      pickUpAddress: 'Vincom Center Phạm Ngọc Thạch, Đống Đa',
      destinationAddress: 'Đại học Bách Khoa Hà Nội, Hai Bà Trưng',
      vehicleType: 'MOTORBIKE',
      isSample: true,
    },
  ], []);

  // Danh sách cuốc xe hiển thị: Ưu tiên pendingOffers thực tế từ AI Matching, nếu chưa có thì hiển thị cuốc quanh đây
  const displayedOffers = useMemo(() => {
    if (pendingOffers && pendingOffers.length > 0) {
      return pendingOffers;
    }
    return sampleNearbyRides;
  }, [pendingOffers, sampleNearbyRides]);

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

  // Tự động đăng ký thông tin ngân hàng mặc định của tài xế vào PaymentService để nhận VietQR
  useEffect(() => {
    paymentService
      .registerDriverPaymentInfo({
        bankName: 'MBBank (Quân Đội)',
        bankBin: '970422',
        bankAccountNumber: '0399888999',
        bankAccountName: 'TAI XE DRIVER APP',
      })
      .catch(() => {});
  }, []);

  // Nhận cuốc xe (Hỗ trợ cả cuốc mới & cuốc gối đầu)
  const handleAcceptOffer = async (offer) => {
    if (!offer) return;
    setIsAccepting(true);
    try {
      // Đảm bảo thông tin ngân hàng đã cập nhật
      paymentService
        .registerDriverPaymentInfo({
          bankName: 'MBBank (Quân Đội)',
          bankBin: '970422',
          bankAccountNumber: '0399888999',
          bankAccountName: 'TAI XE DRIVER APP',
        })
        .catch(() => {});

      setSelectedOfferForDetail(null);

      // Chuyển sang màn hình Chi tiết cuốc xe & Thông tin khách hàng
      const tripDetail = {
        id: offer.tripId || 'TRIP-' + Date.now(),
        status: TRIP_STATUS.DRIVER_ASSIGNED,
        shippFare: offer.shippFare || 45000,
        pickUpAddress: offer.pickUpAddress,
        destinationAddress: offer.destinationAddress,
        vehicleType: offer.vehicleType || 'MOTORBIKE',
        customerName: offer.customerName || 'Nguyễn Văn An',
        customerPhone: offer.customerPhone || '0988123456',
        customerRating: '4.9',
        distanceKm: offer.distanceKm || '2.5',
      };

      if (!offer.isSample) {
        await tripService.acceptTrip(offer.tripId);
      }
      setPendingOffers([]);
      router.push({
        pathname: '/driver-active-trip',
        params: {
          tripId: tripDetail.id,
          tripData: JSON.stringify(tripDetail),
        },
      });
      return;

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
        return '3. ĐÃ ĐẾN ĐIỂM TRẢ KHÁCH (THU TIỀN)';
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
                  <ThemedText style={styles.driverRoleLabel}>Tài xế</ThemedText>
                  <ThemedText style={styles.driverFullName}>{driverName} ⭐ 4.9</ThemedText>
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

          {/* 2. Thẻ Thu nhập hôm nay */}
          <View style={styles.incomeCard}>
            <ThemedText style={styles.incomeHeader}>Thu nhập hôm nay</ThemedText>
            <View style={styles.incomeMiddleRow}>
              <ThemedText style={styles.incomeValue}>450.000đ</ThemedText>
              <View style={styles.incomeIconBox}>
                <Ionicons name="bar-chart" size={22} color="#00B5B8" />
              </View>
            </View>
            <ThemedText style={styles.incomeFooterText}>12 Chuyến   4h 30p Online</ThemedText>
          </View>

          {/* 3. Mục Các cuốc xe đã thực hiện */}
          <Pressable
            style={styles.historyButtonCard}
            onPress={() => router.push('/driver-trips')}
            android_ripple={{ color: '#E5E7EB' }}
          >
            <View style={styles.historyCardLeft}>
              <View style={styles.historyIconBox}>
                <Ionicons name="car-sport" size={24} color="#00B5B8" />
              </View>
              <View style={{ flex: 1 }}>
                <ThemedText style={styles.historyTitle}>Các cuốc xe đã thực hiện</ThemedText>
                <ThemedText style={styles.historySubtitle}>
                  Xem lịch sử cuốc xe & đánh giá từ khách hàng
                </ThemedText>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </Pressable>

          {/* 4. Thẻ hiển thị vị trí GPS hiện tại của Tài xế */}
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

          {/* 5. NỘI DUNG CHÍNH THEO TRẠNG THÁI */}
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

              {/* Cuốc xe gối đầu khi đang chở khách (Back-to-back Dispatch) */}
              {activeTrip.status === TRIP_STATUS.IN_PROGRESS && pendingOffers.length > 0 && (
                <View style={{ marginTop: 20 }}>
                  <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#0F766E', marginBottom: 10 }}>
                    ⚡ CÓ {pendingOffers.length} CUỐC GỐI ĐẦU ĐƯỢC GỢI Ý CHO BẠN:
                  </ThemedText>
                  {pendingOffers.map((offer) => (
                    <Pressable
                      key={offer.offerId}
                      style={styles.nearbyRideCard}
                      onPress={() => setSelectedOfferForDetail(offer)}
                    >
                      <View style={styles.rideCardTopRow}>
                        <ThemedText style={styles.ridePrice}>
                          {Number(offer.shippFare || 25000).toLocaleString('vi-VN')}đ
                        </ThemedText>
                        <View style={styles.distancePill}>
                          <ThemedText style={styles.distancePillText}>
                            {offer.distanceKm ? offer.distanceKm.toFixed(1) : '2.5'} km
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.dashedSeparator} />
                      <View style={styles.rideRouteRow}>
                        <Ionicons name="radio-button-on" size={18} color="#00B5B8" style={{ marginTop: 1 }} />
                        <ThemedText style={styles.rideAddressText} numberOfLines={2}>
                          {offer.pickUpAddress}
                        </ThemedText>
                      </View>
                      <View style={[styles.rideRouteRow, { marginBottom: 0 }]}>
                        <Ionicons name="radio-button-on" size={18} color="#F97316" style={{ marginTop: 1 }} />
                        <ThemedText style={styles.rideAddressText} numberOfLines={2}>
                          {offer.destinationAddress}
                        </ThemedText>
                      </View>
                      <Pressable
                        style={styles.viewDetailRideBtn}
                        onPress={() => setSelectedOfferForDetail(offer)}
                      >
                        <Ionicons name="eye-outline" size={18} color="#00B5B8" style={{ marginRight: 6 }} />
                        <ThemedText style={styles.viewDetailRideBtnText}>Xem chi tiết cuốc gối đầu</ThemedText>
                      </Pressable>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          ) : (
            /* TRẠNG THÁI: ONLINE VÀ ĐANG CHỜ / CÓ CUỐC XE QUANH ĐÂY */
            <View>
              {/* Tiêu đề danh sách cuốc xe (Khớp với Image 1) */}
              <View style={styles.sectionHeaderRow}>
                <ThemedText style={styles.sectionTitle}>Cuốc xe quanh đây</ThemedText>
                <ThemedText style={styles.sectionBadge}>
                  ({displayedOffers.length} cuốc mới)
                </ThemedText>
              </View>

              {/* Danh sách thẻ cuốc xe (Khớp hoàn toàn với Image 1) */}
              {displayedOffers.map((offer) => (
                <Pressable
                  key={offer.offerId}
                  style={styles.nearbyRideCard}
                  onPress={() => setSelectedOfferForDetail(offer)}
                >
                  {/* Dòng trên: Giá cước & Khoảng cách */}
                  <View style={styles.rideCardTopRow}>
                    <ThemedText style={styles.ridePrice}>
                      {Number(offer.shippFare || 25000).toLocaleString('vi-VN')}đ
                    </ThemedText>
                    <View style={styles.distancePill}>
                      <ThemedText style={styles.distancePillText}>
                        {offer.distanceKm ? offer.distanceKm.toFixed(1) : '2.5'} km
                      </ThemedText>
                    </View>
                  </View>

                  {/* Dòng kẻ đứt (Dashed Separator) */}
                  <View style={styles.dashedSeparator} />

                  {/* Điểm đón khách (Chấm xanh) */}
                  <View style={styles.rideRouteRow}>
                    <Ionicons name="radio-button-on" size={18} color="#00B5B8" style={{ marginTop: 1 }} />
                    <ThemedText style={styles.rideAddressText} numberOfLines={2}>
                      {offer.pickUpAddress}
                    </ThemedText>
                  </View>

                  {/* Điểm trả khách (Chấm cam) */}
                  <View style={[styles.rideRouteRow, { marginBottom: 0 }]}>
                    <Ionicons name="radio-button-on" size={18} color="#F97316" style={{ marginTop: 1 }} />
                    <ThemedText style={styles.rideAddressText} numberOfLines={2}>
                      {offer.destinationAddress}
                    </ThemedText>
                  </View>

                  {/* Nút Xem chi tiết chuyến xe (Chuyển việc nhận chuyến vào bên trong chi tiết) */}
                  <Pressable
                    style={styles.viewDetailRideBtn}
                    onPress={() => setSelectedOfferForDetail(offer)}
                  >
                    <Ionicons name="eye-outline" size={18} color="#00B5B8" style={{ marginRight: 6 }} />
                    <ThemedText style={styles.viewDetailRideBtnText}>Xem chi tiết chuyến xe</ThemedText>
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Modal Chi tiết chuyến xe ("sau đó tài xế bấm vào xem chuyến, ok thì nhận") */}
      <Modal
        visible={!!selectedOfferForDetail}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOfferForDetail(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header Modal */}
            <View style={styles.modalHeader}>
              <View>
                <ThemedText style={styles.modalTitle}>Chi tiết chuyến xe</ThemedText>
                <ThemedText style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                  Mã cuốc: #{String(selectedOfferForDetail?.offerId || '').slice(-6).toUpperCase()}
                </ThemedText>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setSelectedOfferForDetail(null)}
                hitSlop={8}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>

            {/* Bản đồ trực quan lộ trình & vị trí tài xế + khách */}
            {selectedOfferForDetail && (
              <View style={styles.modalMapContainer}>
                <WebView
                  originWhitelist={['*']}
                  source={{
                    html: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta charset="utf-8" />
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                        <style>
                          * { box-sizing: border-box; margin: 0; padding: 0; }
                          body, html, #map { height: 100%; width: 100%; overflow: hidden; background: #e5e7eb; }
                          .custom-pin {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-weight: 700;
                            font-size: 10px;
                            font-family: sans-serif;
                            border-radius: 50%;
                            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                            border: 2px solid #FFFFFF;
                          }
                        </style>
                      </head>
                      <body>
                        <div id="map"></div>
                        <script>
                          var pLat = ${selectedOfferForDetail.pickUpLatitude || (driverCoords.latitude - 0.006)};
                          var pLon = ${selectedOfferForDetail.pickUpLongitude || (driverCoords.longitude + 0.005)};
                          var dLat = ${selectedOfferForDetail.destinationLatitude || (driverCoords.latitude + 0.012)};
                          var dLon = ${selectedOfferForDetail.destinationLongitude || (driverCoords.longitude - 0.008)};
                          var drvLat = ${driverCoords.latitude};
                          var drvLon = ${driverCoords.longitude};

                          var map = L.map('map', { zoomControl: false }).setView([drvLat, drvLon], 14);
                          
                          L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                            maxZoom: 19,
                            subdomains: ['0', '1', '2', '3']
                          }).addTo(map);

                          // Tài xế (Xanh dương)
                          var drvIcon = L.divIcon({
                            className: 'custom-pin',
                            html: '<div style="background:#2563EB; width:26px; height:26px; border-radius:13px; display:flex; align-items:center; justify-content:center;">Bạn</div>',
                            iconSize: [26, 26],
                            iconAnchor: [13, 13]
                          });
                          L.marker([drvLat, drvLon], { icon: drvIcon }).addTo(map);

                          // Điểm đón (Xanh ngọc)
                          var pickupIcon = L.divIcon({
                            className: 'custom-pin',
                            html: '<div style="background:#00B5B8; width:26px; height:26px; border-radius:13px; display:flex; align-items:center; justify-content:center;">Đón</div>',
                            iconSize: [26, 26],
                            iconAnchor: [13, 13]
                          });
                          var pMarker = L.marker([pLat, pLon], { icon: pickupIcon }).addTo(map);

                          // Điểm đến (Cam)
                          var destIcon = L.divIcon({
                            className: 'custom-pin',
                            html: '<div style="background:#F97316; width:26px; height:26px; border-radius:13px; display:flex; align-items:center; justify-content:center;">Đến</div>',
                            iconSize: [26, 26],
                            iconAnchor: [13, 13]
                          });
                          var dMarker = L.marker([dLat, dLon], { icon: destIcon }).addTo(map);

                          // Tuyến đường thực tế bám sát mặt đường phố từ OSRM
                          var actualCoords = ${JSON.stringify(modalRouteCoords.length > 0 ? modalRouteCoords : [[selectedOfferForDetail.pickUpLatitude || (driverCoords.latitude - 0.006), selectedOfferForDetail.pickUpLongitude || (driverCoords.longitude + 0.005)], [selectedOfferForDetail.destinationLatitude || (driverCoords.latitude + 0.012), selectedOfferForDetail.destinationLongitude || (driverCoords.longitude - 0.008)]])};

                          // Đường viền 3D cho cung đường thực tế
                          L.polyline(actualCoords, {
                            color: '#00838F',
                            weight: 8,
                            opacity: 0.5,
                            lineJoin: 'round',
                            lineCap: 'round'
                          }).addTo(map);

                          // Cung đường di chuyển thực tế uốn lượn theo đường phố
                          var tripLine = L.polyline(actualCoords, {
                            color: '#00B5B8',
                            weight: 5,
                            opacity: 0.95,
                            lineJoin: 'round',
                            lineCap: 'round'
                          }).addTo(map);

                          // Đường nét đứt tiếp cận của tài xế đến điểm đón
                          L.polyline([[drvLat, drvLon], [pLat, pLon]], {
                            color: '#2563EB',
                            weight: 3,
                            dashArray: '5, 5',
                            opacity: 0.8
                          }).addTo(map);

                          var group = new L.featureGroup([
                            L.marker([drvLat, drvLon]),
                            pMarker,
                            dMarker,
                            tripLine
                          ]);
                          map.fitBounds(group.getBounds(), { padding: [35, 35] });
                        </script>
                      </body>
                      </html>
                    `
                  }}
                  scrollEnabled={false}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                  style={styles.modalMapWebView}
                />

                <View style={styles.modalMapBadge}>
                  {isLoadingModalRoute ? (
                    <ActivityIndicator size="small" color="#00B5B8" style={{ marginRight: 3 }} />
                  ) : (
                    <Ionicons name="navigate-circle" size={15} color="#00B5B8" />
                  )}
                  <ThemedText style={styles.modalMapBadgeText}>
                    {isLoadingModalRoute
                      ? 'Đang vẽ tuyến...'
                      : `Thực tế: ${modalDistanceKm || (selectedOfferForDetail?.distanceKm ? selectedOfferForDetail.distanceKm.toFixed(1) : '2.5')} km`}
                  </ThemedText>
                </View>
              </View>
            )}

            {/* Tiền cước nổi bật (Tối ưu không bị cắt chữ) */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12, paddingVertical: 4 }}>
              <ThemedText style={{ fontSize: 14, color: '#4B5563', marginRight: 6, fontWeight: '600' }}>Cước thu khách:</ThemedText>
              <ThemedText style={styles.modalPriceHighlight}>
                {Number(selectedOfferForDetail?.shippFare || 24000).toLocaleString('vi-VN')} đ
              </ThemedText>
            </View>

            {/* Lộ trình đón - trả */}
            <View style={styles.modalSection}>
              <View style={[styles.rideRouteRow, { marginBottom: 12 }]}>
                <Ionicons name="radio-button-on" size={20} color="#00B5B8" style={{ marginTop: 1 }} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#00B5B8' }}>
                    ĐIỂM ĐÓN KHÁCH
                  </ThemedText>
                  <ThemedText style={{ fontSize: 14, color: '#111827', fontWeight: '600', marginTop: 2 }}>
                    {selectedOfferForDetail?.pickUpAddress}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.rideRouteRow, { marginBottom: 0 }]}>
                <Ionicons name="radio-button-on" size={20} color="#F97316" style={{ marginTop: 1 }} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#EA580C' }}>
                    ĐIỂM TRẢ KHÁCH
                  </ThemedText>
                  <ThemedText style={{ fontSize: 14, color: '#111827', fontWeight: '600', marginTop: 2 }}>
                    {selectedOfferForDetail?.destinationAddress}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Chi tiết thông số cuốc xe */}
            <View style={styles.modalSection}>
              <View style={styles.modalRow}>
                <ThemedText style={styles.modalLabel}>Khoảng cách di chuyển:</ThemedText>
                <ThemedText style={styles.modalValue}>
                  {selectedOfferForDetail?.distanceKm ? selectedOfferForDetail.distanceKm.toFixed(1) : '2.5'} km
                </ThemedText>
              </View>

              <View style={styles.modalRow}>
                <ThemedText style={styles.modalLabel}>Khoảng cách tiếp cận:</ThemedText>
                <ThemedText style={styles.modalValue}>
                  ~{selectedOfferForDetail?.driverDistanceKm || '1.2'} km (ETA: ~{selectedOfferForDetail?.driverEtaMinutes || 3} phút)
                </ThemedText>
              </View>

              <View style={styles.modalRow}>
                <ThemedText style={styles.modalLabel}>Loại phương tiện:</ThemedText>
                <ThemedText style={styles.modalValue}>
                  {selectedOfferForDetail?.vehicleType === 'CAR' ? '🚗 Ô tô (Car)' : '🛵 Xe máy (Bike)'}
                </ThemedText>
              </View>

              <View style={[styles.modalRow, { marginBottom: 0 }]}>
                <ThemedText style={styles.modalLabel}>Thanh toán:</ThemedText>
                <ThemedText style={[styles.modalValue, { color: '#EF4444', fontWeight: '700' }]}>Chưa thanh toán</ThemedText>
              </View>
            </View>
            </ScrollView>

            {/* Nút hành động cố định ở đáy modal */}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalRejectBtn}
                onPress={() => setSelectedOfferForDetail(null)}
              >
                <ThemedText style={styles.modalRejectText}>Bỏ qua</ThemedText>
              </Pressable>

              <Pressable
                style={styles.modalAcceptBtn}
                onPress={() => handleAcceptOffer(selectedOfferForDetail)}
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.modalAcceptText}>Nhận chuyến</ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}
