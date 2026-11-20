import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WebView } from 'react-native-webview';
import { Image } from 'react-native';
import { driverService } from '@/services/driver.service';
import { paymentService, PAYMENT_METHOD, PAYMENT_STATUS } from '@/services/payment.service';
import { SubHeader } from '@/components/ui/sub-header';
import * as Location from 'expo-location';
import { HanoiMapPicker } from '@/components/ui/hanoi-map-picker';
import { RatingModal } from '@/components/ui/rating-modal';
import { geocodeAddress, reverseGeocodeCoords } from '@/utils/geocoding';
import { navigationHelper } from '@/utils/navigation';
import {
  tripService,
  TRIP_STATUS,
  SHIPPING_TYPE,
  VEHICLE_TYPE,
} from '@/services/trip.service';
import { bookTripStyles as styles } from '@/styles/screens/book-trip.styles';

// Vị trí mặc định tại trung tâm Hà Nội để dễ dàng test matching

// Danh sách địa điểm gợi ý phổ biến cho khách hàng
const SUGGESTED_LOCATIONS = [
  {
    id: 'ho-guom',
    title: 'Hồ Hoàn Kiếm',
    address: 'Hồ Hoàn Kiếm, Hoàn Kiếm, Hà Nội',
    latitude: 21.028511,
    longitude: 105.854444,
  },
  {
    id: 'bach-khoa',
    title: 'Đại học Bách Khoa',
    address: 'Đại học Bách Khoa, Hai Bà Trưng, Hà Nội',
    latitude: 21.00705,
    longitude: 105.84318,
  },
  {
    id: 'lotte',
    title: 'Lotte Center Liễu Giai',
    address: 'Lotte Center Liễu Giai, Ba Đình, Hà Nội',
    latitude: 21.033333,
    longitude: 105.814444,
  },
  {
    id: 'keangnam',
    title: 'Keangnam Landmark 72',
    address: 'Keangnam Landmark 72, Phạm Hùng, Nam Từ Liêm',
    latitude: 21.0173,
    longitude: 105.7838,
  },
  {
    id: 'noi-bai',
    title: 'Sân bay Quốc tế Nội Bài',
    address: 'Sân bay Quốc tế Nội Bài, Sóc Sơn, Hà Nội',
    latitude: 21.218715,
    longitude: 105.804176,
  },
];

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
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
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
  const dismissedTripIdRef = useRef(null);
  const trackingWebViewRef = useRef(null);
  const [activeTrip, setActiveTrip] = useState(() => {
    if (params.tripData) {
      try {
        const parsed = typeof params.tripData === 'string' ? JSON.parse(params.tripData) : params.tripData;
        if (parsed?.id && ![TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED].includes(parsed.status)) return parsed;
      } catch (e) {}
    }
    return null;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Bộ đếm giây tìm kiếm cho UX (Expanding Ring Search)
  const [searchSeconds, setSearchSeconds] = useState(0);
  const [driverProfile, setDriverProfile] = useState(null);
  const [driverLocation, setDriverLocation] = useState(null); // { latitude, longitude, heading, speed }
  const [trackingRouteCoords, setTrackingRouteCoords] = useState(() => {
    if (params.routeCoords) {
      try {
        const parsed = typeof params.routeCoords === 'string' ? JSON.parse(params.routeCoords) : params.routeCoords;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [];
  });
  const [tripPayment, setTripPayment] = useState(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState(
    params.preferredPayMethod || PAYMENT_METHOD.PAY_DIRECTLY
  );
  const [qrLoadError, setQrLoadError] = useState(false);
  const [isLoadingPayment, setIsLoadingPayment] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingTarget, setRatingTarget] = useState('DRIVER'); // 'DRIVER' | 'RESTAURANT'
  const [hasRatedTrip, setHasRatedTrip] = useState(false);
  const [hasRatedRestaurant, setHasRatedRestaurant] = useState(false);
  const autoPromptedRatingRef = useRef(false);

  // Tổng hợp thông tin tài khoản ngân hàng và mã VietQR thanh toán cho tài xế
  const driverQrInfo = useMemo(() => {
    const bankBin =
      tripPayment?.qrPayment?.bankBin ||
      activeTrip?.driverBankBin ||
      '970422'; // MBBank (Ngân hàng Quân Đội)

    const bankName =
      tripPayment?.qrPayment?.bankName ||
      activeTrip?.driverBankName ||
      'MBBank (Ngân hàng Quân Đội)';

    const bankAccountNumber =
      tripPayment?.qrPayment?.bankAccountNumber ||
      activeTrip?.driverBankAccountNumber ||
      driverProfile?.phoneNumber ||
      activeTrip?.driverPhone ||
      '0911000001';

    const driverName =
      driverProfile?.username ||
      activeTrip?.driverName ||
      'Tài xế đối tác T&M';

    const bankAccountName =
      tripPayment?.qrPayment?.bankAccountName ||
      activeTrip?.driverBankAccountName ||
      driverName.toUpperCase();

    const amount =
      tripPayment?.qrPayment?.amount ||
      tripPayment?.finalAmount ||
      activeTrip?.finalAmount ||
      activeTrip?.shippFare ||
      shippFare ||
      24000;

    const currentTripId = activeTrip?.id || params.tripId || 'TRIP';
    const transferContent =
      tripPayment?.qrPayment?.transferContent ||
      `THANH TOAN CHUYEN DI ${currentTripId}`;

    const qrUrl =
      tripPayment?.qrPayment?.qrDataURL ||
      `https://img.vietqr.io/image/${bankBin}-${bankAccountNumber}-compact2.png?amount=${Math.round(
        amount
      )}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(
        bankAccountName
      )}`;

    return {
      bankBin,
      bankName,
      bankAccountNumber,
      bankAccountName,
      driverName,
      amount,
      transferContent,
      qrUrl,
    };
  }, [tripPayment, activeTrip, driverProfile, shippFare, params.tripId]);

  // Hàm sao chép thông tin chuyển khoản vào bộ nhớ tạm
  const copyToClipboard = async (text, label) => {
    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(String(text));
      }
      Alert.alert('Đã sao chép', `Đã sao chép ${label} vào bộ nhớ tạm:\n${text}`);
    } catch {
      Alert.alert('Đã sao chép', `Đã sao chép ${label}: ${text}`);
    }
  };

  // Lựa chọn 1: Đặt chuyến mới (Đặt tiếp) - Quay trở lại màn hình đặt xe ban đầu sạch sẽ
  const handleBookNewTrip = () => {
    if (activeTrip?.id) {
      dismissedTripIdRef.current = String(activeTrip.id);
    }
    setActiveTrip(null);
    setTripPayment(null);
    setDriverProfile(null);
    setDriverLocation(null);
    setTrackingRouteCoords([]);
    setSearchSeconds(0);
    setIsSubmitting(false);
    setIsCancelling(false);
    setBookingStep(1);
    setSelectedVehicle(null);
    hasUserEditedPickupRef.current = false;
    setHasRatedTrip(false);
    autoPromptedRatingRef.current = false;

    // Xóa sạch query params trên route hiện tại mà không đẩy hay nhân đôi stack
    router.setParams({
      tripId: '',
      tripData: '',
      routeCoords: '',
      preferredPayMethod: '',
    });
  };

  // Lựa chọn 2: Về giao diện chính (Trang chủ) - Xóa sạch stack và trở về Tabs
  const handleGoHome = () => {
    if (activeTrip?.id) {
      dismissedTripIdRef.current = String(activeTrip.id);
    }
    setActiveTrip(null);
    setTripPayment(null);
    setDriverProfile(null);
    setDriverLocation(null);
    setTrackingRouteCoords([]);
    setSearchSeconds(0);
    setIsSubmitting(false);
    setIsCancelling(false);
    setBookingStep(1);
    setSelectedVehicle(null);
    hasUserEditedPickupRef.current = false;
    setHasRatedTrip(false);
    autoPromptedRatingRef.current = false;

    navigationHelper.resetToHome();
  };

  // Tự động mở popup đánh giá khi chuyến đi COMPLETED
  useEffect(() => {
    if (activeTrip?.status === TRIP_STATUS.COMPLETED && !hasRatedTrip && !autoPromptedRatingRef.current) {
      autoPromptedRatingRef.current = true;
      const timer = setTimeout(() => {
        setShowRatingModal(true);
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [activeTrip?.status, hasRatedTrip]);

  // Quản lý quy trình từng bước: 1: Điểm đón/đến -> 2: Chọn xe -> 3: Xem giá & Đặt
  const [bookingStep, setBookingStep] = useState(1); // 1 | 2 | 3
  const [selectedVehicle, setSelectedVehicle] = useState(null); // Chỉ khi chọn xe ở bước 2 mới set

  // Điều khiển Map Picker Modal & Tự động lấy vị trí hiện tại
  const [pickerTarget, setPickerTarget] = useState(null);
  const mapPickerRef = useRef(null);
  const [isLocatingUser, setIsLocatingUser] = useState(false);
  const hasUserEditedPickupRef = useRef(false);

  // Tự động xin quyền GPS và lấy vị trí hiện tại của khách hàng làm Điểm đón khi vào màn hình hoặc khi đặt chuyến mới
  useEffect(() => {
    let isMounted = true;

    async function detectUserLocation() {
      // Nếu đang có chuyến đi hoạt động, không ghi đè
      if (activeTrip) return;

      try {
        setIsLocatingUser(true);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!isMounted || hasUserEditedPickupRef.current) return;

        const { latitude, longitude } = location.coords;
        setPickUpCoords({ latitude, longitude });

        // Phân giải tọa độ sang tên địa chỉ chi tiết theo tiếng Việt chuẩn
        const address = await reverseGeocodeCoords(latitude, longitude);
        if (isMounted && address && !hasUserEditedPickupRef.current) {
          setPickUpAddress(address);
        }
      } catch (err) {
        console.warn('Lỗi tự động lấy vị trí GPS khách hàng:', err);
      } finally {
        if (isMounted) {
          setIsLocatingUser(false);
        }
      }
    }

    detectUserLocation();

    return () => {
      isMounted = false;
    };
  }, [activeTrip?.id]);

  // Đồng bộ thông tin chuyến đi khi params thay đổi (ví dụ: chuyển từ trip-confirm về)
  useEffect(() => {
    let isMounted = true;

    if (params.tripData) {
      try {
        const parsed = typeof params.tripData === 'string' ? JSON.parse(params.tripData) : params.tripData;
        if (parsed?.id) {
          if (dismissedTripIdRef.current && String(parsed.id) === dismissedTripIdRef.current) {
            return;
          }
          if (![TRIP_STATUS.COMPLETED, TRIP_STATUS.CANCELLED].includes(parsed.status)) {
            setActiveTrip((prev) => {
              if (prev?.id === parsed.id && prev?.status === parsed.status) {
                return prev;
              }
              return parsed;
            });
            return;
          }
        }
      } catch (e) {}
    }

    if (params.tripId) {
      if (dismissedTripIdRef.current && String(params.tripId) === dismissedTripIdRef.current) {
        return;
      }
      tripService.getTripById(params.tripId)
        .then((res) => {
          if (isMounted && res?.id) {
            if (dismissedTripIdRef.current && String(res.id) === dismissedTripIdRef.current) {
              return;
            }
            if ([
              TRIP_STATUS.REQUESTED,
              TRIP_STATUS.SEARCHING_DRIVER,
              TRIP_STATUS.DRIVER_ASSIGNED,
              TRIP_STATUS.DRIVER_ARRIVING,
              TRIP_STATUS.IN_PROGRESS,
            ].includes(res.status)) {
              setActiveTrip((prev) => {
                if (prev?.id === res.id && prev?.status === res.status) {
                  return prev;
                }
                return res;
              });
            }
          }
        })
        .catch(() => {});
    }

    return () => { isMounted = false; };
  }, [params.tripId, params.tripData]);

  // Đồng bộ tọa độ lộ trình từ params nếu có
  useEffect(() => {
    if (params.routeCoords) {
      try {
        const parsed = typeof params.routeCoords === 'string' ? JSON.parse(params.routeCoords) : params.routeCoords;
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTrackingRouteCoords((prev) => {
            if (prev?.length === parsed.length && prev[0]?.[0] === parsed[0]?.[0]) {
              return prev;
            }
            return parsed;
          });
        }
      } catch (e) {}
    }
  }, [params.routeCoords]);

  // Cập nhật tọa độ & giá cước ngay lập tức khi người dùng nhập tay Điểm đón
  const handlePickUpAddressChange = (text) => {
    hasUserEditedPickupRef.current = true;
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

  // Biểu phí bậc thang chuẩn thực tế (giống Be / Grab):
  const BIKE_BASE_KM = 2.0;
  const BIKE_BASE_PRICE = isPeakHour ? 18000 : 14000;
  const BIKE_PER_KM = isPeakHour ? 7000 : 5000;

  const CAR_BASE_KM = 2.0;
  const CAR_BASE_PRICE = isPeakHour ? 32000 : 25000;
  const CAR_PER_KM = isPeakHour ? 13000 : 10000;

  // Tính khoảng cách đường bộ dự kiến (km)
  const distanceKm = useMemo(() => {
    return calculateDistanceKm(
      pickUpCoords.latitude,
      pickUpCoords.longitude,
      destinationCoords.latitude,
      destinationCoords.longitude
    );
  }, [pickUpCoords, destinationCoords]);

  // Lộ trình & khoảng cách thực tế từ OSRM được tải trước trong nền
  const [precalculatedRouteCoords, setPrecalculatedRouteCoords] = useState([]);
  const [precalculatedDistanceKm, setPrecalculatedDistanceKm] = useState(null);
  const [precalculatedDurationMin, setPrecalculatedDurationMin] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchPrefetchRoute = async () => {
      if (!pickUpCoords?.latitude || !pickUpCoords?.longitude || !destinationCoords?.latitude || !destinationCoords?.longitude) {
        return;
      }
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pickUpCoords.longitude},${pickUpCoords.latitude};${destinationCoords.longitude},${destinationCoords.latitude}?overview=full&geometries=geojson`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'DriverApp-Client/1.0', Accept: 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.routes?.[0]) {
            const primaryRoute = data.routes[0];
            const distKm = Math.max(0.5, Math.round((primaryRoute.distance / 1000) * 10) / 10);
            const durationMin = Math.round(primaryRoute.duration / 60);
            const leafletCoords = primaryRoute.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
            if (isMounted) {
              setPrecalculatedDistanceKm(distKm);
              setPrecalculatedDurationMin(durationMin);
              setPrecalculatedRouteCoords(leafletCoords);
            }
          }
        }
      } catch (err) {
        // Fallback silently
      }
    };

    fetchPrefetchRoute();
    return () => { isMounted = false; };
  }, [pickUpCoords.latitude, pickUpCoords.longitude, destinationCoords.latitude, destinationCoords.longitude]);

  const displayDistanceKm = precalculatedDistanceKm || distanceKm;

  // Tính cước xe máy bậc thang
  const motorbikeFare = useMemo(() => {
    const dist = displayDistanceKm;
    if (dist <= BIKE_BASE_KM) {
      return BIKE_BASE_PRICE;
    }
    const extraKm = dist - BIKE_BASE_KM;
    const raw = BIKE_BASE_PRICE + extraKm * BIKE_PER_KM;
    return Math.round(raw / 1000) * 1000;
  }, [displayDistanceKm, BIKE_BASE_PRICE, BIKE_PER_KM]);

  // Tính cước ô tô bậc thang
  const carFare = useMemo(() => {
    const dist = displayDistanceKm;
    if (dist <= CAR_BASE_KM) {
      return CAR_BASE_PRICE;
    }
    const extraKm = dist - CAR_BASE_KM;
    const raw = CAR_BASE_PRICE + extraKm * CAR_PER_KM;
    return Math.round(raw / 1000) * 1000;
  }, [displayDistanceKm, CAR_BASE_PRICE, CAR_PER_KM]);

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
      if (dismissedTripIdRef.current && String(trip.id) === dismissedTripIdRef.current) {
        return;
      }
      setActiveTrip((prev) => {
        if (prev?.id === trip.id && prev?.status === trip.status && prev?.driverId === trip.driverId) {
          return prev;
        }
        return {
          ...prev,
          ...trip,
          distanceKm: trip.distanceKm || prev?.distanceKm,
        };
      });
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

  
  // Đồng bộ và tự động gọi switchToPayBefore khi có tài xế nhận chuyến nếu khách đã chọn VietQR trước đó
  const isSwitchingPaymentRef = useRef(false);

  useEffect(() => {
    if (params.preferredPayMethod) {
      setSelectedPayMethod(params.preferredPayMethod);
    }
  }, [params.preferredPayMethod]);

  useEffect(() => {
    if (activeTrip?.id) {
      paymentService.getPreferredPaymentMethod(activeTrip.id).then((m) => {
        if (m) setSelectedPayMethod(m);
      });
    }
  }, [activeTrip?.id]);

  // Tự động chuyển đổi sang PAY_BEFORE trên backend khi đã có tài xế nhận cuốc
  useEffect(() => {
    if (!activeTrip?.id) return;
    if (String(activeTrip.id).startsWith('sample') || activeTrip.id === 'TRIP-DEMO') return;

    const hasDriver =
      Boolean(activeTrip.driverId) ||
      [
        TRIP_STATUS.DRIVER_ASSIGNED,
        TRIP_STATUS.DRIVER_ARRIVING,
        TRIP_STATUS.IN_PROGRESS,
        TRIP_STATUS.COMPLETED,
      ].includes(activeTrip.status);

    if (!hasDriver) return;

    const triggerAutoSwitch = async () => {
      const preferred =
        params.preferredPayMethod ||
        (await paymentService.getPreferredPaymentMethod(activeTrip.id));

      if (preferred === PAYMENT_METHOD.PAY_BEFORE) {
        setSelectedPayMethod(PAYMENT_METHOD.PAY_BEFORE);

        if (tripPayment?.method !== PAYMENT_METHOD.PAY_BEFORE && !isSwitchingPaymentRef.current) {
          isSwitchingPaymentRef.current = true;
          try {
            console.log('[BOOK-TRIP] Đã có tài xế nhận chuyến! Tự động gọi switchToPayBefore cho tripId:', activeTrip.id);
            const res = await paymentService.switchToPayBefore(activeTrip.id);
            if (res) {
              setTripPayment(res);
            }
          } catch (err) {
            console.warn('[BOOK-TRIP] Lỗi auto switchToPayBefore:', err?.message || err);
          } finally {
            isSwitchingPaymentRef.current = false;
          }
        }
      }
    };

    triggerAutoSwitch();
  }, [activeTrip?.id, activeTrip?.driverId, activeTrip?.status, params.preferredPayMethod, tripPayment?.method]);

  // Tải chi tiết thông tin thanh toán chuyến đi từ Payment Service và kiểm tra trạng thái xác nhận
  useEffect(() => {
    let isMounted = true;
    if (!activeTrip?.id) {
      setTripPayment(null);
      return;
    }

    const checkPayment = async () => {
      try {
        const res = await paymentService.getTripPayment(activeTrip.id);
        if (isMounted && res) {
          setTripPayment(res);
          const preferred =
            params.preferredPayMethod ||
            (await paymentService.getPreferredPaymentMethod(activeTrip.id));
          if (preferred === PAYMENT_METHOD.PAY_BEFORE) {
            setSelectedPayMethod(PAYMENT_METHOD.PAY_BEFORE);
          } else if (res.method) {
            setSelectedPayMethod(res.method);
          }
        }
      } catch (err) {}
    };

    checkPayment();

    // Polling định kỳ nếu chưa hoàn tất thanh toán để cập nhật khi tài xế xác nhận nhận tiền
    const interval = setInterval(() => {
      if (tripPayment?.status !== 'COMPLETED') {
        checkPayment();
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [activeTrip?.id, activeTrip?.status, tripPayment?.status]);

  // Xử lý khi khách hàng chọn phương thức thanh toán (Tiền mặt hoặc Chuyển khoản VietQR)
  const handleSelectPayMethod = async (method) => {
    // Không cho phép thay đổi phương thức thanh toán khi chuyến đi đã hoàn tất hoặc đã thanh toán xong
    if (activeTrip?.status === TRIP_STATUS.COMPLETED || tripPayment?.status === 'COMPLETED') {
      Alert.alert('Thông báo', 'Chuyến đi đã hoàn tất, không thể thay đổi phương thức thanh toán.');
      return;
    }

    setSelectedPayMethod(method);
    if (!activeTrip?.id) return;

    setIsLoadingPayment(true);
    try {
      if (method === PAYMENT_METHOD.PAY_BEFORE) {
        const res = await paymentService.switchToPayBefore(activeTrip.id);
        if (res) {
          setTripPayment(res);
        }
      } else {
        const res = await paymentService.switchToPayDirectly(activeTrip.id);
        if (res) {
          setTripPayment(res);
        }
      }
    } catch (err) {
      if (method === PAYMENT_METHOD.PAY_BEFORE) {
        Alert.alert(
          'Chưa thể tạo mã VietQR',
          err.message || 'Tài xế chưa cập nhật số tài khoản ngân hàng. Bạn có thể thanh toán trực tiếp tiền mặt.'
        );
        setSelectedPayMethod(PAYMENT_METHOD.PAY_DIRECTLY);
      }
    } finally {
      setIsLoadingPayment(false);
    }
  };

  // Tải chi tiết thông tin tài xế & phương tiện khi đã được gán tài xế
  useEffect(() => {
    let isMounted = true;
    if (activeTrip?.driverId) {
      driverService.getDriverDetail(activeTrip.driverId)
        .then((detail) => {
          if (isMounted && detail) {
            setDriverProfile(detail);
          }
        })
        .catch(() => {
          // Bỏ qua lỗi fallback
        });
    } else {
      setDriverProfile(null);
    }
    return () => { isMounted = false; };
  }, [activeTrip?.driverId]);

  // Lấy tuyến đường thực tế OSRM giữa điểm đón và điểm đến (hoặc điểm đón và tài xế)
  useEffect(() => {
    let isMounted = true;
    if (!activeTrip) return;

    // Nếu đã có sẵn tọa độ tuyến đường (truyền từ màn hình xác nhận hoặc prefetch), không cần tải lại
    if (trackingRouteCoords && trackingRouteCoords.length > 0) return;

    const pLat = activeTrip.pickUpLatitude;
    const pLon = activeTrip.pickUpLongitude;
    const dLat = activeTrip.destinationLatitude;
    const dLon = activeTrip.destinationLongitude;

    if (!pLat || !pLon || !dLat || !dLon) return;

    async function fetchTrackingRoute() {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${pLon},${pLat};${dLon},${dLat}?overview=full&geometries=geojson`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'DriverApp-Client/1.0', Accept: 'application/json' },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.routes?.[0]?.geometry?.coordinates) {
            const leafletCoords = data.routes[0].geometry.coordinates.map(([lon, lat]) => [lat, lon]);
            if (isMounted) {
              setTrackingRouteCoords(leafletCoords);
              return;
            }
          }
        }
      } catch (err) {
        // Fallback
      }
      if (isMounted) {
        setTrackingRouteCoords([[pLat, pLon], [dLat, dLon]]);
      }
    }

    fetchTrackingRoute();
    return () => { isMounted = false; };
  }, [activeTrip?.pickUpLatitude, activeTrip?.pickUpLongitude, activeTrip?.destinationLatitude, activeTrip?.destinationLongitude]);

  // HTML bản đồ Leaflet hiển thị trực quan Tài xế, Khách hàng và Tuyến đường
  const trackingMapHtml = useMemo(() => {
    if (!activeTrip) return '';

    const pLat = activeTrip.pickUpLatitude || 21.028511;
    const pLon = activeTrip.pickUpLongitude || 105.854444;
    const dLat = activeTrip.destinationLatitude || 21.00705;
    const dLon = activeTrip.destinationLongitude || 105.84318;

    // Vị trí tài xế: ưu tiên tọa độ realtime nhận từ Redis qua API, nếu chưa có thì ước tính
    const drvLat = driverLocation?.latitude || (pLat + 0.0042);
    const drvLon = driverLocation?.longitude || (pLon - 0.0035);

    const coordsJson = JSON.stringify(
      trackingRouteCoords.length > 0
        ? trackingRouteCoords
        : [[pLat, pLon], [dLat, dLon]]
    );

    const isCar = activeTrip.vehicleType === 'CAR';
    const vehicleSvg = isCar
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm7-10l-1.9 3.2c-.3.5-.8.8-1.4.8H8v2h2.3l2.6-4.3 1.9 1.9V18h2v-4.5l-2.4-2.4 1.4-2.3c.7 1.1 1.9 1.7 3.2 1.7V9c-1 0-1.9-.5-2.5-1.3l-1-1.6c-.4-.6-1-1.1-1.8-1.1H9v2h3.2l-.2.5zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/></svg>`;

    const hasDriver = !!activeTrip.driverId;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body, html, #map { height: 100%; width: 100%; overflow: hidden; background: #f8fafc; }
          .cust-pin {
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%; background: #00B5B8; color: #FFFFFF;
            font-weight: 800; font-size: 10px; font-family: sans-serif;
            border: 2px solid #FFFFFF; box-shadow: 0 3px 8px rgba(0,0,0,0.3);
          }
          .dest-pin {
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%; background: #EF4444; color: #FFFFFF;
            font-weight: 800; font-size: 10px; font-family: sans-serif;
            border: 2px solid #FFFFFF; box-shadow: 0 3px 8px rgba(0,0,0,0.3);
          }
          .driver-pin {
            display: flex; align-items: center; justify-content: center;
            border-radius: 50%; background: #2563EB;
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.45);
            border: 2.5px solid #FFFFFF;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${pLat}, ${pLon}], 14);
          window.map = map;
          L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 19,
            subdomains: ['0', '1', '2', '3']
          }).addTo(map);

          var pickupIcon = L.divIcon({
            className: 'cust-pin',
            html: '<div style="width:26px; height:26px; border-radius:13px; display:flex; align-items:center; justify-content:center;">Đón</div>',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });
          L.marker([${pLat}, ${pLon}], { icon: pickupIcon }).addTo(map);

          var destIcon = L.divIcon({
            className: 'dest-pin',
            html: '<div style="width:26px; height:26px; border-radius:13px; display:flex; align-items:center; justify-content:center;">Đến</div>',
            iconSize: [26, 26],
            iconAnchor: [13, 13]
          });
          L.marker([${dLat}, ${dLon}], { icon: destIcon }).addTo(map);

          ${hasDriver ? `
            var driverIcon = L.divIcon({
              className: 'driver-pin',
              html: '<div style="width:32px; height:32px; border-radius:16px; display:flex; align-items:center; justify-content:center;">${vehicleSvg}</div>',
              iconSize: [32, 32],
              iconAnchor: [16, 16]
            });
            window.driverMarker = L.marker([${drvLat}, ${drvLon}], { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);
          ` : 'window.driverMarker = null;'}

          window.updateDriverPosition = function(lat, lng) {
            try {
              if (window.driverMarker) {
                window.driverMarker.setLatLng([lat, lng]);
              } else if (window.map) {
                var dIcon = L.divIcon({
                  className: 'driver-pin',
                  html: '<div style="width:32px; height:32px; border-radius:16px; display:flex; align-items:center; justify-content:center;">${vehicleSvg}</div>',
                  iconSize: [32, 32],
                  iconAnchor: [16, 16]
                });
                window.driverMarker = L.marker([lat, lng], { icon: dIcon, zIndexOffset: 1000 }).addTo(window.map);
              }
            } catch(e) {}
          };

          var routeCoords = ${coordsJson};
          var routeLine = L.polyline(routeCoords, {
            color: '#00B5B8',
            weight: 5,
            opacity: 0.9,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(map);

          map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
        </script>
      </body>
      </html>
    `;
  }, [
    activeTrip?.pickUpLatitude,
    activeTrip?.pickUpLongitude,
    activeTrip?.destinationLatitude,
    activeTrip?.destinationLongitude,
    activeTrip?.vehicleType,
    activeTrip?.driverId,
    trackingRouteCoords,
  ]);

  // Cập nhật vị trí marker tài xế mượt mà trên bản đồ không reload WebView
  useEffect(() => {
    if (driverLocation?.latitude && driverLocation?.longitude && trackingWebViewRef.current) {
      const js = `
        if (typeof window.updateDriverPosition === 'function') {
          window.updateDriverPosition(${driverLocation.latitude}, ${driverLocation.longitude});
        }
        true;
      `;
      trackingWebViewRef.current.injectJavaScript(js);
    }
  }, [driverLocation?.latitude, driverLocation?.longitude]);

  // Polling trạng thái chuyến đi nếu đang trong tiến trình tìm/nhận tài xế hoặc đang theo dõi thanh toán
  useEffect(() => {
    if (!activeTrip?.id) return;

    // Tiếp tục polling ngay cả khi COMPLETED để nhận kết quả thanh toán khi tài xế bấm xác nhận
    const isFinished = [TRIP_STATUS.CANCELLED, TRIP_STATUS.NO_DRIVER_FOUND].includes(activeTrip.status);
    if (isFinished) return;

    const interval = setInterval(async () => {
      try {
        const updated = await tripService.getTripById(activeTrip.id);
        if (updated) {
          setActiveTrip((prev) => {
            if (
              prev?.id === updated.id &&
              prev?.status === updated.status &&
              prev?.driverId === updated.driverId
            ) {
              return prev;
            }
            return updated;
          });
        }

        // Cập nhật vị trí GPS realtime của tài xế từ Redis
        const currentDriverId = updated?.driverId || activeTrip.driverId;
        const currentStatus = updated?.status || activeTrip.status;
        if (
          currentDriverId &&
          [TRIP_STATUS.DRIVER_ASSIGNED, TRIP_STATUS.DRIVER_ARRIVING, TRIP_STATUS.IN_PROGRESS].includes(currentStatus)
        ) {
          try {
            const loc = await tripService.getDriverLocation(currentDriverId);
            if (loc?.latitude && loc?.longitude) {
              setDriverLocation((prev) => {
                const newLat = Number(loc.latitude);
                const newLng = Number(loc.longitude);
                if (prev?.latitude === newLat && prev?.longitude === newLng) {
                  return prev;
                }
                return {
                  latitude: newLat,
                  longitude: newLng,
                  heading: Number(loc.heading) || 0,
                  speed: Number(loc.speed) || 0,
                };
              });
            }
          } catch {}
        }

        // Cập nhật trạng thái payment từ PaymentService để đồng bộ giữa khách và tài xế
        if ([TRIP_STATUS.DRIVER_ARRIVING, TRIP_STATUS.IN_PROGRESS, TRIP_STATUS.COMPLETED].includes(activeTrip.status)) {
          const pay = await paymentService.getTripPayment(activeTrip.id);
          if (pay) {
            setTripPayment(pay);
            const preferred =
              params.preferredPayMethod ||
              (await paymentService.getPreferredPaymentMethod(activeTrip.id));
            if (preferred === PAYMENT_METHOD.PAY_BEFORE) {
              setSelectedPayMethod(PAYMENT_METHOD.PAY_BEFORE);
              // Nếu backend vẫn là PAY_DIRECTLY thì tự động gọi switchToPayBefore
              if (pay.method !== PAYMENT_METHOD.PAY_BEFORE && activeTrip.driverId && !isSwitchingPaymentRef.current) {
                isSwitchingPaymentRef.current = true;
                paymentService
                  .switchToPayBefore(activeTrip.id)
                  .then((switched) => {
                    if (switched) setTripPayment(switched);
                  })
                  .catch(() => {})
                  .finally(() => {
                    isSwitchingPaymentRef.current = false;
                  });
              }
            } else if (pay.method) {
              setSelectedPayMethod(pay.method);
            }
          }
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
        const newTrip = {
          id: res.tripId,
          status: TRIP_STATUS.REQUESTED,
          ...payload,
          distanceKm: displayDistanceKm,
        };
        setActiveTrip(newTrip);
        if (precalculatedRouteCoords?.length > 0) {
          setTrackingRouteCoords(precalculatedRouteCoords);
        }
      } else {
        Alert.alert('Thành công', 'Đã gửi yêu cầu đặt chuyến tới hệ sinh thái!');
      }
    } catch (err) {
      Alert.alert('Không thể đặt chuyến', err.message || 'Đang có cuốc xe chưa hoàn thành.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Hành động hủy chuyến / hủy tìm tài xế
  const handleCancelTrip = () => {
    if (!activeTrip?.id) return;

    const isFindingDriver =
      activeTrip.status === TRIP_STATUS.REQUESTED ||
      activeTrip.status === TRIP_STATUS.SEARCHING_DRIVER;

    const title = isFindingDriver ? 'Hủy tìm tài xế' : 'Hủy chuyến xe';
    const message = isFindingDriver
      ? 'Bạn có chắc chắn muốn dừng tìm kiếm tài xế cho chuyến đi này không?'
      : 'Bạn có chắc chắn muốn hủy chuyến đi này?';

    Alert.alert(title, message, [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Đồng ý hủy',
        style: 'destructive',
        onPress: async () => {
          setIsCancelling(true);
          const canceledTripId = String(activeTrip.id);
          try {
            await tripService.cancelTrip(
              canceledTripId,
              isFindingDriver ? 'Khách hàng hủy khi tìm kiếm tài xế' : 'Khách hàng thay đổi kế hoạch'
            );

            // Đánh dấu id chuyến đã hủy để ngăn useEffect/polling tự nạp lại
            dismissedTripIdRef.current = canceledTripId;

            // Xóa sạch trạng thái chuyến đi
            setActiveTrip(null);
            setTripPayment(null);
            setDriverProfile(null);
            setTrackingRouteCoords([]);
            setSearchSeconds(0);
            setIsSubmitting(false);
            setIsCancelling(false);
            setBookingStep(1);
            setSelectedVehicle(null);
            hasUserEditedPickupRef.current = false;

            // Hiển thị lựa chọn chuyển tiếp giao diện sau khi hủy
            Alert.alert(
              isFindingDriver ? 'Đã hủy tìm tài xế' : 'Đã hủy chuyến đi',
              'Chuyến đi đã được hủy thành công. Bạn muốn tìm chuyến khác hay quay về trang chủ?',
              [
                {
                  text: 'Về trang chủ',
                  onPress: () => {
                    handleGoHome();
                  },
                },
                {
                  text: 'Tìm chuyến khác',
                  style: 'default',
                  onPress: () => {
                    handleBookNewTrip();
                  },
                },
              ]
            );
          } catch (err) {
            // Khi gặp lỗi 403 hoặc chuyến đã hủy/thay đổi trên server
            Alert.alert(
              'Không thể hủy trên máy chủ',
              `${err.message || 'Lỗi kết nối hoặc trạng thái chuyến đã thay đổi.'}\n\nBạn có muốn gỡ chuyến này khỏi màn hình để tiếp tục không?`,
              [
                { text: 'Đóng', style: 'cancel' },
                {
                  text: 'Về trang chủ',
                  onPress: () => {
                    dismissedTripIdRef.current = canceledTripId;
                    handleGoHome();
                  },
                },
                {
                  text: 'Gỡ & Đặt mới',
                  style: 'destructive',
                  onPress: () => {
                    dismissedTripIdRef.current = canceledTripId;
                    handleBookNewTrip();
                  },
                },
              ]
            );
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
      hasUserEditedPickupRef.current = true;
      setPickUpCoords({ latitude: finalLat, longitude: finalLng });
    } else if (pickerTarget === 'destination') {
      setDestinationCoords({ latitude: finalLat, longitude: finalLng });
    }
  };

  const handleAddressResolved = (address) => {
    if (pickerTarget === 'pickup') {
      hasUserEditedPickupRef.current = true;
      setPickUpAddress(address);
    } else if (pickerTarget === 'destination') {
      setDestinationAddress(address);
    }
  };

  // Tính vòng quét hiện tại (Expanding Ring Search)
  const currentRound = activeTrip?.searchRound || (searchSeconds <= 10 ? 1 : searchSeconds <= 25 ? 2 : 3);
  const currentRadius = activeTrip?.searchRadiusKm || (currentRound === 1 ? 3 : currentRound === 2 ? 5 : 8);

  // Kiểm tra loại chuyến: Đặt món (FOOD_DELIVERY) hay Chở khách (PASSENGER)
  const isFoodTrip = useMemo(() => {
    return (
      activeTrip?.shippingType === SHIPPING_TYPE.FOOD_DELIVERY ||
      params.shippingType === 'FOOD_DELIVERY' ||
      Boolean(activeTrip?.foodSelectedsList?.length) ||
      Boolean(activeTrip?.totalFoodPrice)
    );
  }, [activeTrip?.shippingType, activeTrip?.foodSelectedsList, activeTrip?.totalFoodPrice, params.shippingType]);

  // Tiêu đề trạng thái
  const getStatusLabel = () => {
    switch (activeTrip?.status) {
      case TRIP_STATUS.REQUESTED:
      case TRIP_STATUS.SEARCHING_DRIVER:
        if (isFoodTrip) {
          if (currentRound === 1) return 'Vòng 1: Tìm tài xế giao món gần quán (< 3km)';
          if (currentRound === 2) return 'Vòng 2: Mở rộng bán kính tìm tài xế giao món (5km)';
          return 'Vòng 3: Mở rộng tìm kiếm & cuốc gối đầu (8km)';
        }
        if (currentRound === 1) return 'Vòng 1: Tìm tài xế gần bạn nhất (< 3km)';
        if (currentRound === 2) return 'Vòng 2: Mở rộng bán kính tìm kiếm (5km)';
        return 'Vòng 3: Mở rộng & Tìm cuốc gối đầu (8km)';
      case TRIP_STATUS.DRIVER_ASSIGNED:
        return isFoodTrip ? 'Tài xế đã nhận đơn giao món!' : 'Tài xế đã nhận chuyến!';
      case TRIP_STATUS.DRIVER_ARRIVING:
        return isFoodTrip ? 'Tài xế đang đến quán lấy món' : 'Tài xế đang đến điểm đón';
      case TRIP_STATUS.IN_PROGRESS:
        return isFoodTrip ? 'Tài xế đang giao món đến bạn' : 'Chuyến đi đang diễn ra';
      case TRIP_STATUS.COMPLETED:
        return isFoodTrip ? 'Giao món hoàn tất!' : 'Chuyến đi đã hoàn thành!';
      case TRIP_STATUS.CANCELLED:
        return isFoodTrip ? 'Đơn món ăn đã bị hủy' : 'Chuyến đi đã bị hủy';
      case TRIP_STATUS.NO_DRIVER_FOUND:
        return isFoodTrip ? 'Chưa tìm thấy tài xế giao món phù hợp' : 'Chưa tìm thấy tài xế sau 3 vòng quét';
      default:
        return 'Đang xử lý...';
    }
  };

  // Mô tả trạng thái
  const getStatusDescription = () => {
    if (activeTrip?.status === TRIP_STATUS.SEARCHING_DRIVER || activeTrip?.status === TRIP_STATUS.REQUESTED) {
      if (isFoodTrip) {
        return 'Quán đang chuẩn bị món. Hệ thống đang điều phối tài xế gần quán nhất để nhận đơn.';
      }
      if (currentRound === 1) {
        return 'Hệ thống AI Matching đang quét các tài xế có thời gian tiếp cận nhanh nhất quanh bạn.';
      }
      if (currentRound === 2) {
        return 'Đang mở rộng bán kính 5km để kết nối các tài xế lân cận đang di chuyển.';
      }
      return 'Đang quét toàn diện khu vực 8km và các tài xế sắp hoàn thành chuyến đi gần bạn (Cuốc gối đầu).';
    }
    if (activeTrip?.status === TRIP_STATUS.DRIVER_ASSIGNED || activeTrip?.status === TRIP_STATUS.DRIVER_ARRIVING) {
      if (isFoodTrip) {
        return 'Tài xế đang di chuyển tới nhà hàng để nhận món. Vui lòng để ý điện thoại.';
      }
      return 'Tài xế đang di chuyển tới điểm đón của bạn. Vui lòng giữ liên lạc điện thoại.';
    }
    if (activeTrip?.status === TRIP_STATUS.IN_PROGRESS) {
      if (isFoodTrip) {
        return 'Tài xế đã lấy món và đang trên đường giao tới bạn. Chúc bạn ngon miệng!';
      }
      return 'Chúc bạn có một chuyến đi an toàn và thoải mái cùng T&M!';
    }
    if (activeTrip?.status === TRIP_STATUS.COMPLETED) {
      if (isFoodTrip) {
        return 'Cảm ơn bạn đã đặt món cùng T&M Meal. Chúc bạn có bữa ăn thật ngon miệng!';
      }
      return 'Cảm ơn bạn đã sử dụng dịch vụ gọi xe của T&M Transit.';
    }
    if (activeTrip?.status === TRIP_STATUS.NO_DRIVER_FOUND) {
      if (isFoodTrip) {
        return 'Các tài xế giao đồ ăn quanh quán hiện đang bận. Bạn có thể nhấn tìm lại ngay.';
      }
      return 'Các tài xế trong bán kính 8km hiện đang bận hoặc chưa kịp phản hồi. Bạn có thể nhấn thử lại ngay.';
    }
    return 'Cuốc xe này đã kết thúc.';
  };

  const isSearching =
    activeTrip?.status === TRIP_STATUS.REQUESTED ||
    activeTrip?.status === TRIP_STATUS.SEARCHING_DRIVER;

  // Xử lý nút Back (trên thanh Header và phím cứng Android)
  const handleBackAction = useCallback(() => {
    if (isSearching) {
      Alert.alert(
        'Dừng tìm tài xế?',
        'Bạn đang trong quá trình tìm tài xế. Bạn có muốn hủy tìm kiếm để quay lại không?',
        [
          { text: 'Tiếp tục tìm', style: 'cancel' },
          {
            text: 'Hủy & Quay lại',
            style: 'destructive',
            onPress: async () => {
              if (activeTrip?.id) {
                try {
                  await tripService.cancelTrip(activeTrip.id, 'Khách hàng hủy khi tìm kiếm');
                } catch {}
              }
              handleGoHome();
            },
          },
        ]
      );
      return;
    }
    if (
      activeTrip?.status === TRIP_STATUS.COMPLETED ||
      activeTrip?.status === TRIP_STATUS.CANCELLED ||
      activeTrip?.status === TRIP_STATUS.NO_DRIVER_FOUND
    ) {
      handleGoHome();
    } else if (bookingStep > 1) {
      setBookingStep((prev) => prev - 1);
    } else {
      // Khi ở màn hình chọn vị trí ban đầu (không có activeTrip hoặc step 1),
      // luôn quay về Trang chủ để tránh quay lại màn hình giá/chuyến cũ trong navigation stack
      handleGoHome();
    }
  }, [isSearching, activeTrip?.id, activeTrip?.status, bookingStep]);

  useEffect(() => {
    const onBackPress = () => {
      handleBackAction();
      return true;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [handleBackAction]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <SubHeader
          title={activeTrip ? 'Theo dõi chuyến đi' : 'Đặt chuyến xe T&M'}
          onBack={handleBackAction}
        />

        {params.tripId && !activeTrip ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#00B5B8" />
            <ThemedText style={{ marginTop: 12, fontSize: 15, color: '#4B5563', fontWeight: '500' }}>
              Đang tải thông tin chuyến đi...
            </ThemedText>
          </View>
        ) : activeTrip ? (
          /* ========================================================= */
          /* GIAO DIỆN THEO DÕI: 1/2 TRÊN BẢN ĐỒ & 1/2 DƯỚI THÔNG TIN */
          /* ========================================================= */
          <View style={styles.trackingSplitLayout}>
            {/* NỬA TRÊN (1/2): BẢN ĐỒ HIỂN THỊ TÀI XẾ & KHÁCH & LỘ TRÌNH */}
            <View style={styles.trackingSplitMapBox}>
              <WebView
                key="tracking-split-map-webview"
                ref={trackingWebViewRef}
                source={{ html: trackingMapHtml }}
                style={styles.trackingSplitMapWebView}
                scrollEnabled={false}
                bounces={false}
                overScrollMode="never"
              />

              {/* Huy hiệu trạng thái nổi trên bản đồ */}
              <View style={styles.trackingSplitFloatingHeader}>
                <View style={styles.trackingSplitStatusBadge}>
                  <ThemedText style={styles.trackingSplitStatusText}>
                    {getStatusLabel()}
                  </ThemedText>
                </View>
                {isSearching && (
                  <View style={styles.timerChip}>
                    <Ionicons name="time-outline" size={14} color="#D97706" />
                    <ThemedText style={styles.timerText}>
                      {searchSeconds}s / 45s
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>

            {/* NỬA DƯỚI (1/2): THÔNG TIN CHUYẾN ĐI VÀ TÀI XẾ (KHÔNG ĐẶT TRONG BOX) */}
            <View style={styles.trackingSplitSheet}>
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[
                  styles.trackingSplitScroll,
                  { paddingBottom: Math.max(insets.bottom + 32, 48) },
                ]}
              >
                <View style={styles.trackingSplitHandle} />

                {/* Tiêu đề trạng thái & mô tả */}
                <ThemedText style={styles.trackingTitle}>{getStatusLabel()}</ThemedText>
                <ThemedText style={styles.trackingSubtitle}>{getStatusDescription()}</ThemedText>

                {/* Banner quét bán kính mở rộng khi đang tìm tài xế */}
                {isSearching && (
                  <View style={styles.roundBanner}>
                    <Ionicons name="navigate-circle" size={18} color="#0D9488" />
                    <ThemedText style={styles.roundBannerText}>
                      Bán kính quét: {currentRadius} km (Vòng {currentRound}/3)
                    </ThemedText>
                  </View>
                )}

                {/* Thông báo nếu là Cuốc gối đầu */}
                {(activeTrip.status === TRIP_STATUS.DRIVER_ASSIGNED ||
                  activeTrip.status === TRIP_STATUS.DRIVER_ARRIVING) &&
                  activeTrip.backToBack && (
                    <View style={styles.backToBackNoticeBox}>
                      <Ionicons name="repeat" size={22} color="#0D9488" />
                      <ThemedText style={styles.backToBackNoticeText}>
                        ⚡ Cuốc xe gối đầu: Tài xế đang hoàn thành chuyến gần bạn và sẽ lập tức tới đón bạn!
                      </ThemedText>
                    </View>
                  )}

                {/* Thông tin tài xế & Phương tiện & Đánh giá sao */}
                {(activeTrip.status === TRIP_STATUS.DRIVER_ASSIGNED ||
                  activeTrip.status === TRIP_STATUS.DRIVER_ARRIVING ||
                  activeTrip.status === TRIP_STATUS.IN_PROGRESS) && (
                  <View style={styles.driverProfileCard}>
                    <View style={styles.driverProfileHeader}>
                      <View style={styles.driverAvatarBox}>
                        <Ionicons
                          name={activeTrip.vehicleType === 'CAR' ? 'car' : 'bicycle'}
                          size={26}
                          color="#10B981"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.driverName}>
                          {driverProfile?.username || 'Tài xế đối tác T&M'}
                        </ThemedText>
                        <ThemedText style={styles.driverVehicleText}>
                          {activeTrip.vehicleType === 'CAR' ? '🚗 Xe ô tô 4 chỗ' : '🛵 Xe máy T&M Bike'}
                        </ThemedText>
                        {/* Đánh giá sao của tài xế */}
                        <View style={styles.driverRatingBox}>
                          <Ionicons name="star" size={12} color="#F59E0B" />
                          <ThemedText style={styles.driverRatingText}>
                            {driverProfile?.average_rating ? Number(driverProfile.average_rating).toFixed(1) : '5.0'} (Đánh giá cao)
                          </ThemedText>
                        </View>
                        {driverProfile?.phoneNumber && (
                          <ThemedText style={styles.driverPhoneText}>
                            📞 {driverProfile.phoneNumber}
                          </ThemedText>
                        )}
                      </View>
                    </View>

                    {/* Biển số xe */}
                    <View style={styles.driverPlateBadge}>
                      <ThemedText style={styles.driverPlateLabel}>Biển số đăng ký:</ThemedText>
                      <ThemedText style={styles.driverPlateNumber}>
                        {driverProfile?.vehicle?.plate
                          ? driverProfile.vehicle.plate.replace(/.*plate_/i, '').replace(/.jpg.*/i, '')
                          : (activeTrip.vehicleType === 'CAR' ? '30H-888.88' : '29A-123.45')}
                      </ThemedText>
                    </View>
                  </View>
                )}

                {/* Danh sách món ăn đã đặt nếu là đơn Food Delivery */}
                {isFoodTrip && (activeTrip?.foodSelectedsList?.length > 0 || params.foodsJson) && (
                  <View style={styles.foodTrackingCard}>
                    <View style={styles.foodTrackingHeader}>
                      <Ionicons name="fast-food" size={16} color="#00B5B8" />
                      <ThemedText style={styles.foodTrackingHeaderText}>
                        Món đã đặt ({activeTrip?.restaurantName || params.restaurantName || 'Nhà hàng'})
                      </ThemedText>
                    </View>
                    {(activeTrip?.foodSelectedsList || (params.foodsJson ? JSON.parse(params.foodsJson) : [])).map((item, idx) => (
                      <View key={`${item.foodId || idx}`} style={styles.foodTrackingItem}>
                        <ThemedText style={styles.foodTrackingItemName} numberOfLines={1}>
                          • {item.foodName || 'Món ăn'} ({item.size || 'Tiêu chuẩn'})
                        </ThemedText>
                        <ThemedText style={styles.foodTrackingItemQty}>x{item.quantity || 1}</ThemedText>
                        <ThemedText style={styles.foodTrackingItemPrice}>
                          {Number(item.totalPrice || item.price * (item.quantity || 1)).toLocaleString('vi-VN')} đ
                        </ThemedText>
                      </View>
                    ))}
                    {activeTrip?.totalFoodPrice ? (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#E2E8F0' }}>
                        <ThemedText style={{ fontSize: 12, fontWeight: '700', color: '#475569' }}>Tiền món:</ThemedText>
                        <ThemedText style={{ fontSize: 13, fontWeight: '800', color: '#00B5B8' }}>
                          {Number(activeTrip.totalFoodPrice).toLocaleString('vi-VN')} đ
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                )}

                {/* Chi tiết lộ trình & Cước phí */}
                <View style={styles.tripSummaryBox}>
                  <View style={styles.summaryRow}>
                    <Ionicons name={isFoodTrip ? 'storefront' : 'location'} size={18} color="#10B981" />
                    <ThemedText style={styles.summaryText} numberOfLines={2}>
                      {isFoodTrip ? 'Lấy tại quán: ' : 'Đón: '}{activeTrip.pickUpAddress}
                    </ThemedText>
                  </View>

                  <View style={styles.summaryRow}>
                    <Ionicons name={isFoodTrip ? 'home' : 'flag'} size={18} color="#EF4444" />
                    <ThemedText style={styles.summaryText} numberOfLines={2}>
                      {isFoodTrip ? 'Giao tới bạn: ' : 'Đến: '}{activeTrip.destinationAddress}
                    </ThemedText>
                  </View>

                  <View style={[styles.summaryRow, { marginTop: 4, marginBottom: 0 }]}>
                    <Ionicons name="wallet-outline" size={18} color="#00B5B8" />
                    <ThemedText style={[styles.summaryText, { fontWeight: '700', color: '#00B5B8' }]}>
                      {isFoodTrip
                        ? `Tổng cộng: ${Number(
                            (Number(activeTrip.shippFare) || 0) + (Number(activeTrip.totalFoodPrice) || 0)
                          ).toLocaleString('vi-VN')} đ (Gồm phí ship ${Number(activeTrip.shippFare || shippFare).toLocaleString('vi-VN')} đ)`
                        : `Cước phí: ${Number(activeTrip.shippFare || shippFare).toLocaleString('vi-VN')} đ`}
                    </ThemedText>
                  </View>
                </View>

                {/* Thanh trạng thái thanh toán & Xem mã QR trong suốt chuyến đi */}
                {(activeTrip.status === TRIP_STATUS.DRIVER_ASSIGNED ||
                  activeTrip.status === TRIP_STATUS.DRIVER_ARRIVING ||
                  activeTrip.status === TRIP_STATUS.IN_PROGRESS) && (
                  <View style={styles.inTripPayBar}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <ThemedText style={{ fontSize: 11, color: '#0369A1', fontWeight: '600' }}>
                        PHƯƠNG THỨC THANH TOÁN
                      </ThemedText>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                        <Ionicons
                          name={selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE ? 'qr-code' : 'cash'}
                          size={16}
                          color={selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE ? '#0284C7' : '#059669'}
                        />
                        <ThemedText style={{ fontSize: 13, fontWeight: '700', color: '#0F172A', marginLeft: 4 }}>
                          {selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE ? 'VietQR Napas 24/7' : 'Tiền mặt trực tiếp'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE ? (
                        <Pressable
                          style={styles.inTripPayBtn}
                          onPress={() => setShowQrModal(true)}
                        >
                          <Ionicons name="qr-code-outline" size={16} color="#FFFFFF" />
                          <ThemedText style={styles.inTripPayBtnText}>Xem mã QR</ThemedText>
                        </Pressable>
                      ) : (
                        <Pressable
                          style={[styles.inTripPayBtn, { backgroundColor: '#0284C7' }]}
                          onPress={() => handleSelectPayMethod(PAYMENT_METHOD.PAY_BEFORE)}
                        >
                          <Ionicons name="qr-code-outline" size={16} color="#FFFFFF" />
                          <ThemedText style={styles.inTripPayBtnText}>Đổi sang VietQR</ThemedText>
                        </Pressable>
                      )}
                    </View>
                  </View>
                )}

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
                ) : activeTrip.status === TRIP_STATUS.DRIVER_ARRIVING || activeTrip.status === TRIP_STATUS.IN_PROGRESS ? (
                  <View style={{ marginTop: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: '#F0FDF4', borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: '#DCFCE7' }}>
                    <Ionicons
                      name={activeTrip.status === TRIP_STATUS.DRIVER_ARRIVING ? 'navigate-circle-outline' : 'car-sport-outline'}
                      size={28}
                      color="#059669"
                    />
                    <ThemedText style={{ fontSize: 14, color: '#059669', fontWeight: '700', marginTop: 6, textAlign: 'center' }}>
                      {activeTrip.status === TRIP_STATUS.DRIVER_ARRIVING
                        ? 'Tài xế đang tới đón bạn. Chúc bạn có trải nghiệm an toàn!'
                        : 'Chuyến đi đang diễn ra an toàn & thuận tiện!'}
                    </ThemedText>
                  </View>
                ) : activeTrip.status === TRIP_STATUS.COMPLETED ? (
                  <>
                    {/* KHỐI HIỂN THỊ THANH TOÁN SAU KHI HOÀN THÀNH CHUYẾN ĐI (KHÓA ĐỔI PHƯƠNG THỨC) */}
                    <View style={styles.paymentCompleteCard}>
                      <View style={[styles.paymentHeaderRow, { marginBottom: 14 }]}>
                        <View style={[styles.paymentSuccessIcon, { backgroundColor: '#ECFDF5' }]}>
                          <Ionicons name="checkmark-done" size={24} color="#10B981" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.paymentTitle}>Chuyến đi đã hoàn tất</ThemedText>
                          <ThemedText style={styles.paymentSubtitle}>
                            {tripPayment?.status === 'COMPLETED'
                              ? 'Đã xác nhận thanh toán thành công'
                              : 'Chi tiết phương thức thanh toán chuyến đi'}
                          </ThemedText>
                        </View>
                        {tripPayment?.status === 'COMPLETED' && (
                          <View style={{ backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                            <ThemedText style={{ color: '#059669', fontSize: 12, fontWeight: '700' }}>
                              ĐÃ THANH TOÁN
                            </ThemedText>
                          </View>
                        )}
                      </View>

                      {/* Header phương thức thanh toán (Cố định, không cho đổi) */}
                      <View style={[styles.paymentHeaderRow, { marginBottom: 12, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F3F4F6' }]}>
                        <View style={[styles.paymentSuccessIcon, { backgroundColor: selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE ? '#EFF6FF' : '#ECFDF5' }]}>
                          <Ionicons
                            name={selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE ? 'qr-code-outline' : 'cash-outline'}
                            size={22}
                            color={selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE ? '#0284C7' : '#059669'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={[styles.paymentTitle, { fontSize: 15, color: selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE ? '#0369A1' : '#065F46' }]}>
                            {selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE ? 'Chuyển khoản VietQR 24/7' : 'Thanh toán tiền mặt'}
                          </ThemedText>
                          <ThemedText style={[styles.paymentSubtitle, { color: '#00B5B8', fontWeight: '800', fontSize: 16 }]}>
                            {Number(
                              isFoodTrip
                                ? (Number(activeTrip.shippFare || 0) + Number(activeTrip.totalFoodPrice || 0))
                                : (activeTrip.shippFare || shippFare)
                            ).toLocaleString('vi-VN')} đ
                          </ThemedText>
                        </View>
                      </View>

                      {/* Thông báo thanh toán hoàn tất gọn gàng */}
                      <View style={styles.paymentStatusNotice}>
                        <Ionicons name="checkmark-circle" size={20} color="#059669" />
                        <ThemedText style={styles.paymentStatusNoticeText}>
                          {selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE
                            ? `Đã hoàn tất thanh toán ${Number(
                                isFoodTrip
                                  ? (Number(activeTrip.shippFare || 0) + Number(activeTrip.totalFoodPrice || 0))
                                  : (activeTrip.shippFare || shippFare)
                              ).toLocaleString('vi-VN')} đ qua Chuyển khoản VietQR.`
                            : `Đã hoàn tất thanh toán ${Number(
                                isFoodTrip
                                  ? (Number(activeTrip.shippFare || 0) + Number(activeTrip.totalFoodPrice || 0))
                                  : (activeTrip.shippFare || shippFare)
                              ).toLocaleString('vi-VN')} đ tiền mặt cho tài xế.`}
                        </ThemedText>
                      </View>
                    </View>

                    {/* 2 LỰA CHỌN SAU KHI HOÀN THÀNH CHUYẾN: 1. ĐẶT TIẾP, 2. VỀ GIAO DIỆN CHÍNH */}
                    <View style={styles.completedActionsContainer}>
                      {/* NÚT ĐÁNH GIÁ CHUYẾN ĐI (1-5 SAO) CHO TÀI XẾ */}
                      {!hasRatedTrip ? (
                        <TouchableOpacity
                          style={[styles.bookButton, { backgroundColor: '#F59E0B', marginBottom: 6 }]}
                          onPress={() => {
                            setRatingTarget('DRIVER');
                            setShowRatingModal(true);
                          }}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="star" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                          <ThemedText style={styles.bookButtonText}>ĐÁNH GIÁ TÀI XẾ (1-5 SAO)</ThemedText>
                        </TouchableOpacity>
                      ) : (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', padding: 10, borderRadius: 12, marginBottom: 6, borderWidth: 1, borderColor: '#A7F3D0' }}>
                          <Ionicons name="checkmark-circle" size={16} color="#10B981" style={{ marginRight: 6 }} />
                          <ThemedText style={{ color: '#065F46', fontWeight: '700', fontSize: 13 }}>Bạn đã đánh giá tài xế</ThemedText>
                        </View>
                      )}

                      {/* NÚT ĐÁNH GIÁ QUÁN ĂN NẾU LÀ ĐƠN GIAO MÓN */}
                      {isFoodTrip && (
                        !hasRatedRestaurant ? (
                          <TouchableOpacity
                            style={[styles.bookButton, { backgroundColor: '#EA580C', marginBottom: 10 }]}
                            onPress={() => {
                              setRatingTarget('RESTAURANT');
                              setShowRatingModal(true);
                            }}
                            activeOpacity={0.8}
                          >
                            <Ionicons name="restaurant" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <ThemedText style={styles.bookButtonText}>ĐÁNH GIÁ NHÀ HÀNG & MÓN ĂN</ThemedText>
                          </TouchableOpacity>
                        ) : (
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF7ED', padding: 10, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#FED7AA' }}>
                            <Ionicons name="checkmark-circle" size={16} color="#EA580C" style={{ marginRight: 6 }} />
                            <ThemedText style={{ color: '#9A3412', fontWeight: '700', fontSize: 13 }}>Bạn đã đánh giá nhà hàng</ThemedText>
                          </View>
                        )
                      )}

                      <TouchableOpacity
                        style={[styles.bookButton, styles.primaryCompletedBtn]}
                        onPress={handleBookNewTrip}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <ThemedText style={styles.bookButtonText}>
                          {isFoodTrip ? 'ĐẶT ĐƠN MÓN MỚI' : 'ĐẶT CHUYẾN MỚI (ĐẶT TIẾP)'}
                        </ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryCompletedBtn}
                        onPress={handleGoHome}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="home-outline" size={18} color="#00B5B8" style={{ marginRight: 6 }} />
                        <ThemedText style={styles.secondaryCompletedBtnText}>VỀ GIAO DIỆN CHÍNH</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </>

                ) : activeTrip.status === TRIP_STATUS.CANCELLED || activeTrip.status === TRIP_STATUS.NO_DRIVER_FOUND ? (
                  <>
                    <View style={{
                      backgroundColor: activeTrip.status === TRIP_STATUS.CANCELLED ? '#FEF2F2' : '#FFFBEB',
                      borderColor: activeTrip.status === TRIP_STATUS.CANCELLED ? '#FCA5A5' : '#FCD34D',
                      borderWidth: 1,
                      borderRadius: 14,
                      padding: 14,
                      marginBottom: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}>
                      <Ionicons
                        name={activeTrip.status === TRIP_STATUS.CANCELLED ? 'close-circle' : 'alert-circle'}
                        size={28}
                        color={activeTrip.status === TRIP_STATUS.CANCELLED ? '#EF4444' : '#D97706'}
                        style={{ marginRight: 10 }}
                      />
                      <View style={{ flex: 1 }}>
                        <ThemedText style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: activeTrip.status === TRIP_STATUS.CANCELLED ? '#991B1B' : '#92400E',
                        }}>
                          {activeTrip.status === TRIP_STATUS.CANCELLED
                            ? 'Chuyến đi đã bị hủy'
                            : 'Chưa tìm thấy tài xế phù hợp'}
                        </ThemedText>
                        <ThemedText style={{
                          fontSize: 13,
                          color: activeTrip.status === TRIP_STATUS.CANCELLED ? '#B91C1C' : '#B45309',
                          marginTop: 2,
                        }}>
                          {activeTrip.status === TRIP_STATUS.CANCELLED
                            ? 'Chuyến đi này đã được hủy. Bạn có thể đặt lại chuyến mới hoặc quay về trang chủ.'
                            : 'Khu vực hiện chưa có tài xế phản hồi sau 3 vòng quét. Bạn có thể thử tìm lại ngay.'}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.completedActionsContainer}>
                      <TouchableOpacity
                        style={[styles.bookButton, styles.primaryCompletedBtn]}
                        onPress={handleBookNewTrip}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="refresh-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <ThemedText style={styles.bookButtonText}>TÌM CHUYẾN KHÁC</ThemedText>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.secondaryCompletedBtn}
                        onPress={handleGoHome}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="home-outline" size={18} color="#00B5B8" style={{ marginRight: 6 }} />
                        <ThemedText style={styles.secondaryCompletedBtnText}>VỀ GIAO DIỆN CHÍNH</ThemedText>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : null}
              </ScrollView>
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <>

          {/* TRƯỜNG HỢP 2: FORM ĐIỀU HƯỚNG & ĐẶT CHUYẾN XE (CHƯA ĐẶT)   */}
          {/* ========================================================= */}
          
              

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
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Pressable
                            style={[styles.mapSelectBtn, { marginRight: 4 }]}
                            onPress={async () => {
                              try {
                                setIsLocatingUser(true);
                                const { status } = await Location.requestForegroundPermissionsAsync();
                                if (status === 'granted') {
                                  const loc = await Location.getCurrentPositionAsync({
                                    accuracy: Location.Accuracy.Balanced,
                                  });
                                  const { latitude, longitude } = loc.coords;
                                  setPickUpCoords({ latitude, longitude });
                                  const addr = await reverseGeocodeCoords(latitude, longitude);
                                  if (addr) setPickUpAddress(addr);
                                } else {
                                  Alert.alert('Quyền vị trí', 'Vui lòng cấp quyền truy cập vị trí trong cài đặt thiết bị.');
                                }
                              } catch (e) {
                                Alert.alert('Lỗi GPS', 'Không thể lấy vị trí hiện tại của thiết bị.');
                              } finally {
                                setIsLocatingUser(false);
                              }
                            }}
                            hitSlop={6}
                          >
                            {isLocatingUser ? (
                              <ActivityIndicator size="small" color="#00B5B8" />
                            ) : (
                              <Ionicons name="locate" size={20} color="#00B5B8" />
                            )}
                          </Pressable>
                          <Pressable style={styles.mapSelectBtn} onPress={() => openMapFor('pickup')}>
                            <Ionicons name="map-outline" size={20} color="#00B5B8" />
                          </Pressable>
                        </View>
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

                {/* Gợi ý điểm đến phổ biến dạng danh sách dọc kèm khoảng cách */}
                {bookingStep === 1 && (
                  <View style={styles.quickLocationsBox}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="sparkles" size={15} color="#00B5B8" style={{ marginRight: 5 }} />
                      <ThemedText style={styles.quickLocTitle}>Địa điểm phổ biến quanh bạn:</ThemedText>
                    </View>

                    <View style={styles.quickVerticalList}>
                      {SUGGESTED_LOCATIONS.map((loc) => {
                        const dist = calculateDistanceKm(
                          pickUpCoords.latitude,
                          pickUpCoords.longitude,
                          loc.latitude,
                          loc.longitude
                        );

                        return (
                          <Pressable
                            key={loc.id}
                            style={styles.quickVerticalItem}
                            onPress={() => {
                              setDestinationAddress(loc.address);
                              setDestinationCoords({ latitude: loc.latitude, longitude: loc.longitude });
                            }}
                          >
                            <View style={styles.quickItemLeft}>
                              <View style={styles.quickItemIconBox}>
                                <Ionicons name="location" size={18} color="#00B5B8" />
                              </View>
                              <View style={{ flex: 1 }}>
                                <ThemedText style={styles.quickItemName}>{loc.title}</ThemedText>
                                <ThemedText style={styles.quickItemAddress} numberOfLines={1}>
                                  {loc.address}
                                </ThemedText>
                              </View>
                            </View>

                            <View style={styles.quickDistanceBadge}>
                              <Ionicons name="navigate" size={12} color="#2563EB" />
                              <ThemedText style={styles.quickDistanceText}>~{dist} km</ThemedText>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
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
                      <ThemedText style={styles.fareBreakdownValue}>{displayDistanceKm} km</ThemedText>
                    </View>

                    <View style={[styles.fareBreakdownRow, { marginBottom: 0 }]}>
                      <ThemedText style={styles.fareBreakdownLabel}>Đơn giá cước tiếp theo:</ThemedText>
                      <ThemedText style={styles.fareBreakdownValue}>
                        {Number(selectedVehicle === VEHICLE_TYPE.CAR ? CAR_PER_KM : BIKE_PER_KM).toLocaleString('vi-VN')} đ/km
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
        )}

        {/* Nút Tiếp tục cố định ở đáy màn hình (CHỈ HIỂN THỊ KHI CHƯA CÓ CHUYẾN ĐI) */}
        {!activeTrip && (
        <View style={[styles.bottomFixedBar, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
          <Pressable
            style={styles.fixedContinueBtn}
            onPress={() => {
              if (!pickUpAddress.trim() || !destinationAddress.trim()) {
                Alert.alert('Chưa đầy đủ thông tin', 'Vui lòng nhập đầy đủ Điểm đón và Điểm đến trước khi tiếp tục.');
                return;
              }
              router.push({
                pathname: '/trip-confirm',
                params: {
                  pickUpAddress: pickUpAddress.trim(),
                  destinationAddress: destinationAddress.trim(),
                  pickUpLat: pickUpCoords.latitude,
                  pickUpLon: pickUpCoords.longitude,
                  destLat: destinationCoords.latitude,
                  destLon: destinationCoords.longitude,
                  distanceKm: displayDistanceKm || 2.5,
                  durationMin: precalculatedDurationMin || null,
                  routeCoords: precalculatedRouteCoords?.length > 0 ? JSON.stringify(precalculatedRouteCoords) : null,
                },
              });
            }}
          >
            <ThemedText style={styles.fixedContinueBtnText}>TIẾP TỤC (XEM BẢN ĐỒ & GIÁ XE) ➜</ThemedText>
          </Pressable>
        </View>
        )}
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

      {/* Modal hiển thị mã VietQR tài xế khi khách nhấn xem trong suốt chuyến đi */}
      <Modal
        visible={showQrModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQrModal(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={styles.qrModalCard}>
            <Pressable
              style={styles.qrModalCloseBtn}
              onPress={() => setShowQrModal(false)}
            >
              <Ionicons name="close" size={20} color="#64748B" />
            </Pressable>

            <ThemedText style={{ fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 2 }}>
              Thanh toán VietQR 24/7
            </ThemedText>
            <ThemedText style={{ fontSize: 12, color: '#64748B', marginBottom: 12, textAlign: 'center' }}>
              Quét mã để chuyển khoản trực tiếp cho tài xế {driverQrInfo.driverName}
            </ThemedText>

            <Image
              source={{ uri: driverQrInfo.qrUrl }}
              style={styles.qrImage}
              resizeMode="contain"
            />

            {/* Bảng thông tin tài khoản */}
            <View style={styles.bankDetailTable}>
              <View style={styles.bankDetailRow}>
                <ThemedText style={styles.bankDetailLabel}>Ngân hàng</ThemedText>
                <ThemedText style={styles.bankDetailValue}>{driverQrInfo.bankName}</ThemedText>
              </View>
              <View style={styles.bankDetailRow}>
                <ThemedText style={styles.bankDetailLabel}>Số tài khoản</ThemedText>
                <View style={styles.bankDetailValueRow}>
                  <ThemedText style={[styles.bankDetailValue, { color: '#0284C7' }]}>{driverQrInfo.bankAccountNumber}</ThemedText>
                  <Pressable
                    style={styles.copyBadgeBtn}
                    onPress={() => copyToClipboard(driverQrInfo.bankAccountNumber, 'Số tài khoản')}
                  >
                    <Ionicons name="copy-outline" size={12} color="#0284C7" />
                    <ThemedText style={styles.copyBadgeText}>Copy</ThemedText>
                  </Pressable>
                </View>
              </View>
              <View style={styles.bankDetailRow}>
                <ThemedText style={styles.bankDetailLabel}>Chủ tài khoản</ThemedText>
                <ThemedText style={styles.bankDetailValue}>{driverQrInfo.bankAccountName}</ThemedText>
              </View>
              <View style={styles.bankDetailRow}>
                <ThemedText style={styles.bankDetailLabel}>Số tiền</ThemedText>
                <View style={styles.bankDetailValueRow}>
                  <ThemedText style={[styles.bankDetailValue, { color: '#EF4444', fontWeight: '800' }]}>
                    {Number(driverQrInfo.amount).toLocaleString('vi-VN')} đ
                  </ThemedText>
                  <Pressable
                    style={styles.copyBadgeBtn}
                    onPress={() => copyToClipboard(driverQrInfo.amount, 'Số tiền')}
                  >
                    <Ionicons name="copy-outline" size={12} color="#0284C7" />
                    <ThemedText style={styles.copyBadgeText}>Copy</ThemedText>
                  </Pressable>
                </View>
              </View>
              <View style={[styles.bankDetailRow, styles.bankDetailContentRow, { borderBottomWidth: 0 }]}>
                <View style={styles.bankDetailContentHeader}>
                  <ThemedText style={styles.bankDetailLabel}>Nội dung chuyển khoản</ThemedText>
                  <Pressable
                    style={styles.copyBadgeBtn}
                    onPress={() => copyToClipboard(driverQrInfo.transferContent, 'Nội dung chuyển khoản')}
                  >
                    <Ionicons name="copy-outline" size={12} color="#0284C7" />
                    <ThemedText style={styles.copyBadgeText}>Copy</ThemedText>
                  </Pressable>
                </View>
                <View style={styles.transferContentBox}>
                  <ThemedText style={styles.transferContentText} selectable={true}>
                    {driverQrInfo.transferContent}
                  </ThemedText>
                </View>
              </View>
            </View>

            <Pressable
              style={[styles.bookButton, { width: '100%', marginTop: 16, paddingVertical: 12 }]}
              onPress={() => setShowQrModal(false)}
            >
              <ThemedText style={styles.bookButtonText}>ĐÃ HIỂU & ĐÓNG</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal đánh giá tài xế hoặc nhà hàng */}
      <RatingModal
        visible={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        onSuccess={() => {
          if (ratingTarget === 'DRIVER') {
            setHasRatedTrip(true);
          } else {
            setHasRatedRestaurant(true);
          }
          setShowRatingModal(false);
        }}
        targetType={ratingTarget}
        tripId={activeTrip?.id}
        driverId={activeTrip?.driverId}
        orderId={activeTrip?.id}
        restaurantId={activeTrip?.restaurantId || params.restaurantId}
        title={ratingTarget === 'RESTAURANT' ? 'Đánh giá nhà hàng & món ăn' : 'Đánh giá tài xế giao món'}
      />
    </ThemedView>
  );
}
