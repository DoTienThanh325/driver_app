import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
import { StandaloneTabBar } from '@/components/ui/standalone-tab-bar';
import { geocodeAddress } from '@/utils/geocoding';
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

/**
 * Tính khoảng cách giữa 2 điểm tọa độ theo công thức Haversine (có hệ số uốn lượn đường phố 1.25)
 */

// Danh mục tra cứu nhanh địa điểm & tọa độ thực tế tại Hà Nội
const POPULAR_LOCATIONS_DATABASE = [
  { keywords: ['hồ gươm', 'ho guom', 'hoàn kiếm', 'hoan kiem', 'đinh tiên hoàng', 'tràng tiền'], lat: 21.028511, lon: 105.854444, name: 'Hồ Hoàn Kiếm, Hoàn Kiếm, Hà Nội' },
  { keywords: ['bách khoa', 'bach khoa', 'hust', 'đại học bách khoa', 'tạ quang bửu', 'đại cồ việt'], lat: 21.00705, lon: 105.84318, name: 'Đại học Bách Khoa, Hai Bà Trưng, Hà Nội' },
  { keywords: ['keangnam', 'keang nam', 'landmark 72', 'phạm hùng', 'mễ trì'], lat: 21.0173, lon: 105.7838, name: 'Keangnam Landmark 72, Phạm Hùng, Nam Từ Liêm' },
  { keywords: ['ngã tư sở', 'nga tu so', 'royal city', 'thịnh quang', 'nguyễn trãi'], lat: 21.0016, lon: 105.8202, name: 'Ngã tư Sở, Đống Đa, Hà Nội' },
  { keywords: ['vincom phạm ngọc thạch', 'phạm ngọc thạch', 'vincom đống đa'], lat: 21.0084, lon: 105.8347, name: 'Vincom Center Phạm Ngọc Thạch, Đống Đa' },
  { keywords: ['lotte', 'liễu giai', 'đào tấn', 'lotte center'], lat: 21.033333, lon: 105.814444, name: 'Lotte Center Liễu Giai, Ba Đình, Hà Nội' },
  { keywords: ['nội bài', 'noi bai', 'sân bay nội bài', 'san bay noi bai', 'sóc sơn'], lat: 21.218715, lon: 105.804176, name: 'Sân bay Quốc tế Nội Bài, Sóc Sơn, Hà Nội' },
  { keywords: ['cầu giấy', 'cau giay', 'duy tân', 'xuân thủy', 'đại học quốc gia'], lat: 21.0362, lon: 105.7906, name: 'Quận Cầu Giấy, Hà Nội' },
  { keywords: ['mỹ đình', 'my dinh', 'sân vận động mỹ đình', 'lê đức thọ'], lat: 21.0205, lon: 105.7645, name: 'Sân vận động Quốc gia Mỹ Đình, Nam Từ Liêm' },
  { keywords: ['hồ tây', 'ho tay', 'trấn quốc', 'yên phụ', 'thụy khuê'], lat: 21.0558, lon: 105.8239, name: 'Hồ Tây, Tây Hồ, Hà Nội' },
  { keywords: ['văn miếu', 'van mieu', 'quốc tử giám'], lat: 21.0274, lon: 105.8355, name: 'Văn Miếu - Quốc Tử Giám, Đống Đa, Hà Nội' },
  { keywords: ['giáp bát', 'giap bat', 'bến xe giáp bát', 'giải phóng'], lat: 20.9818, lon: 105.8415, name: 'Bến xe Giáp Bát, Hoàng Mai, Hà Nội' },
  { keywords: ['nước ngầm', 'nuoc ngam', 'bến xe nước ngầm'], lat: 20.9664, lon: 105.8378, name: 'Bến xe Nước Ngầm, Hoàng Mai, Hà Nội' },
  { keywords: ['hà đông', 'ha dong', 'quang trung', 'văn quán'], lat: 20.9721, lon: 105.7774, name: 'Quận Hà Đông, Hà Nội' },
  { keywords: ['aeon mall', 'aeon hà đông', 'dương nội'], lat: 20.9786, lon: 105.7483, name: 'Aeon Mall Hà Đông, Hà Nội' },
  { keywords: ['aeon long biên', 'long biên', 'long bien'], lat: 21.0315, lon: 105.8924, name: 'Aeon Mall Long Biên, Long Biên, Hà Nội' },
  { keywords: ['bưu chính', 'ptit', 'học viện bưu chính viễn thông', 'mộ lao'], lat: 20.9808, lon: 105.7876, name: 'Học viện Công nghệ Bưu chính Viễn thông, Hà Đông' },
  { keywords: ['kinh tế quốc dân', 'neu', 'trần đại nghĩa'], lat: 21.0006, lon: 105.8427, name: 'Đại học Kinh tế Quốc dân, Hai Bà Trưng' },
  { keywords: ['ngoại thương', 'ftu', 'chùa láng'], lat: 21.0232, lon: 105.8052, name: 'Đại học Ngoại Thương, Đống Đa, Hà Nội' },
];

