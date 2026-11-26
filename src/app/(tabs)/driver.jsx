import { getUserErrorMessage } from '../../utils/error-message';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { router, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useDriverAvailability } from '@/hooks/use-driver-availability';
import { authService } from '@/services/auth.service';
import { userStorage } from '@/services/storage/user.storage';
import { tripService, TRIP_STATUS } from '@/services/trip.service';
import { getDriverTripAction } from '@/utils/driver-trip-actions';
import { reverseGeocodeCoords } from '@/utils/geocoding';
import { driverStyles as styles } from '@/styles/screens/driver.styles';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useNotifications } from '@/providers/notification-provider';

// Vị trí mặc định tài xế quanh trung tâm Hà Nội để dễ dàng bắt matching nếu chưa có GPS
const DEFAULT_DRIVER_COORDS = {
  latitude: 21.028511,
  longitude: 105.854444,
  name: 'Hồ Hoàn Kiếm, Hoàn Kiếm, Hà Nội',
};

const activeTripLabels = {
  [TRIP_STATUS.DRIVER_ASSIGNED]: ['Đang đến điểm đón', 'Đang đến quán'],
  [TRIP_STATUS.DRIVER_ARRIVING]: ['Đã đến điểm đón', 'Đã đến quán'],
  [TRIP_STATUS.IN_PROGRESS]: ['Đang chở khách', 'Đang giao món'],
};

