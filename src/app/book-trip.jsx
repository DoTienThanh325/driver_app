import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SubHeader } from '@/components/ui/sub-header';
import { HanoiMapPicker } from '@/components/ui/hanoi-map-picker';
import {
  tripService,
  TRIP_STATUS,
  SHIPPING_TYPE,
  VEHICLE_TYPE,
} from '@/services/trip.service';
import { bookTripStyles as styles } from '@/styles/screens/book-trip.styles';

// Vị trí mặc định tại trung tâm Hà Nội để dễ dàng test matching
const DEFAULT_LOCATIONS = {
  HO_GUOM: {
    name: 'Hồ Hoàn Kiếm, Hoàn Kiếm, Hà Nội',
    latitude: 21.028511,
    longitude: 105.854444,
  },
  BACH_KHOA: {
    name: 'Đại học Bách Khoa, Hai Bà Trưng, Hà Nội',
    latitude: 21.00705,
    longitude: 105.84318,
  },
  LOTTE: {
    name: 'Lotte Center Liễu Giai, Ba Đình, Hà Nội',
    latitude: 21.033333,
    longitude: 105.814444,
  },
  NOI_BAI: {
    name: 'Sân bay Quốc tế Nội Bài, Sóc Sơn, Hà Nội',
    latitude: 21.218715,
    longitude: 105.804176,
  },
};