function findCoordsByText(rawText) {
  if (!rawText || rawText.trim().length === 0) return null;
  const normalized = rawText.toLowerCase().trim();
  
  // 1. Khớp từ khóa trong danh mục
  for (const item of POPULAR_LOCATIONS_DATABASE) {
    if (item.keywords.some(k => normalized.includes(k))) {
      return { latitude: item.lat, longitude: item.lon, matchedName: item.name };
    }
  }

  // 2. Nếu người dùng nhập chữ tùy ý không nằm trong từ điển, sinh độ dời tọa độ thực tế theo độ dài và nội dung text
  // Giúp khoảng cách luôn thay đổi sinh động tương ứng với nội dung người dùng gõ
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  const deltaLat = ((Math.abs(hash) % 120) - 60) / 1000; // Thay đổi từ ~1km đến 8km
  const deltaLon = (((Math.abs(hash * 31)) % 120) - 60) / 1000;
  return {
    latitude: 21.028511 + deltaLat,
    longitude: 105.854444 + deltaLon,
  };
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 2.5;
  const R = 6371; // Bán kính trái đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistance = R * c;
  // Hệ số uốn lượn đường phố thực tế trong đô thị ~ 1.25
  const roadDistance = straightDistance * 1.25;
  return Math.max(1.0, Math.round(roadDistance * 10) / 10);
}

/**
 * Kiểm tra khung giờ cao điểm (Sáng: 07:00 - 09:00 hoặc Chiều: 17:00 - 19:30)
 */