export default function DriverScreen() {
  const [userProfile, setUserProfile] = useState(null);
  const { isAvailable, isUpdating, toggleAvailability } = useDriverAvailability(true);
  const { status: wsStatus, subscribeMessages } = useNotifications();

  // Tọa độ GPS của tài xế
  const [driverCoords, setDriverCoords] = useState(DEFAULT_DRIVER_COORDS);
  const [isLocating, setIsLocating] = useState(false);
  const driverCoordsRef = useRef(DEFAULT_DRIVER_COORDS);

  useEffect(() => {
    driverCoordsRef.current = driverCoords;
  }, [driverCoords]);

  // Hàm tự động lấy vị trí GPS thực tế hiện tại của tài xế và gửi ngay lên Redis
  const fetchCurrentDriverLocation = useCallback(async (sendUpdate = true) => {
    try {
      setIsLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Quyền truy cập vị trí GPS bị từ chối');
        return null;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      if (position?.coords) {
        const { latitude, longitude, heading, speed } = position.coords;
        let addressName = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        try {
          const addr = await reverseGeocodeCoords(latitude, longitude);
          if (addr) addressName = addr;
        } catch {
          // Bỏ qua lỗi reverse geocode nếu có
        }
        const updatedCoords = {
          latitude,
          longitude,
          name: addressName,
          heading: heading || 0,
          speed: speed || 0,
        };
        setDriverCoords(updatedCoords);
        if (sendUpdate) {
          // Cập nhật ngay tọa độ lên Redis qua endpoint POST /api/drivers/location
          tripService.updateLocation(latitude, longitude, heading || 0, speed || 0);
        }
        return updatedCoords;
      }
    } catch (err) {
      console.warn('Lỗi lấy vị trí GPS thực tế tài xế:', err?.message);
    } finally {
      setIsLocating(false);
    }
    return null;
  }, []);

  // Tự động lấy vị trí thực tế của tài xế ngay khi vào màn hình
  useEffect(() => {
    fetchCurrentDriverLocation(true);
  }, [fetchCurrentDriverLocation]);

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

  // Danh sách cuốc xe hiển thị thực tế từ AI Matching (không dùng dữ liệu mẫu)
  const displayedOffers = useMemo(() => {
    return pendingOffers || [];
  }, [pendingOffers]);

  // Cuốc xe đang nhận và thực hiện
  const [activeTrip, setActiveTrip] = useState(null);
  const [queuedTrip, setQueuedTrip] = useState(null);
  const [currentTripsStatus, setCurrentTripsStatus] = useState('loading');
  const currentTripsRequestRef = useRef(0);
  const currentTripsPendingRef = useRef(null);
  const acceptingOfferRef = useRef(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const statusUpdateRef = useRef(null);
  const tripAction = getDriverTripAction(activeTrip);
  const activeTripStatus = activeTrip?.status;
  const queuedTripId = queuedTrip?.id;

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

  // Theo dõi vị trí GPS và cập nhật liên tục lên Redis khi tài xế đang online
  useEffect(() => {
    let watcher = null;
    let heartbeatInterval = null;
    let isMounted = true;

    if (!isAvailable) return;

    // 1. Cập nhật ngay vị trí GPS hiện tại lên Redis
    fetchCurrentDriverLocation(true);

    // 2. Lắng nghe thay đổi GPS di chuyển thời gian thực từ phần cứng thiết bị
    async function startContinuousTracking() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        watcher = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // Cập nhật khi di chuyển từ 10 mét
            timeInterval: 4000,    // Hoặc mỗi 4 giây
          },
          (loc) => {
            if (!isMounted || !loc?.coords) return;
            const { latitude, longitude, heading, speed } = loc.coords;

            setDriverCoords((prev) => ({
              ...prev,
              latitude,
              longitude,
              heading: heading || 0,
              speed: speed || 0,
            }));

            // Cập nhật tọa độ thời gian thực lên Redis (POST /api/drivers/location)
            tripService.updateLocation(latitude, longitude, heading || 0, speed || 0);
          }
        );
      } catch (err) {
        console.warn('Lỗi watchPositionAsync của tài xế:', err);
      }
    }

    startContinuousTracking();

    // 3. Heartbeat định kỳ mỗi 5s để đảm bảo duy trì vị trí trong Redis ngay cả khi xe đỗ yên một chỗ
    heartbeatInterval = setInterval(() => {
      const current = driverCoordsRef.current;
      if (current?.latitude && current?.longitude) {
        tripService.updateLocation(
          current.latitude,
          current.longitude,
          current.heading || 0,
          current.speed || 0
        );
      }
    }, 5000);

    return () => {
      isMounted = false;
      if (watcher) watcher.remove();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, [isAvailable, fetchCurrentDriverLocation]);

  const fetchOffers = useCallback(async () => {
    if (!isAvailable || currentTripsStatus === 'loading') return;
    if (queuedTripId || (activeTripStatus && activeTripStatus !== TRIP_STATUS.IN_PROGRESS)) return;
    try {
      const offers = await tripService.getMyPendingOffers();
      if (!acceptingOfferRef.current) {
        setPendingOffers(activeTripStatus ? offers.filter((offer) => offer.backToBack) : offers);
      }
    } catch {
      // Bỏ qua lỗi kết nối tạm thời
    }
  }, [isAvailable, activeTripStatus, queuedTripId, currentTripsStatus]);

  // Quét cuốc xe mới từ AI Matching: dùng WebSocket khi connected, chỉ fallback polling khi mất WS
  useEffect(() => {
    if (!isAvailable || currentTripsStatus === 'loading') return;
    if (queuedTripId || (activeTripStatus && activeTripStatus !== TRIP_STATUS.IN_PROGRESS)) return;

    void fetchOffers();

    if (wsStatus === 'connected') {
      return undefined;
    }

    const offerInterval = setInterval(() => {
      void fetchOffers();
    }, 2500);

    return () => {
      clearInterval(offerInterval);
    };
  }, [isAvailable, activeTripStatus, queuedTripId, currentTripsStatus, wsStatus, fetchOffers]);

  const refreshCurrentTrips = useCallback(async () => {
    if (currentTripsPendingRef.current === currentTripsRequestRef.current) return;
    const request = ++currentTripsRequestRef.current;
    currentTripsPendingRef.current = request;
    try {
      const response = await tripService.getDriverCurrentTrips();
      if (request !== currentTripsRequestRef.current) return;
      setActiveTrip(response.currentTrip ?? null);
      setQueuedTrip(response.queuedTrip ?? null);
      setCurrentTripsStatus('ready');
    } catch {
      if (request === currentTripsRequestRef.current) setCurrentTripsStatus('error');
    } finally {
      if (currentTripsPendingRef.current === request) currentTripsPendingRef.current = null;
    }
  }, []);

  // Lắng nghe sự kiện WebSocket cho offer tài xế & cập nhật chuyến đang chạy
  useEffect(() => {
    return subscribeMessages((msg) => {
      if (msg?.type === 'DRIVER_OFFER_UPDATED' && msg?.data) {
        const { offerId, tripId, status } = msg.data;
        if (status === 'PENDING') {
          void fetchOffers();
        } else if (['EXPIRED', 'REJECTED', 'ACCEPTED', 'CANCELLED'].includes(status)) {
          setPendingOffers((prev) =>
            prev.filter((o) => String(o.offerId) !== String(offerId) && (!tripId || String(o.tripId) !== String(tripId)))
          );
        }
        return;
      }

      if (msg?.type === 'GENERAL' && /cuốc xe/i.test(msg?.title || '')) {
        void fetchOffers();
        return;
      }

      if (msg?.type?.startsWith('TRIP_') && msg?.data?.tripId) {
        const msgTripId = String(msg.data.tripId);
        if (
          (activeTrip?.id && String(activeTrip.id) === msgTripId) ||
          (queuedTrip?.id && String(queuedTrip.id) === msgTripId)
        ) {
          void refreshCurrentTrips();
        }
      }
    });
  }, [subscribeMessages, fetchOffers, refreshCurrentTrips, activeTrip?.id, queuedTrip?.id]);

  useFocusEffect(useCallback(() => {
    if (!userProfile?.id) return;

    const refresh = () => {
      if (!statusUpdateRef.current && !acceptingOfferRef.current) void refreshCurrentTrips();
    };
    refresh();
    if (wsStatus === 'connected') {
      return () => {
        currentTripsRequestRef.current += 1;
      };
    }

    const interval = setInterval(refresh, 3000);
    return () => {
      clearInterval(interval);
      currentTripsRequestRef.current += 1;
    };
  }, [userProfile?.id, wsStatus, refreshCurrentTrips]));

  const openCurrentTrip = (trip, payment = false, routeCoords = null) => {
    const { latitude, longitude } = driverCoordsRef.current;
    router.push({
      pathname: '/driver-active-trip',
      params: {
        tripId: trip.id,
        tripData: JSON.stringify(trip),
        driverLatitude: String(latitude),
        driverLongitude: String(longitude),
        ...(payment ? { openPayment: '1' } : {}),
        ...(routeCoords?.length ? { routeCoords: JSON.stringify(routeCoords) } : {}),
      },
    });
  };

  // Nhận cuốc xe (Hỗ trợ cả cuốc mới & cuốc gối đầu)
  const handleAcceptOffer = async (offer) => {
    if (!offer || queuedTrip || acceptingOfferRef.current || statusUpdateRef.current) return;
    if (activeTrip && (!offer.backToBack || activeTrip.status !== TRIP_STATUS.IN_PROGRESS)) return;
    acceptingOfferRef.current = true;
    currentTripsRequestRef.current += 1;
    setIsAccepting(true);
    try {
      setSelectedOfferForDetail(null);

      // Chuyển sang màn hình Chi tiết cuốc xe & Thông tin khách hàng
      const pLat = Number(offer.pickUpLatitude) || 21.0016;
      const pLon = Number(offer.pickUpLongitude) || 105.8202;
      const dLat = Number(offer.destinationLatitude) || 21.0173;
      const dLon = Number(offer.destinationLongitude) || 105.7838;
      const drvLat = Number(driverCoords?.latitude) || 21.028511;
      const drvLon = Number(driverCoords?.longitude) || 105.854444;

      const tripDetail = {
        id: offer.tripId || 'TRIP-' + Date.now(),
        status: TRIP_STATUS.DRIVER_ASSIGNED,
        shippFare: offer.shippFare ?? 45000,
        totalFoodPrice: offer.totalFoodPrice || null,
        shippingType: offer.shippingType || 'PASSENGER',
        foods: Array.isArray(offer.foods) ? offer.foods : [],
        pickUpAddress: offer.pickUpAddress,
        pickUpLatitude: pLat,
        pickUpLongitude: pLon,
        destinationAddress: offer.destinationAddress,
        destinationLatitude: dLat,
        destinationLongitude: dLon,
        driverLatitude: drvLat,
        driverLongitude: drvLon,
        vehicleType: offer.vehicleType || 'MOTORBIKE',
        distanceKm: offer.distanceKm || '2.5',
      };

      if (offer.isSample) {
        openCurrentTrip({ ...tripDetail, id: offer.tripId?.startsWith('sample') ? offer.tripId : 'TRIP-DEMO' }, false, modalRouteCoords);
        return;
      }

      await tripService.acceptTrip(offer.tripId);
      setPendingOffers([]);
      if (!activeTrip) {
        setActiveTrip(tripDetail);
        setCurrentTripsStatus('ready');
        openCurrentTrip(tripDetail, false, modalRouteCoords);
      }
      await refreshCurrentTrips();
    } catch (err) {
      Alert.alert('Không thể nhận chuyến', getUserErrorMessage(err, 'Không thể nhận chuyến lúc này. Vui lòng tải lại danh sách chuyến.'));
      setPendingOffers((prev) => prev.filter((o) => o.offerId !== offer.offerId));
    } finally {
      acceptingOfferRef.current = false;
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

  const handleAdvanceTripStatus = async () => {
    if (!activeTrip?.id || !tripAction || statusUpdateRef.current || acceptingOfferRef.current) return;

    const { nextStatus } = tripAction;
    statusUpdateRef.current = activeTrip.id;
    currentTripsRequestRef.current += 1;
    setIsUpdatingStatus(true);
    try {
      await tripService.updateTripStatus(activeTrip.id, nextStatus);
      const updatedTrip = { ...activeTrip, status: nextStatus };

      if (nextStatus === TRIP_STATUS.COMPLETED) {
        setActiveTrip(null);
        openCurrentTrip(updatedTrip, true);
      } else {
        setActiveTrip(updatedTrip);
      }
    } catch (err) {
      Alert.alert('Lỗi cập nhật', getUserErrorMessage(err, 'Không thể cập nhật trạng thái.'));
    } finally {
      statusUpdateRef.current = null;
      setIsUpdatingStatus(false);
      void refreshCurrentTrips();
    }
  };

  // Đổi tọa độ GPS hoặc lấy lại vị trí thực tế của tài xế
  const handleChangeDriverLocation = () => {
    Alert.alert(
      'Vị trí GPS của Tài xế',
      'Chọn vị trí thực tế của bạn hoặc chọn khu vực giả lập để thử nghiệm nhận chuyến:',
      [
        {
          text: '🎯 Lấy vị trí GPS thực tế hiện tại',
          onPress: () => fetchCurrentDriverLocation(true),
        },
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
      Alert.alert('Lỗi', getUserErrorMessage(err, 'Không thể tạo cuốc xe mô phỏng'));
    }
  };

  const driverName = userProfile?.fullName || userProfile?.username || 'Thành Trung';
  const initialLetter = driverName.charAt(0).toUpperCase();

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

              <NotificationBell style={styles.bellButton} />
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

          {activeTrip && (
            <>
              <View style={styles.sectionHeaderRow}>
                <ThemedText style={styles.sectionTitle}>Cuốc xe đang thực hiện</ThemedText>
              </View>
              <View style={styles.activeTripCard}>
                <View style={styles.activeTripHeader}>
                  <View style={styles.statusBadge}>
                    <ThemedText style={styles.statusBadgeText}>
                      {activeTripLabels[activeTrip.status]?.[activeTrip.shippingType === 'FOOD_DELIVERY' ? 1 : 0]}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.tripIdText}>
                    Mã: #{String(activeTrip.id || '').slice(-6).toUpperCase()}
                  </ThemedText>
                </View>

                {/* Thông tin lộ trình */}
                <View style={[styles.offerRouteBox, styles.activeTripRouteBox]}>
                  <View style={styles.activeTripStop}>
                    <Ionicons name="location" size={18} color="#10B981" />
                    <View style={styles.activeTripStopText}>
                      <ThemedText style={styles.activeTripStopLabel}>Điểm đón</ThemedText>
                      <ThemedText style={styles.activeTripAddress}>{activeTrip.pickUpAddress}</ThemedText>
                    </View>
                  </View>

                  <View style={styles.activeTripStop}>
                    <Ionicons name="flag" size={18} color="#EF4444" />
                    <View style={styles.activeTripStopText}>
                      <ThemedText style={styles.activeTripStopLabel}>Điểm đến</ThemedText>
                      <ThemedText style={styles.activeTripAddress}>{activeTrip.destinationAddress}</ThemedText>
                    </View>
                  </View>
                </View>

                {/* Cước phí */}
                <View style={styles.offerMetaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="wallet-outline" size={16} color="#00B5B8" />
                    <ThemedText style={[styles.metaText, { fontWeight: '700', color: '#00B5B8', fontSize: 14 }]}>
                      Thu cước: {Number(activeTrip.shippFare ?? 0).toLocaleString('vi-VN')} đ
                    </ThemedText>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="car-outline" size={16} color="#6B7280" />
                    <ThemedText style={styles.metaText}>
                      {activeTrip.shippingType === 'FOOD_DELIVERY'
                        ? 'Giao món'
                        : activeTrip.vehicleType === 'CAR' ? 'Ô tô' : 'Xe máy'}
                    </ThemedText>
                  </View>
                </View>

                <Pressable
                  accessibilityRole="button"
                  style={styles.viewDetailRideBtn}
                  disabled={isUpdatingStatus || isAccepting}
                  onPress={() => openCurrentTrip(activeTrip)}
                >
                  <ThemedText style={styles.viewDetailRideBtnText}>Tiếp tục cuốc xe</ThemedText>
                </Pressable>

                {tripAction && (
                  <Pressable
                    style={styles.activeStepBtn}
                    onPress={handleAdvanceTripStatus}
                    disabled={isUpdatingStatus || isAccepting}
                  >
                    {isUpdatingStatus ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.activeStepBtnText}>{tripAction.label}</ThemedText>
                    )}
                  </Pressable>
                )}

                {queuedTrip && (
                  <View style={[styles.offerRouteBox, styles.queuedTripBox]}>
                    <ThemedText style={styles.sectionTitle}>Cuốc tiếp theo</ThemedText>
                    <ThemedText style={styles.activeTripAddress}>{queuedTrip.pickUpAddress}</ThemedText>
                    <ThemedText style={styles.activeTripAddress}>{queuedTrip.destinationAddress}</ThemedText>
                  </View>
                )}
                {currentTripsStatus === 'error' && (
                  <View style={styles.activeTripSyncRow}>
                    <ThemedText style={styles.activeTripSyncText}>Chưa đồng bộ được cuốc xe</ThemedText>
                    <Pressable accessibilityRole="button" style={styles.activeTripRetry} onPress={refreshCurrentTrips}>
                      <ThemedText style={styles.activeTripRetryText}>Thử lại</ThemedText>
                    </Pressable>
                  </View>
                )}
              </View>
            </>
          )}

          {/* 2. Mục Các cuốc xe đã thực hiện */}
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
                      {isLocating
                        ? 'Đang định vị GPS...'
                        : driverCoords.name || `${driverCoords.latitude.toFixed(4)}, ${driverCoords.longitude.toFixed(4)}`}
                    </ThemedText>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Pressable
                    style={[styles.gpsChangeBtn, { paddingHorizontal: 10 }]}
                    onPress={() => fetchCurrentDriverLocation(true)}
                    disabled={isLocating}
                    hitSlop={6}
                  >
                    {isLocating ? (
                      <ActivityIndicator size="small" color="#00B5B8" />
                    ) : (
                      <Ionicons name="locate" size={16} color="#00B5B8" />
                    )}
                  </Pressable>
                  <Pressable style={styles.gpsChangeBtn} onPress={handleChangeDriverLocation}>
                    <ThemedText style={styles.gpsChangeText}>Đổi vị trí</ThemedText>
                  </Pressable>
                </View>
              </View>

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
            <View>
              {/* Cuốc xe gối đầu khi đang chở khách (Back-to-back Dispatch) */}
              {activeTrip.status === TRIP_STATUS.IN_PROGRESS && !queuedTrip && pendingOffers.length > 0 && (
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
            /* TRẠNG THÁI: ONLINE VÀ ĐANG CHỜ / CÓ CUỐC XE TỪ AI MATCHING */
            <View>
              {displayedOffers.length > 0 ? (
                <>
                  <View style={styles.sectionHeaderRow}>
                    <ThemedText style={styles.sectionTitle}>Cuốc xe chờ nhận</ThemedText>
                    <ThemedText style={styles.sectionBadge}>
                      ({displayedOffers.length} cuốc mới)
                    </ThemedText>
                  </View>

                  {displayedOffers.map((offer) => {
                    const isFood = offer.shippingType === 'FOOD_DELIVERY';
                    return (
                      <Pressable
                        key={offer.offerId}
                        style={styles.nearbyRideCard}
                        onPress={() => setSelectedOfferForDetail(offer)}
                      >
                        {/* Huy hiệu loại cuốc xe nếu là giao đồ ăn */}
                        {isFood && (
                          <View style={styles.foodDeliveryBadge}>
                            <Ionicons name="fast-food-outline" size={13} color="#EA580C" />
                            <ThemedText style={styles.foodDeliveryBadgeText}>Giao đồ ăn</ThemedText>
                          </View>
                        )}

                        {/* Dòng trên: Giá cước & Khoảng cách */}
                        <View style={styles.rideCardTopRow}>
                          <View>
                            <ThemedText style={styles.ridePrice}>
                              {Number(offer.shippFare || 25000).toLocaleString('vi-VN')}đ
                            </ThemedText>
                            {isFood && offer.totalFoodPrice ? (
                              <ThemedText style={{ fontSize: 12, color: '#EA580C', fontWeight: '600', marginTop: 2 }}>
                                + {Number(offer.totalFoodPrice).toLocaleString('vi-VN')}đ tiền món
                              </ThemedText>
                            ) : null}
                          </View>
                          <View style={styles.distancePill}>
                            <ThemedText style={styles.distancePillText}>
                              {offer.distanceKm ? offer.distanceKm.toFixed(1) : '2.5'} km
                            </ThemedText>
                          </View>
                        </View>

                        {/* Dòng kẻ đứt (Dashed Separator) */}
                        <View style={styles.dashedSeparator} />

                        {/* Điểm đón (Quán ăn hoặc Điểm đón khách) */}
                        <View style={styles.rideRouteRow}>
                          <Ionicons
                            name={isFood ? 'restaurant-outline' : 'radio-button-on'}
                            size={18}
                            color={isFood ? '#EA580C' : '#00B5B8'}
                            style={{ marginTop: 1 }}
                          />
                          <View style={{ flex: 1, marginLeft: 6 }}>
                            {isFood && (
                              <ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#EA580C', marginBottom: 1 }}>
                                QUÁN ĂN (LẤY MÓN)
                              </ThemedText>
                            )}
                            <ThemedText style={styles.rideAddressText} numberOfLines={2}>
                              {offer.pickUpAddress}
                            </ThemedText>
                          </View>
                        </View>

                        {/* Điểm trả (Khách nhận món hoặc Điểm trả khách) */}
                        <View style={[styles.rideRouteRow, { marginBottom: 0 }]}>
                          <Ionicons
                            name={isFood ? 'location-outline' : 'radio-button-on'}
                            size={18}
                            color="#F97316"
                            style={{ marginTop: 1 }}
                          />
                          <View style={{ flex: 1, marginLeft: 6 }}>
                            {isFood && (
                              <ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#F97316', marginBottom: 1 }}>
                                KHÁCH NHẬN (GIAO MÓN)
                              </ThemedText>
                            )}
                            <ThemedText style={styles.rideAddressText} numberOfLines={2}>
                              {offer.destinationAddress}
                            </ThemedText>
                          </View>
                        </View>

                        {/* Nút Xem chi tiết chuyến xe */}
                        <Pressable
                          style={styles.viewDetailRideBtn}
                          onPress={() => setSelectedOfferForDetail(offer)}
                        >
                          <Ionicons name="eye-outline" size={18} color="#00B5B8" style={{ marginRight: 6 }} />
                          <ThemedText style={styles.viewDetailRideBtnText}>Xem chi tiết chuyến xe</ThemedText>
                        </Pressable>
                      </Pressable>
                    );
                  })}
                </>
              ) : (
                <View style={{
                  backgroundColor: '#F9FAFB',
                  borderRadius: 16,
                  padding: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: '#E5E7EB',
                  marginTop: 8,
                }}>
                  <Ionicons name="radio-outline" size={36} color="#00B5B8" style={{ marginBottom: 10 }} />
                  <ThemedText style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>
                    Đang quét cuốc xe mới...
                  </ThemedText>
                  <ThemedText style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 4 }}>
                    Hệ thống AI Matching sẽ tự động điều phối khi có khách hàng đặt xe gần bạn.
                  </ThemedText>
                </View>
              )}
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

            {/* Tiền cước nổi bật hoặc bảng giá chi tiết cho đồ ăn */}
            {selectedOfferForDetail?.shippingType === 'FOOD_DELIVERY' ? (
              <View style={{ backgroundColor: '#FFF7ED', borderRadius: 16, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#FED7AA' }}>
                <View style={[styles.foodDeliveryBadge, { alignSelf: 'center', marginBottom: 8 }]}>
                  <Ionicons name="fast-food-outline" size={14} color="#EA580C" />
                  <ThemedText style={styles.foodDeliveryBadgeText}>ĐƠN GIAO ĐỒ ĂN</ThemedText>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <ThemedText style={{ fontSize: 13, color: '#4B5563', fontWeight: '600' }}>Cước ship tài xế nhận:</ThemedText>
                  <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#00B5B8' }}>
                    {Number(selectedOfferForDetail?.shippFare || 25000).toLocaleString('vi-VN')} đ
                  </ThemedText>
                </View>
                {selectedOfferForDetail?.totalFoodPrice ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <ThemedText style={{ fontSize: 13, color: '#4B5563', fontWeight: '600' }}>Tổng tiền món ăn:</ThemedText>
                    <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#EA580C' }}>
                      {Number(selectedOfferForDetail.totalFoodPrice).toLocaleString('vi-VN')} đ
                    </ThemedText>
                  </View>
                ) : null}
                <View style={{ height: 1, backgroundColor: '#FED7AA', marginVertical: 6 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <ThemedText style={{ fontSize: 14, color: '#111827', fontWeight: '700' }}>Tổng thu khách (COD):</ThemedText>
                  <ThemedText style={{ fontSize: 18, fontWeight: '800', color: '#EA580C' }}>
                    {Number((selectedOfferForDetail?.shippFare || 25000) + (selectedOfferForDetail?.totalFoodPrice || 0)).toLocaleString('vi-VN')} đ
                  </ThemedText>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 12, paddingVertical: 4 }}>
                <ThemedText style={{ fontSize: 14, color: '#4B5563', marginRight: 6, fontWeight: '600' }}>Cước thu khách:</ThemedText>
                <ThemedText style={styles.modalPriceHighlight}>
                  {Number(selectedOfferForDetail?.shippFare || 24000).toLocaleString('vi-VN')} đ
                </ThemedText>
              </View>
            )}

            {/* Lộ trình đón - trả */}
            <View style={styles.modalSection}>
              <View style={[styles.rideRouteRow, { marginBottom: 12 }]}>
                <Ionicons
                  name={selectedOfferForDetail?.shippingType === 'FOOD_DELIVERY' ? 'restaurant-outline' : 'radio-button-on'}
                  size={20}
                  color={selectedOfferForDetail?.shippingType === 'FOOD_DELIVERY' ? '#EA580C' : '#00B5B8'}
                  style={{ marginTop: 1 }}
                />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <ThemedText style={{ fontSize: 11, fontWeight: '700', color: selectedOfferForDetail?.shippingType === 'FOOD_DELIVERY' ? '#EA580C' : '#00B5B8' }}>
                    {selectedOfferForDetail?.shippingType === 'FOOD_DELIVERY' ? 'QUÁN ĂN (LẤY MÓN)' : 'ĐIỂM ĐÓN KHÁCH'}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 14, color: '#111827', fontWeight: '600', marginTop: 2 }}>
                    {selectedOfferForDetail?.pickUpAddress}
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.rideRouteRow, { marginBottom: 0 }]}>
                <Ionicons
                  name={selectedOfferForDetail?.shippingType === 'FOOD_DELIVERY' ? 'location-outline' : 'radio-button-on'}
                  size={20}
                  color="#F97316"
                  style={{ marginTop: 1 }}
                />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#EA580C' }}>
                    {selectedOfferForDetail?.shippingType === 'FOOD_DELIVERY' ? 'KHÁCH NHẬN (GIAO MÓN)' : 'ĐIỂM TRẢ KHÁCH'}
                  </ThemedText>
                  <ThemedText style={{ fontSize: 14, color: '#111827', fontWeight: '600', marginTop: 2 }}>
                    {selectedOfferForDetail?.destinationAddress}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Danh sách món ăn nếu là đơn giao đồ ăn */}
            {selectedOfferForDetail?.shippingType === 'FOOD_DELIVERY' &&
              Array.isArray(selectedOfferForDetail?.foods) &&
              selectedOfferForDetail.foods.length > 0 && (
                <View style={styles.modalFoodContainer}>
                  <View style={styles.modalFoodHeader}>
                    <ThemedText style={styles.modalFoodTitle}>Danh sách món ăn cần lấy:</ThemedText>
                    <ThemedText style={{ fontSize: 12, color: '#EA580C', fontWeight: '700' }}>
                      {selectedOfferForDetail.foods.length} món
                    </ThemedText>
                  </View>
                  {selectedOfferForDetail.foods.map((food, idx) => (
                    <View key={idx} style={styles.modalFoodItemRow}>
                      <ThemedText style={styles.modalFoodItemName} numberOfLines={1}>
                        {food.quantity ? `${food.quantity}x ` : ''}{food.foodName} {food.size ? `(${food.size})` : ''}
                      </ThemedText>
                      <ThemedText style={styles.modalFoodItemPrice}>
                        {Number(food.price).toLocaleString('vi-VN')} đ
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}

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