export default function BookTripScreen() {
  // Điểm đón (Pickup)
  const [pickUpAddress, setPickUpAddress] = useState(DEFAULT_LOCATIONS.HO_GUOM.name);
  const [pickUpCoords, setPickUpCoords] = useState({
    latitude: DEFAULT_LOCATIONS.HO_GUOM.latitude,
    longitude: DEFAULT_LOCATIONS.HO_GUOM.longitude,
  });

  // Điểm đến (Destination)
  const [destinationAddress, setDestinationAddress] = useState(DEFAULT_LOCATIONS.BACH_KHOA.name);
  const [destinationCoords, setDestinationCoords] = useState({
    latitude: DEFAULT_LOCATIONS.BACH_KHOA.latitude,
    longitude: DEFAULT_LOCATIONS.BACH_KHOA.longitude,
  });

  // Lựa chọn phương tiện & dịch vụ
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPE.MOTORBIKE);
  const [shippingType] = useState(SHIPPING_TYPE.PASSENGER);

  // Trạng thái chuyến đi & Polling
  const [activeTrip, setActiveTrip] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Bộ đếm giây tìm kiếm cho UX (Expanding Ring Search)
  const [searchSeconds, setSearchSeconds] = useState(0);

  // Điều khiển Map Picker Modal
  const [pickerTarget, setPickerTarget] = useState(null);
  const mapPickerRef = useRef(null);

  // Giá cước ước tính (VND)
  const shippFare = vehicleType === VEHICLE_TYPE.MOTORBIKE ? 25000 : 50000;

  // Kiểm tra chuyến đi đang hoạt động ngay khi vào màn hình
  const checkCurrentTrip = useCallback(async () => {
    const trip = await tripService.getCurrentTrip();
    if (
      trip &&
      [
        TRIP_STATUS.REQUESTED,
        TRIP_STATUS.SEARCHING_DRIVER,
        TRIP_STATUS.DRIVER_ASSIGNED,
        TRIP_STATUS.DRIVER_ARRIVING,
        TRIP_STATUS.IN_PROGRESS,
      ].includes(trip.status)
    ) {
      setActiveTrip(trip);
    }
  }, []);

  useEffect(() => {
    checkCurrentTrip();
  }, [checkCurrentTrip]);

  // Bộ đếm thời gian khi đang tìm tài xế (0 - 45s)
  useEffect(() => {
    const isSearching =
      activeTrip?.status === TRIP_STATUS.REQUESTED ||
      activeTrip?.status === TRIP_STATUS.SEARCHING_DRIVER;

    if (!isSearching) return;

    const timer = setInterval(() => {
      setSearchSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTrip?.status]);

  // Polling trạng thái chuyến đi nếu đang trong tiến trình tìm/nhận tài xế
  useEffect(() => {
    if (!activeTrip?.id) return;

    const isOngoing = [
      TRIP_STATUS.REQUESTED,
      TRIP_STATUS.SEARCHING_DRIVER,
      TRIP_STATUS.DRIVER_ASSIGNED,
      TRIP_STATUS.DRIVER_ARRIVING,
      TRIP_STATUS.IN_PROGRESS,
    ].includes(activeTrip.status);

    if (!isOngoing) return;

    const interval = setInterval(async () => {
      try {
        const updated = await tripService.getTripById(activeTrip.id);
        if (updated) {
          setActiveTrip(updated);
        }
      } catch {
        // Bỏ qua lỗi mạng tạm thời
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeTrip?.id, activeTrip?.status]);

  // Hành động đặt chuyến
  const handleCreateTrip = async () => {
    if (!pickUpAddress.trim() || !destinationAddress.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ Điểm đón và Điểm đến');
      return;
    }

    setIsSubmitting(true);
    setSearchSeconds(0);
    try {
      const payload = {
        pickUpLatitude: pickUpCoords.latitude,
        pickUpLongitude: pickUpCoords.longitude,
        pickUpAddress: pickUpAddress.trim(),
        destinationLatitude: destinationCoords.latitude,
        destinationLongitude: destinationCoords.longitude,
        destinationAddress: destinationAddress.trim(),
        shippingType,
        vehicleType,
        shippFare,
      };

      const res = await tripService.createTrip(payload);
      if (res?.tripId) {
        const createdTrip = await tripService.getTripById(res.tripId);
        setActiveTrip(createdTrip || { id: res.tripId, status: TRIP_STATUS.REQUESTED, ...payload });
      } else {
        Alert.alert('Thành công', 'Đã gửi yêu cầu đặt chuyến tới hệ sinh thái!');
      }
    } catch (err) {
      Alert.alert('Không thể đặt chuyến', err.message || 'Đang có cuốc xe chưa hoàn thành.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hành động hủy chuyến
  const handleCancelTrip = () => {
    if (!activeTrip?.id) return;

    Alert.alert('Hủy chuyến', 'Bạn có chắc chắn muốn hủy chuyến đi này?', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Đồng ý hủy',
        style: 'destructive',
        onPress: async () => {
          setIsCancelling(true);
          try {
            await tripService.cancelTrip(activeTrip.id, 'Khách hàng thay đổi kế hoạch');
            Alert.alert('Thông báo', 'Đã hủy chuyến đi thành công.');
            setActiveTrip(null);
          } catch (err) {
            Alert.alert('Lỗi', err.message || 'Không thể hủy chuyến.');
          } finally {
            setIsCancelling(false);
          }
        },
      },
    ]);
  };

  // Mở Map Picker chọn điểm
  const openMapFor = (target) => {
    setPickerTarget(target);
    setTimeout(() => {
      mapPickerRef.current?.openModal();
    }, 100);
  };

  // Callback nhận tọa độ và địa chỉ từ Map Picker
  const handleLocationPicked = (latOrCoords, lng) => {
    let lat = latOrCoords;
    let lon = lng;
    if (typeof latOrCoords === 'object' && latOrCoords !== null) {
      lat = latOrCoords.latitude || latOrCoords.lat;
      lon = latOrCoords.longitude || latOrCoords.lng;
    }
    const finalLat = Number(lat);
    const finalLng = Number(lon);

    if (pickerTarget === 'pickup') {
      setPickUpCoords({ latitude: finalLat, longitude: finalLng });
    } else if (pickerTarget === 'destination') {
      setDestinationCoords({ latitude: finalLat, longitude: finalLng });
    }
  };

  const handleAddressResolved = (address) => {
    if (pickerTarget === 'pickup') {
      setPickUpAddress(address);
    } else if (pickerTarget === 'destination') {
      setDestinationAddress(address);
    }
  };

  // Tính vòng quét hiện tại (Expanding Ring Search)
  const currentRound = activeTrip?.searchRound || (searchSeconds <= 10 ? 1 : searchSeconds <= 25 ? 2 : 3);
  const currentRadius = activeTrip?.searchRadiusKm || (currentRound === 1 ? 3 : currentRound === 2 ? 5 : 8);

  // Tiêu đề trạng thái
  const getStatusLabel = () => {
    switch (activeTrip?.status) {
      case TRIP_STATUS.REQUESTED:
      case TRIP_STATUS.SEARCHING_DRIVER:
        if (currentRound === 1) return 'Vòng 1: Tìm tài xế gần bạn nhất (< 3km)';
        if (currentRound === 2) return 'Vòng 2: Mở rộng bán kính tìm kiếm (5km)';
        return 'Vòng 3: Mở rộng & Tìm cuốc gối đầu (8km)';
      case TRIP_STATUS.DRIVER_ASSIGNED:
        return 'Tài xế đã nhận chuyến!';
      case TRIP_STATUS.DRIVER_ARRIVING:
        return 'Tài xế đang đến điểm đón';
      case TRIP_STATUS.IN_PROGRESS:
        return 'Chuyến đi đang diễn ra';
      case TRIP_STATUS.COMPLETED:
        return 'Chuyến đi đã hoàn thành!';
      case TRIP_STATUS.CANCELLED:
        return 'Chuyến đi đã bị hủy';
      case TRIP_STATUS.NO_DRIVER_FOUND:
        return 'Chưa tìm thấy tài xế sau 3 vòng quét';
      default:
        return 'Đang xử lý...';
    }
  };

  // Mô tả trạng thái
  const getStatusDescription = () => {
    if (activeTrip?.status === TRIP_STATUS.SEARCHING_DRIVER || activeTrip?.status === TRIP_STATUS.REQUESTED) {
      if (currentRound === 1) {
        return 'Hệ thống AI Matching đang quét các tài xế có thời gian tiếp cận nhanh nhất quanh bạn.';
      }
      if (currentRound === 2) {
        return 'Đang mở rộng bán kính 5km để kết nối các tài xế lân cận đang di chuyển.';
      }
      return 'Đang quét toàn diện khu vực 8km và các tài xế sắp hoàn thành chuyến đi gần bạn (Cuốc gối đầu).';
    }
    if (activeTrip?.status === TRIP_STATUS.DRIVER_ASSIGNED || activeTrip?.status === TRIP_STATUS.DRIVER_ARRIVING) {
      return 'Tài xế đang di chuyển tới điểm đón của bạn. Vui lòng giữ liên lạc điện thoại.';
    }
    if (activeTrip?.status === TRIP_STATUS.IN_PROGRESS) {
      return 'Chúc bạn có một chuyến đi an toàn và thoải mái cùng T&M!';
    }
    if (activeTrip?.status === TRIP_STATUS.COMPLETED) {
      return 'Cảm ơn bạn đã sử dụng dịch vụ gọi xe của T&M Transit.';
    }
    if (activeTrip?.status === TRIP_STATUS.NO_DRIVER_FOUND) {
      return 'Các tài xế trong bán kính 8km hiện đang bận hoặc chưa kịp phản hồi. Bạn có thể nhấn thử lại ngay.';
    }
    return 'Cuốc xe này đã kết thúc.';
  };

  const isSearching =
    activeTrip?.status === TRIP_STATUS.REQUESTED ||
    activeTrip?.status === TRIP_STATUS.SEARCHING_DRIVER;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <SubHeader
          title={activeTrip ? 'Theo dõi chuyến đi' : 'Đặt chuyến xe T&M'}
          onBack={() => router.back()}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ========================================================= */}
          {/* TRƯỜNG HỢP 1: ĐANG CÓ CHUYẾN ĐI (ACTIVE TRIP TRACKING)     */}
          {/* ========================================================= */}
          {activeTrip ? (
            <View style={styles.trackingCard}>
              {/* Radar Animation / Icon trạng thái */}
              <View
                style={[
                  styles.radarBox,
                  activeTrip.status === TRIP_STATUS.COMPLETED && {
                    backgroundColor: '#ECFDF5',
                    borderColor: '#10B981',
                  },
                  activeTrip.status === TRIP_STATUS.CANCELLED && {
                    backgroundColor: '#FEE2E2',
                    borderColor: '#EF4444',
                  },
                  activeTrip.status === TRIP_STATUS.NO_DRIVER_FOUND && {
                    backgroundColor: '#FEF3C7',
                    borderColor: '#F59E0B',
                  },
                ]}
              >
                {isSearching ? (
                  <ActivityIndicator size="large" color="#00B5B8" />
                ) : activeTrip.status === TRIP_STATUS.COMPLETED ? (
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                ) : activeTrip.status === TRIP_STATUS.CANCELLED ? (
                  <Ionicons name="close-circle" size={48} color="#EF4444" />
                ) : activeTrip.status === TRIP_STATUS.NO_DRIVER_FOUND ? (
                  <Ionicons name="alert-circle" size={48} color="#F59E0B" />
                ) : (
                  <Ionicons name="car" size={44} color="#00B5B8" />
                )}
              </View>

              {/* Đồng hồ đếm giây khi đang tìm kiếm */}
              {isSearching && (
                <View style={styles.timerChip}>
                  <Ionicons name="time-outline" size={14} color="#D97706" />
                  <ThemedText style={styles.timerText}>
                    Đang tìm: {searchSeconds}s / tối đa 45s
                  </ThemedText>
                </View>
              )}

              {/* Banner Vòng quét lũy tiến (Expanding Ring Search) */}
              {isSearching && (
                <View style={styles.roundBanner}>
                  <Ionicons name="navigate-circle" size={18} color="#0D9488" />
                  <ThemedText style={styles.roundBannerText}>
                    Bán kính quét: {currentRadius} km (Vòng {currentRound}/3)
                  </ThemedText>
                </View>
              )}

              {/* Thanh tiến trình 3 bước mở rộng bán kính (3km -> 5km -> 8km) */}
              {isSearching && (
                <View style={styles.progressStepsRow}>
                  {/* Bước 1: 3km */}
                  <View style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepBadge,
                        currentRound >= 1 && styles.stepBadgeActive,
                        currentRound > 1 && styles.stepBadgeDone,
                      ]}
                    >
                      {currentRound > 1 ? (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      ) : (
                        <ThemedText style={[styles.stepText, currentRound >= 1 && styles.stepTextActive]}>
                          1
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText style={[styles.stepSubLabel, currentRound === 1 && styles.stepSubLabelActive]}>
                      3 km
                    </ThemedText>
                  </View>

                  <View style={[styles.stepConnector, currentRound > 1 && styles.stepConnectorActive]} />

                  {/* Bước 2: 5km */}
                  <View style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepBadge,
                        currentRound >= 2 && styles.stepBadgeActive,
                        currentRound > 2 && styles.stepBadgeDone,
                      ]}
                    >
                      {currentRound > 2 ? (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      ) : (
                        <ThemedText style={[styles.stepText, currentRound >= 2 && styles.stepTextActive]}>
                          2
                        </ThemedText>
                      )}
                    </View>
                    <ThemedText style={[styles.stepSubLabel, currentRound === 2 && styles.stepSubLabelActive]}>
                      5 km
                    </ThemedText>
                  </View>

                  <View style={[styles.stepConnector, currentRound > 2 && styles.stepConnectorActive]} />

                  {/* Bước 3: 8km */}
                  <View style={styles.stepItem}>
                    <View style={[styles.stepBadge, currentRound === 3 && styles.stepBadgeActive]}>
                      <ThemedText style={[styles.stepText, currentRound === 3 && styles.stepTextActive]}>
                        3
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.stepSubLabel, currentRound === 3 && styles.stepSubLabelActive]}>
                      8 km
                    </ThemedText>
                  </View>
                </View>
              )}

              <ThemedText style={styles.trackingTitle}>{getStatusLabel()}</ThemedText>
              <ThemedText style={styles.trackingSubtitle}>{getStatusDescription()}</ThemedText>

              {/* Thông báo nếu là Cuốc gối đầu (Back-to-back Dispatch) */}
              {(activeTrip.status === TRIP_STATUS.DRIVER_ASSIGNED ||
                activeTrip.status === TRIP_STATUS.DRIVER_ARRIVING) &&
                activeTrip.backToBack && (
                  <View style={styles.backToBackNoticeBox}>
                    <Ionicons name="repeat" size={22} color="#0D9488" />
                    <ThemedText style={styles.backToBackNoticeText}>
                      ⚡ Cuốc xe gối đầu: Tài xế đang hoàn thành chuyến đi gần bạn (~1-2 phút) và sẽ lập tức di chuyển đến đón bạn!
                    </ThemedText>
                  </View>
                )}

              {/* Thông tin tài xế khi đã nhận chuyến */}
              {(activeTrip.status === TRIP_STATUS.DRIVER_ASSIGNED ||
                activeTrip.status === TRIP_STATUS.DRIVER_ARRIVING ||
                activeTrip.status === TRIP_STATUS.IN_PROGRESS) && (
                <View style={styles.driverAssignedBox}>
                  <ThemedText style={styles.driverTitleBadge}>
                    {activeTrip.vehicleType === 'CAR' ? '🚗 Đối tác tài xế Ô tô' : '🛵 Đối tác tài xế Xe máy'}
                  </ThemedText>
                  <ThemedText style={styles.driverStatusNotice}>
                    Mã tài xế: {activeTrip.driverId ? String(activeTrip.driverId).slice(0, 8) + '...' : 'Tài xế T&M'}
                  </ThemedText>
                </View>
              )}

              {/* Tóm tắt thông tin cuốc xe */}
              <View style={styles.tripSummaryBox}>
                <View style={styles.summaryRow}>
                  <Ionicons name="location" size={18} color="#10B981" />
                  <ThemedText style={styles.summaryText} numberOfLines={2}>
                    Đón: {activeTrip.pickUpAddress}
                  </ThemedText>
                </View>

                <View style={styles.summaryRow}>
                  <Ionicons name="flag" size={18} color="#EF4444" />
                  <ThemedText style={styles.summaryText} numberOfLines={2}>
                    Đến: {activeTrip.destinationAddress}
                  </ThemedText>
                </View>

                <View style={[styles.summaryRow, { marginTop: 4, marginBottom: 0 }]}>
                  <Ionicons name="wallet-outline" size={18} color="#00B5B8" />
                  <ThemedText style={[styles.summaryText, { fontWeight: '700', color: '#00B5B8' }]}>
                    Cước phí: {Number(activeTrip.shippFare || shippFare).toLocaleString('vi-VN')} đ
                  </ThemedText>
                </View>
              </View>

              {/* Nút hành động */}
              {isSearching || activeTrip.status === TRIP_STATUS.DRIVER_ASSIGNED ? (
                <Pressable
                  style={styles.cancelBtn}
                  onPress={handleCancelTrip}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <ThemedText style={styles.cancelBtnText}>HỦY TÌM CHUYẾN</ThemedText>
                  )}
                </Pressable>
              ) : activeTrip.status === TRIP_STATUS.NO_DRIVER_FOUND ? (
                <Pressable
                  style={[styles.bookButton, { width: '100%' }]}
                  onPress={() => setActiveTrip(null)}
                >
                  <ThemedText style={styles.bookButtonText}>THỬ ĐẶT LẠI NGAY</ThemedText>
                </Pressable>
              ) : (
                <Pressable
                  style={[styles.bookButton, { width: '100%' }]}
                  onPress={() => setActiveTrip(null)}
                >
                  <ThemedText style={styles.bookButtonText}>ĐẶT CHUYẾN MỚI</ThemedText>
                </Pressable>
              )}
            </View>
          ) : (
            /* ========================================================= */
            /* TRƯỜNG HỢP 2: FORM ĐIỀU HƯỚNG & ĐẶT CHUYẾN XE              */
            /* ========================================================= */
            <>
              {/* 1. Thẻ chọn Lộ trình */}
              <View style={styles.routeCard}>
                {/* Điểm đón */}
                <View style={styles.routeRow}>
                  <View style={styles.dotLineBox}>
                    <View style={styles.greenDot} />
                    <View style={styles.dottedLine} />
                  </View>
                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.inputLabel}>ĐIỂM ĐÓN (RƯỚC)</ThemedText>
                    <View style={styles.addressInputBox}>
                      <TextInput
                        style={styles.addressInput}
                        value={pickUpAddress}
                        onChangeText={setPickUpAddress}
                        placeholder="Nhập địa chỉ đón..."
                        placeholderTextColor="#9CA3AF"
                      />
                      <Pressable
                        style={styles.mapSelectBtn}
                        onPress={() => openMapFor('pickup')}
                      >
                        <Ionicons name="map-outline" size={20} color="#00B5B8" />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Điểm đến */}
                <View style={[styles.routeRow, { marginBottom: 0 }]}>
                  <View style={styles.dotLineBox}>
                    <View style={styles.redDot} />
                  </View>
                  <View style={styles.inputGroup}>
                    <ThemedText style={styles.inputLabel}>ĐIỂM ĐẾN (TRẢ KHÁCH)</ThemedText>
                    <View style={styles.addressInputBox}>
                      <TextInput
                        style={styles.addressInput}
                        value={destinationAddress}
                        onChangeText={setDestinationAddress}
                        placeholder="Nhập điểm bạn muốn đến..."
                        placeholderTextColor="#9CA3AF"
                      />
                      <Pressable
                        style={styles.mapSelectBtn}
                        onPress={() => openMapFor('destination')}
                      >
                        <Ionicons name="map-outline" size={20} color="#00B5B8" />
                      </Pressable>
                    </View>
                  </View>
                </View>

                {/* Gợi ý điểm đón nhanh */}
                <View style={styles.quickLocationsBox}>
                  <ThemedText style={styles.quickLocTitle}>Điểm đón phổ biến:</ThemedText>
                  <View style={styles.quickLocChips}>
                    <Pressable
                      style={styles.chipBtn}
                      onPress={() => {
                        setPickUpAddress(DEFAULT_LOCATIONS.HO_GUOM.name);
                        setPickUpCoords({
                          latitude: DEFAULT_LOCATIONS.HO_GUOM.latitude,
                          longitude: DEFAULT_LOCATIONS.HO_GUOM.longitude,
                        });
                      }}
                    >
                      <ThemedText style={styles.chipText}>📍 Hồ Gươm</ThemedText>
                    </Pressable>

                    <Pressable
                      style={styles.chipBtn}
                      onPress={() => {
                        setPickUpAddress(DEFAULT_LOCATIONS.BACH_KHOA.name);
                        setPickUpCoords({
                          latitude: DEFAULT_LOCATIONS.BACH_KHOA.latitude,
                          longitude: DEFAULT_LOCATIONS.BACH_KHOA.longitude,
                        });
                      }}
                    >
                      <ThemedText style={styles.chipText}>📍 ĐH Bách Khoa</ThemedText>
                    </Pressable>

                    <Pressable
                      style={styles.chipBtn}
                      onPress={() => {
                        setPickUpAddress(DEFAULT_LOCATIONS.LOTTE.name);
                        setPickUpCoords({
                          latitude: DEFAULT_LOCATIONS.LOTTE.latitude,
                          longitude: DEFAULT_LOCATIONS.LOTTE.longitude,
                        });
                      }}
                    >
                      <ThemedText style={styles.chipText}>📍 Lotte Liễu Giai</ThemedText>
                    </Pressable>
                  </View>
                </View>
              </View>

              {/* 2. Thẻ chọn Loại phương tiện */}
              <View style={styles.sectionCard}>
                <ThemedText style={styles.sectionHeading}>Phương tiện di chuyển</ThemedText>
                <View style={styles.vehicleGrid}>
                  {/* Xe máy */}
                  <Pressable
                    style={[
                      styles.vehicleCard,
                      vehicleType === VEHICLE_TYPE.MOTORBIKE && styles.vehicleCardActive,
                    ]}
                    onPress={() => setVehicleType(VEHICLE_TYPE.MOTORBIKE)}
                  >
                    <Ionicons
                      name="bicycle"
                      size={28}
                      color={vehicleType === VEHICLE_TYPE.MOTORBIKE ? '#00B5B8' : '#6B7280'}
                    />
                    <ThemedText style={styles.vehicleName}>Xe máy (Bike)</ThemedText>
                    <ThemedText style={styles.vehiclePrice}>25.000 đ</ThemedText>
                  </Pressable>

                  {/* Ô tô */}
                  <Pressable
                    style={[
                      styles.vehicleCard,
                      vehicleType === VEHICLE_TYPE.CAR && styles.vehicleCardActive,
                    ]}
                    onPress={() => setVehicleType(VEHICLE_TYPE.CAR)}
                  >
                    <Ionicons
                      name="car"
                      size={28}
                      color={vehicleType === VEHICLE_TYPE.CAR ? '#00B5B8' : '#6B7280'}
                    />
                    <ThemedText style={styles.vehicleName}>Ô tô (Car)</ThemedText>
                    <ThemedText style={styles.vehiclePrice}>50.000 đ</ThemedText>
                  </Pressable>
                </View>
              </View>

              {/* 3. Thẻ xác nhận & Nút Đặt xe */}
              <View style={styles.bottomActionCard}>
                <View style={styles.fareRow}>
                  <ThemedText style={styles.fareLabel}>Tổng cước dự kiến:</ThemedText>
                  <ThemedText style={styles.fareAmount}>
                    {Number(shippFare).toLocaleString('vi-VN')} đ
                  </ThemedText>
                </View>

                <Pressable
                  style={[styles.bookButton, isSubmitting && styles.bookButtonDisabled]}
                  onPress={handleCreateTrip}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <ThemedText style={styles.bookButtonText}>XÁC NHẬN ĐẶT CHUYẾN</ThemedText>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Modal Bản đồ để ghim điểm đón/điểm đến */}
      <HanoiMapPicker
        ref={mapPickerRef}
        onLocationChange={handleLocationPicked}
        onAddressResolved={handleAddressResolved}
        initialCoords={pickerTarget === 'pickup' ? pickUpCoords : destinationCoords}
        currentAddress={pickerTarget === 'pickup' ? pickUpAddress : destinationAddress}
      />
    </ThemedView>
  );
}