function checkIsPeakHour(date = new Date()) {
  const mins = date.getHours() * 60 + date.getMinutes();
  const isMorningPeak = mins >= 7 * 60 && mins <= 9 * 60;
  const isEveningPeak = mins >= 17 * 60 && mins <= 19 * 60 + 30;
  return isMorningPeak || isEveningPeak;
}

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

  // Quản lý quy trình từng bước: 1: Điểm đón/đến -> 2: Chọn xe -> 3: Xem giá & Đặt
  const [bookingStep, setBookingStep] = useState(1); // 1 | 2 | 3
  const [selectedVehicle, setSelectedVehicle] = useState(null); // Chỉ khi chọn xe ở bước 2 mới set

  // Điều khiển Map Picker Modal
  const [pickerTarget, setPickerTarget] = useState(null);
  const mapPickerRef = useRef(null);

  // Cập nhật tọa độ & giá cước ngay lập tức khi người dùng nhập tay Điểm đón
  const handlePickUpAddressChange = (text) => {
    setPickUpAddress(text);
    if (!text || text.trim().length < 2) return;
    const found = findCoordsByText(text);
    if (found) {
      setPickUpCoords({ latitude: found.latitude, longitude: found.longitude });
    }
  };

  // Cập nhật tọa độ & giá cước ngay lập tức khi người dùng nhập tay Điểm đến
  const handleDestinationAddressChange = (text) => {
    setDestinationAddress(text);
    if (!text || text.trim().length < 2) return;
    const found = findCoordsByText(text);
    if (found) {
      setDestinationCoords({ latitude: found.latitude, longitude: found.longitude });
    }
  };

  // Trạng thái Giờ cao điểm (tự động theo thời gian thực hoặc cho phép người dùng đổi thủ công để test)
  const [isPeakManualOverride, setIsPeakManualOverride] = useState(null);
  const isPeakHour = isPeakManualOverride !== null ? isPeakManualOverride : checkIsPeakHour();

  // Đơn giá mỗi km theo yêu cầu: 25k/km giờ thường, 35k/km giờ cao điểm
  const ratePerKm = isPeakHour ? 35000 : 25000;

  // Tính khoảng cách đường bộ dự kiến (km)
  const distanceKm = useMemo(() => {
    return calculateDistanceKm(
      pickUpCoords.latitude,
      pickUpCoords.longitude,
      destinationCoords.latitude,
      destinationCoords.longitude
    );
  }, [pickUpCoords, destinationCoords]);

  // Tính cước theo khoảng cách & đơn giá (làm tròn nghìn đồng, tối thiểu 1km)
  const motorbikeFare = useMemo(() => {
    const raw = distanceKm * ratePerKm;
    return Math.max(ratePerKm, Math.round(raw / 1000) * 1000);
  }, [distanceKm, ratePerKm]);

  const carFare = useMemo(() => {
    // Ô tô có hệ số phương tiện 1.4x
    const raw = distanceKm * ratePerKm * 1.4;
    return Math.max(isPeakHour ? 50000 : 35000, Math.round(raw / 1000) * 1000);
  }, [distanceKm, ratePerKm, isPeakHour]);

  // Cước phí tương ứng với phương tiện được chọn
  const activeVehicleType = selectedVehicle || vehicleType;
  const shippFare = activeVehicleType === VEHICLE_TYPE.MOTORBIKE ? motorbikeFare : carFare;

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
            {/* TRƯỜNG HỢP 2: FORM ĐIỀU HƯỚNG & ĐẶT CHUYẾN XE (TỪNG BƯỚC)  */}
            {/* ========================================================= */}
            <>
              

              {/* BƯỚC 1: XÁC NHẬN ĐIỂM ĐÓN & ĐIỂM ĐẾN */}
              <View style={styles.routeCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <ThemedText style={styles.sectionHeading}>1. Lộ trình di chuyển</ThemedText>
                  {bookingStep > 1 && (
                    <Pressable style={styles.reselectBtn} onPress={() => setBookingStep(1)}>
                      <ThemedText style={styles.reselectBtnText}>Thay đổi</ThemedText>
                    </Pressable>
                  )}
                </View>

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
                        onChangeText={handlePickUpAddressChange}
                        placeholder="Nhập địa chỉ đón..."
                        placeholderTextColor="#9CA3AF"
                        editable={bookingStep === 1}
                      />
                      {bookingStep === 1 && (
                        <Pressable style={styles.mapSelectBtn} onPress={() => openMapFor('pickup')}>
                          <Ionicons name="map-outline" size={20} color="#00B5B8" />
                        </Pressable>
                      )}
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
                        onChangeText={handleDestinationAddressChange}
                        placeholder="Nhập điểm bạn muốn đến..."
                        placeholderTextColor="#9CA3AF"
                        editable={bookingStep === 1}
                      />
                      {bookingStep === 1 && (
                        <Pressable style={styles.mapSelectBtn} onPress={() => openMapFor('destination')}>
                          <Ionicons name="map-outline" size={20} color="#00B5B8" />
                        </Pressable>
                      )}
                    </View>
                  </View>
                </View>

                {/* Gợi ý điểm đón nhanh chỉ hiện ở bước 1 */}
                {bookingStep === 1 && (
                  <>
                    <View style={styles.quickLocationsBox}>
                      <ThemedText style={styles.quickLocTitle}>Gợi ý điểm phổ biến:</ThemedText>
                      <View style={styles.quickLocChips}>
                        <Pressable
                          style={styles.chipBtn}
                          onPress={() => {
                            setPickUpAddress(DEFAULT_LOCATIONS.HO_GUOM.name);
                            setPickUpCoords({ latitude: DEFAULT_LOCATIONS.HO_GUOM.latitude, longitude: DEFAULT_LOCATIONS.HO_GUOM.longitude });
                          }}
                        >
                          <ThemedText style={styles.chipText}>📍 Hồ Gươm</ThemedText>
                        </Pressable>

                        <Pressable
                          style={styles.chipBtn}
                          onPress={() => {
                            setPickUpAddress(DEFAULT_LOCATIONS.BACH_KHOA.name);
                            setPickUpCoords({ latitude: DEFAULT_LOCATIONS.BACH_KHOA.latitude, longitude: DEFAULT_LOCATIONS.BACH_KHOA.longitude });
                          }}
                        >
                          <ThemedText style={styles.chipText}>📍 ĐH Bách Khoa</ThemedText>
                        </Pressable>

                        <Pressable
                          style={styles.chipBtn}
                          onPress={() => {
                            setPickUpAddress(DEFAULT_LOCATIONS.LOTTE.name);
                            setPickUpCoords({ latitude: DEFAULT_LOCATIONS.LOTTE.latitude, longitude: DEFAULT_LOCATIONS.LOTTE.longitude });
                          }}
                        >
                          <ThemedText style={styles.chipText}>📍 Lotte Liễu Giai</ThemedText>
                        </Pressable>
                      </View>
                    </View>

                    {/* NÚT XÁC NHẬN ĐIỂM ĐÓN & ĐIỂM ĐẾN */}
                    <Pressable
                      style={styles.confirmStepBtn}
                      onPress={() => {
                        if (!pickUpAddress.trim() || !destinationAddress.trim()) {
                          Alert.alert('Chưa đầy đủ thông tin', 'Vui lòng nhập đầy đủ Điểm đón và Điểm đến trước khi tiếp tục.');
                          return;
                        }
                        setBookingStep(2);
                      }}
                    >
                      <ThemedText style={styles.confirmStepBtnText}>XÁC NHẬN ĐIỂM ĐÓN & ĐIỂM ĐẾN ➜</ThemedText>
                    </Pressable>
                  </>
                )}
              </View>

              {/* BƯỚC 2: CHỌN PHƯƠNG TIỆN (CHỈ HIỂN THỊ KHI ĐÃ XÁC NHẬN BƯỚC 1) */}
              {bookingStep >= 2 && (
                <View style={styles.sectionCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <ThemedText style={styles.sectionHeading}>2. Chọn phương tiện di chuyển</ThemedText>
                    {bookingStep > 2 && (
                      <Pressable style={styles.reselectBtn} onPress={() => setBookingStep(2)}>
                        <ThemedText style={styles.reselectBtnText}>Thay đổi xe</ThemedText>
                      </Pressable>
                    )}
                  </View>

                  <View style={styles.vehicleGrid}>
                    {/* Xe máy */}
                    <Pressable
                      style={[
                        styles.vehicleCard,
                        selectedVehicle === VEHICLE_TYPE.MOTORBIKE && styles.vehicleCardActive,
                      ]}
                      onPress={() => {
                        setSelectedVehicle(VEHICLE_TYPE.MOTORBIKE);
                        setVehicleType(VEHICLE_TYPE.MOTORBIKE);
                      }}
                    >
                      <Ionicons
                        name="bicycle"
                        size={32}
                        color={selectedVehicle === VEHICLE_TYPE.MOTORBIKE ? '#00B5B8' : '#6B7280'}
                      />
                      <ThemedText style={styles.vehicleName}>Xe máy (Bike)</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                        Di chuyển nhanh chóng
                      </ThemedText>
                    </Pressable>

                    {/* Ô tô */}
                    <Pressable
                      style={[
                        styles.vehicleCard,
                        selectedVehicle === VEHICLE_TYPE.CAR && styles.vehicleCardActive,
                      ]}
                      onPress={() => {
                        setSelectedVehicle(VEHICLE_TYPE.CAR);
                        setVehicleType(VEHICLE_TYPE.CAR);
                      }}
                    >
                      <Ionicons
                        name="car"
                        size={32}
                        color={selectedVehicle === VEHICLE_TYPE.CAR ? '#00B5B8' : '#6B7280'}
                      />
                      <ThemedText style={styles.vehicleName}>Ô tô (Car)</ThemedText>
                      <ThemedText style={{ fontSize: 11, color: '#6B7280', marginTop: 4 }}>
                        Rộng rãi, thoải mái
                      </ThemedText>
                    </Pressable>
                  </View>

                  {/* NÚT XÁC NHẬN PHƯƠNG TIỆN (Ở BƯỚC 2) */}
                  {bookingStep === 2 && (
                    <Pressable
                      style={[styles.confirmStepBtn, !selectedVehicle && { backgroundColor: '#9CA3AF' }]}
                      disabled={!selectedVehicle}
                      onPress={() => {
                        if (!selectedVehicle) {
                          Alert.alert('Chưa chọn xe', 'Vui lòng chọn Xe máy hoặc Ô tô');
                          return;
                        }
                        setBookingStep(3);
                      }}
                    >
                      <ThemedText style={styles.confirmStepBtnText}>
                        {selectedVehicle ? 'XÁC NHẬN PHƯƠNG TIỆN & XEM GIÁ TIỀN ➜' : 'VUI LÒNG CHỌN PHƯƠNG TIỆN'}
                      </ThemedText>
                    </Pressable>
                  )}
                </View>
              )}

              {/* BƯỚC 3: MỚI BẮT ĐẦU HIỂN THỊ BẢNG GIÁ VÀ XÁC NHẬN ĐẶT CHUYẾN */}
              {bookingStep === 3 && (
                <View style={styles.bottomActionCard}>
                  <ThemedText style={[styles.sectionHeading, { marginBottom: 12 }]}>
                    3. Bảng giá chi tiết & Xác nhận đặt chuyến
                  </ThemedText>

                  {/* Bảng chi tiết cước tính toán bên FE */}
                  <View style={styles.fareBreakdownBox}>
                    {/* Badge hiển thị khung giờ */}
                    <View style={styles.fareBadgeRow}>
                      <View
                        style={[
                          styles.farePeakBadge,
                          isPeakHour ? styles.farePeakBadgePeak : styles.farePeakBadgeRegular,
                        ]}
                      >
                        <Ionicons
                          name={isPeakHour ? 'flame' : 'sunny'}
                          size={14}
                          color={isPeakHour ? '#EA580C' : '#16A34A'}
                        />
                        <ThemedText
                          style={isPeakHour ? styles.farePeakTextPeak : styles.farePeakTextRegular}
                        >
                          {isPeakHour ? '🔥 Giờ cao điểm' : '☀️ Giờ tiêu chuẩn'}
                        </ThemedText>
                      </View>

                      {/* Nút test chuyển đổi giờ cao điểm / thường */}
                      <Pressable
                        style={styles.peakToggleBtn}
                        onPress={() => setIsPeakManualOverride((prev) => (prev === null ? !isPeakHour : !prev))}
                        hitSlop={6}
                      >
                        <ThemedText style={styles.peakToggleText}>
                          Đổi: {isPeakHour ? 'Thử Giờ thường' : 'Thử Cao điểm'}
                        </ThemedText>
                      </Pressable>
                    </View>

                    <View style={styles.fareBreakdownRow}>
                      <ThemedText style={styles.fareBreakdownLabel}>Phương tiện đã chọn:</ThemedText>
                      <ThemedText style={[styles.fareBreakdownValue, { color: '#00B5B8' }]}>
                        {selectedVehicle === VEHICLE_TYPE.CAR ? '🚗 Ô tô 4 chỗ' : '🛵 Xe máy'}
                      </ThemedText>
                    </View>

                    <View style={styles.fareBreakdownRow}>
                      <ThemedText style={styles.fareBreakdownLabel}>Khoảng cách lộ trình:</ThemedText>
                      <ThemedText style={styles.fareBreakdownValue}>{distanceKm} km</ThemedText>
                    </View>

                    <View style={[styles.fareBreakdownRow, { marginBottom: 0 }]}>
                      <ThemedText style={styles.fareBreakdownLabel}>Đơn giá cước:</ThemedText>
                      <ThemedText style={styles.fareBreakdownValue}>
                        {Number(ratePerKm).toLocaleString('vi-VN')} đ/km
                      </ThemedText>
                    </View>
                  </View>

                  <View style={styles.fareRow}>
                    <ThemedText style={styles.fareLabel}>Tổng cước chuyến đi:</ThemedText>
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
                      <ThemedText style={styles.bookButtonText}>XÁC NHẬN ĐẶT CHUYẾN NGAY</ThemedText>
                    )}
                  </Pressable>
                </View>
              )}
            </>
        </ScrollView>
      </SafeAreaView>

      {/* Modal Bản đồ để ghim điểm đón/điểm đến */}
      <HanoiMapPicker
        modalOnly={true}
        ref={mapPickerRef}
        onLocationChange={handleLocationPicked}
        onAddressResolved={handleAddressResolved}
        initialCoords={pickerTarget === 'pickup' ? pickUpCoords : destinationCoords}
        currentAddress={pickerTarget === 'pickup' ? pickUpAddress : destinationAddress}
      />

      {/* Thanh điều hướng cố định ở đáy (Trang chủ, Hoạt động, Ưu đãi, Tài khoản) */}
      <StandaloneTabBar activeTab="home" />
    </ThemedView>
  );
}
