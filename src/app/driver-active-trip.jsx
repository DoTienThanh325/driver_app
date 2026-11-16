import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StatusBar } from 'expo-status-bar';
import { tripService, TRIP_STATUS } from '@/services/trip.service';
import { paymentService, PAYMENT_METHOD, PAYMENT_STATUS } from '@/services/payment.service';
import { driverTripStyles as styles } from '@/styles/screens/driver-active-trip.styles';

export default function DriverActiveTripScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const tripId = params.tripId;

  const [trip, setTrip] = useState(() => {
    try {
      if (params.tripData) {
        return JSON.parse(params.tripData);
      }
    } catch {
      // Bỏ qua lỗi parse
    }
    return {
      id: tripId || 'TRIP-DEMO',
      status: TRIP_STATUS.DRIVER_ASSIGNED,
      pickUpAddress: params.pickUpAddress || 'Hồ Hoàn Kiếm, Hoàn Kiếm, Hà Nội',
      pickUpLatitude: Number(params.pickUpLatitude || params.pickUpLat) || 21.028511,
      pickUpLongitude: Number(params.pickUpLongitude || params.pickUpLon) || 105.854444,
      destinationAddress: params.destinationAddress || 'Đại học Bách Khoa, Hai Bà Trưng, Hà Nội',
      destinationLatitude: Number(params.destinationLatitude || params.destLat) || 21.00705,
      destinationLongitude: Number(params.destinationLongitude || params.destLon) || 105.84318,
      shippFare: Number(params.shippFare) || 24000,
      vehicleType: params.vehicleType || 'MOTORBIKE',
      customerName: params.customerName || 'Nguyễn Văn An',
      customerPhone: params.customerPhone || '0988123456',
      customerRating: '4.9',
      distanceKm: params.distanceKm || '2.5',
    };
  });

  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Trạng thái modal và thông tin thanh toán khi tài xế bấm hoàn thành cuốc
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [selectedPayMethod, setSelectedPayMethod] = useState(PAYMENT_METHOD.PAY_DIRECTLY);
  const [qrLoadError, setQrLoadError] = useState(false);
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);

  // Vị trí GPS hiện tại của tài xế
  const [driverLocation, setDriverLocation] = useState({
    latitude: trip.pickUpLatitude ? trip.pickUpLatitude + 0.005 : 21.0335,
    longitude: trip.pickUpLongitude ? trip.pickUpLongitude - 0.004 : 105.8504,
  });
  const driverLocationRef = useRef(driverLocation);
  driverLocationRef.current = driverLocation;

  // Tuyến đường thực tế & khoảng cách từ OSRM
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [navDistanceKm, setNavDistanceKm] = useState(trip.distanceKm || 2.5);
  const [navDurationMin, setNavDurationMin] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);

  // Theo dõi GPS thực tế của tài xế theo thời gian thực và cập nhật Redis liên tục
  useEffect(() => {
    let watcher = null;
    let heartbeatInterval = null;
    let isMounted = true;

    async function startDriverTracking() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (isMounted && loc?.coords) {
            const { latitude, longitude, heading, speed } = loc.coords;
            setDriverLocation({
              latitude,
              longitude,
            });
            // Cập nhật vị trí ngay lập tức vào Redis
            tripService.updateLocation(latitude, longitude, heading || 0, speed || 0);
          }

          watcher = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              distanceInterval: 10, // Cập nhật sau mỗi 10 mét
              timeInterval: 4000,    // Hoặc mỗi 4 giây
            },
            (updatedLoc) => {
              if (isMounted && updatedLoc?.coords) {
                const { latitude, longitude, heading, speed } = updatedLoc.coords;
                setDriverLocation({
                  latitude,
                  longitude,
                });
                // Cập nhật tọa độ thời gian thực lên Redis
                tripService.updateLocation(latitude, longitude, heading || 0, speed || 0);
              }
            }
          );
        }
      } catch (err) {
        console.warn('Lỗi tracking GPS tài xế:', err);
      }
    }

    startDriverTracking();

    // Heartbeat định kỳ mỗi 5s duy trì vị trí tài xế trong Redis trong suốt chuyến xe
    heartbeatInterval = setInterval(() => {
      const cur = driverLocationRef.current;
      if (cur?.latitude && cur?.longitude) {
        tripService.updateLocation(cur.latitude, cur.longitude);
      }
    }, 5000);

    return () => {
      isMounted = false;
      if (watcher) watcher.remove();
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  }, []);

  // Tính tuyến đường OSRM theo giai đoạn:
  // - Khi tài xế đang đi đón (DRIVER_ASSIGNED hoặc DRIVER_ARRIVING): Tuyến = [Tài xế ➜ Điểm đón khách]
  // - Khi khách đã lên xe (IN_PROGRESS): Tuyến = [Điểm đón ➜ Điểm trả khách]
  useEffect(() => {
    let isMounted = true;

    async function fetchDriverRoute() {
      setIsLoadingRoute(true);
      try {
        const isArrivingPickup =
          trip.status === TRIP_STATUS.DRIVER_ASSIGNED ||
          trip.status === TRIP_STATUS.DRIVER_ARRIVING;

        // Điểm đầu và điểm cuối tùy theo trạng thái cuốc xe
        const startLat = isArrivingPickup ? driverLocation.latitude : (trip.pickUpLatitude || 21.028511);
        const startLon = isArrivingPickup ? driverLocation.longitude : (trip.pickUpLongitude || 105.854444);

        const endLat = isArrivingPickup ? (trip.pickUpLatitude || 21.028511) : (trip.destinationLatitude || 21.00705);
        const endLon = isArrivingPickup ? (trip.pickUpLongitude || 105.854444) : (trip.destinationLongitude || 105.84318);

        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson`;

        const res = await fetch(osrmUrl, {
          headers: { 'User-Agent': 'DriverApp-Client/1.0', 'Accept': 'application/json' },
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.routes && data.routes.length > 0) {
            const primary = data.routes[0];
            const distKm = Math.max(0.2, Math.round((primary.distance / 1000) * 10) / 10);
            const durationMin = Math.round(primary.duration / 60);
            const coords = primary.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

            if (isMounted) {
              setNavDistanceKm(distKm);
              setNavDurationMin(durationMin);
              setRouteCoordinates(coords);
              setIsLoadingRoute(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi lấy tuyến OSRM cho tài xế:', err);
      }

      if (isMounted) {
        setIsLoadingRoute(false);
      }
    }

    fetchDriverRoute();

    return () => {
      isMounted = false;
    };
  }, [
    trip.status,
    trip.pickUpLatitude,
    trip.pickUpLongitude,
    trip.destinationLatitude,
    trip.destinationLongitude,
    // Chỉ kích hoạt lại khi tọa độ driver thay đổi đáng kể
    Math.round(driverLocation.latitude * 1000),
    Math.round(driverLocation.longitude * 1000),
  ]);

  // Polling cập nhật trạng thái cuốc từ backend
  useEffect(() => {
    if (!trip?.id || String(trip.id).startsWith('sample') || trip.id === 'TRIP-DEMO') return;

    const interval = setInterval(async () => {
      try {
        const updated = await tripService.getTripById(trip.id);
        if (updated) {
          if (updated.status === TRIP_STATUS.CANCELLED) {
            Alert.alert(
              'Cuốc xe kết thúc',
              'Chuyến đi đã bị khách hủy.',
              [{ text: 'Về trang chủ', onPress: () => router.replace('/(tabs)/driver') }]
            );
          } else if (updated.status === TRIP_STATUS.COMPLETED) {
            // Đã hoàn thành (đã có alert khi bấm nút hoàn thành, tránh hiện lặp 2 lần)
            setTrip((prev) => ({ ...prev, status: TRIP_STATUS.COMPLETED }));
          } else {
            setTrip((prev) => ({ ...prev, ...updated }));
          }
        }
      } catch {
        // Bỏ qua lỗi polling tạm thời
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [trip?.id]);

  // Hành động cập nhật tiến trình chuyến đi
  const handleAdvanceStatus = () => {
    let nextStatus = null;
    let confirmMsg = '';

    if (trip.status === TRIP_STATUS.DRIVER_ASSIGNED) {
      nextStatus = TRIP_STATUS.DRIVER_ARRIVING;
      confirmMsg = 'Xác nhận bạn đã đến điểm đón khách?';
    } else if (trip.status === TRIP_STATUS.DRIVER_ARRIVING) {
      nextStatus = TRIP_STATUS.IN_PROGRESS;
      confirmMsg = 'Khách đã lên xe. Bắt đầu đưa khách đến điểm đến?';
    } else if (trip.status === TRIP_STATUS.IN_PROGRESS) {
      // Khi tài xế bấm đến điểm trả khách (thu tiền), cập nhật ngay sang COMPLETED trên BookingService
      // để phía khách hàng lập tức hiển thị thông tin chuyến đi hoàn tất và yêu cầu trả tiền
      Alert.alert('Đến điểm trả khách', 'Xác nhận bạn đã đưa khách đến nơi an toàn và tiến hành thu cước phí?', [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Thu tiền',
          onPress: async () => {
            setIsUpdatingStatus(true);
            try {
              if (!String(trip.id).startsWith('sample') && trip.id !== 'TRIP-DEMO') {
                await tripService.updateTripStatus(trip.id, TRIP_STATUS.COMPLETED);
              }
              setTrip((prev) => ({ ...prev, status: TRIP_STATUS.COMPLETED }));
              await handleOpenPaymentModal();
            } catch (err) {
              if (err.message?.includes('COMPLETED') || err.message?.includes('kết thúc')) {
                setTrip((prev) => ({ ...prev, status: TRIP_STATUS.COMPLETED }));
                await handleOpenPaymentModal();
              } else {
                Alert.alert('Lỗi cập nhật', err.message || 'Không thể cập nhật trạng thái.');
              }
            } finally {
              setIsUpdatingStatus(false);
            }
          },
        },
      ]);
      return;
    } else if (trip.status === TRIP_STATUS.COMPLETED) {
      handleOpenPaymentModal();
      return;
    }

    if (!nextStatus) return;

    Alert.alert('Xác nhận tiến trình', confirmMsg, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đồng ý',
        onPress: async () => {
          setIsUpdatingStatus(true);
          try {
            if (!String(trip.id).startsWith('sample') && trip.id !== 'TRIP-DEMO') {
              await tripService.updateTripStatus(trip.id, nextStatus);
            }

            if (nextStatus === TRIP_STATUS.COMPLETED) {
              Alert.alert(
                'Hoàn thành cuốc xe 🎉',
                `Đã thu cước phí: ${Number(trip.shippFare || 24000).toLocaleString('vi-VN')} đ. Bạn đã sẵn sàng nhận cuốc xe tiếp theo!`,
                [
                  {
                    text: 'Về trang chủ tài xế',
                    onPress: () => router.replace('/(tabs)/driver'),
                  },
                ]
              );
            } else {
              setTrip((prev) => ({ ...prev, status: nextStatus }));
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

  // Tự động đăng ký STK tài xế & tải trước thông tin thanh toán
  useEffect(() => {
    paymentService
      .registerDriverPaymentInfo({
        bankName: 'MBBank (Quân Đội)',
        bankBin: '970422',
        bankAccountNumber: '0399888999',
        bankAccountName: 'TAI XE DRIVER APP',
      })
      .catch(() => {});

    if (trip?.id && !String(trip.id).startsWith('sample') && trip.id !== 'TRIP-DEMO') {
      paymentService
        .getTripPayment(trip.id)
        .then((pay) => {
          if (pay) {
            setPaymentInfo(pay);
            if (pay.method === PAYMENT_METHOD.PAY_BEFORE) {
              setSelectedPayMethod(PAYMENT_METHOD.PAY_BEFORE);
            }
          }
        })
        .catch(() => {});
    }
  }, [trip?.id]);

  // Mở giao diện xác nhận thu tiền / khách chuyển tiền khi kết thúc cuốc
  const handleOpenPaymentModal = async () => {
    setShowPaymentModal(true);
    setQrLoadError(false);

    let method = PAYMENT_METHOD.PAY_DIRECTLY;
    let saved = null;
    try {
      saved = await paymentService.getPreferredPaymentMethod(trip?.id);
    } catch {}

    if (trip?.id && !String(trip.id).startsWith('sample') && trip.id !== 'TRIP-DEMO') {
      try {
        const pay = await paymentService.getTripPayment(trip.id);
        if (pay) {
          setPaymentInfo(pay);
          // Ưu tiên PAY_BEFORE nếu khách đã chọn trước hoặc backend trả về PAY_BEFORE
          if (pay.method === PAYMENT_METHOD.PAY_BEFORE) {
            method = PAYMENT_METHOD.PAY_BEFORE;
          } else if (saved === PAYMENT_METHOD.PAY_BEFORE) {
            method = PAYMENT_METHOD.PAY_BEFORE;
          } else if (pay.method) {
            method = pay.method;
          }
        } else if (saved) {
          method = saved;
        }
      } catch {
        if (saved) method = saved;
      }
    } else if (saved) {
      method = saved;
    }

    setSelectedPayMethod(method);
  };

  // Tài xế xác nhận đã nhận tiền và kết thúc cuốc xe thành công
  const handleConfirmReceivedPayment = async () => {
    setIsConfirmingPayment(true);
    try {
      // 1. Nếu là chuyển khoản VietQR và có payment id -> gọi xác nhận payment
      if (paymentInfo?.tripPaymentId && selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE) {
        try {
          await paymentService.confirmPayment(paymentInfo.tripPaymentId);
        } catch (e) {
          console.warn('Lỗi confirmPayment backend:', e);
        }
      }

      // 2. Đảm bảo trạng thái chuyến đi đã cập nhật COMPLETED trên Booking Service
      if (trip.status !== TRIP_STATUS.COMPLETED && !String(trip.id).startsWith('sample') && trip.id !== 'TRIP-DEMO') {
        try {
          await tripService.updateTripStatus(trip.id, TRIP_STATUS.COMPLETED);
        } catch (e) {
          // Bỏ qua nếu đã COMPLETED trước đó khi mở bảng thu tiền
        }
      }

      setShowPaymentModal(false);
      setTrip((prev) => ({ ...prev, status: TRIP_STATUS.COMPLETED }));

      Alert.alert(
        'Hoàn tất chuyến xe 🎉',
        `Đã xác nhận nhận tiền thành công!\nTổng tiền: ${Number(
          paymentInfo?.finalAmount || trip.shippFare || 24000
        ).toLocaleString('vi-VN')} đ.\n\nCảm ơn bạn, chúc bạn một ngày làm việc an toàn!`,
        [
          {
            text: 'Về trang chủ tài xế',
            onPress: () => router.replace('/(tabs)/driver'),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Không thể hoàn tất', err.message || 'Lỗi khi cập nhật chuyến đi.');
    } finally {
      setIsConfirmingPayment(false);
    }
  };

  // Mở Google Maps ngoài điều hướng Turn-by-Turn
  const handleOpenExternalNav = () => {
    const isArrivingPickup =
      trip.status === TRIP_STATUS.DRIVER_ASSIGNED ||
      trip.status === TRIP_STATUS.DRIVER_ARRIVING;

    const targetLat = isArrivingPickup ? (trip.pickUpLatitude || 21.028511) : (trip.destinationLatitude || 21.00705);
    const targetLon = isArrivingPickup ? (trip.pickUpLongitude || 105.854444) : (trip.destinationLongitude || 105.84318);
    const label = isArrivingPickup ? 'Diem-Don-Khach' : 'Diem-Tra-Khach';

    const url = `google.navigation:q=${targetLat},${targetLon}&mode=d`;
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${targetLat},${targetLon}`;

    Linking.canOpenURL(url).then((supported) => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Linking.openURL(webUrl);
      }
    });
  };

  const handleCallCustomer = () => {
    const phone = trip.customerPhone || '0988123456';
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Thông tin liên hệ', `Số điện thoại khách hàng: ${phone}`);
    });
  };

  const handleMessageCustomer = () => {
    const phone = trip.customerPhone || '0988123456';
    Linking.openURL(`sms:${phone}`).catch(() => {
      Alert.alert('Nhắn tin', `Gửi tin nhắn tới khách qua số: ${phone}`);
    });
  };

  const getStatusText = () => {
    switch (trip.status) {
      case TRIP_STATUS.DRIVER_ASSIGNED:
        return 'Đang đến điểm đón';
      case TRIP_STATUS.DRIVER_ARRIVING:
        return 'Đã đến điểm đón';
      case TRIP_STATUS.IN_PROGRESS:
        return 'Đang chở khách';
      case TRIP_STATUS.COMPLETED:
        return 'Đã hoàn thành';
      default:
        return 'Đang hoạt động';
    }
  };

  const getButtonActionLabel = () => {
    switch (trip.status) {
      case TRIP_STATUS.DRIVER_ASSIGNED:
        return '1. TÔI ĐÃ ĐẾN ĐIỂM ĐÓN';
      case TRIP_STATUS.DRIVER_ARRIVING:
        return '2. BẮT ĐẦU CHUYẾN ĐI';
      case TRIP_STATUS.IN_PROGRESS:
        return '3. ĐÃ ĐẾN ĐIỂM TRẢ KHÁCH (THU TIỀN)';
      case TRIP_STATUS.COMPLETED:
        return 'MỞ LẠI BẢNG THU TIỀN';
      default:
        return 'CẬP NHẬT TRẠNG THÁI';
    }
  };

  // HTML bản đồ Leaflet điều hướng thời gian thực cho tài xế
  const mapHtml = useMemo(() => {
    const pLat = trip.pickUpLatitude || 21.028511;
    const pLon = trip.pickUpLongitude || 105.854444;
    const dLat = trip.destinationLatitude || 21.00705;
    const dLon = trip.destinationLongitude || 105.84318;
    const drvLat = driverLocation.latitude;
    const drvLon = driverLocation.longitude;

    const coordsJson = JSON.stringify(
      routeCoordinates.length > 0
        ? routeCoordinates
        : [
            [drvLat, drvLon],
            [pLat, pLon],
          ]
    );

    const isVehicleCar = trip.vehicleType === 'CAR';
    const vehicleIconSvg = isVehicleCar
      ? `<svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>`
      : `<svg width="22" height="22" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm7-10l-1.9 3.2c-.3.5-.8.8-1.4.8H8v2h2.3l2.6-4.3 1.9 1.9V18h2v-4.5l-2.4-2.4 1.4-2.3c.7 1.1 1.9 1.7 3.2 1.7V9c-1 0-1.9-.5-2.5-1.3l-1-1.6c-.4-.6-1-1.1-1.8-1.1H9v2h3.2l-.2.5zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/></svg>`;

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
          body, html, #map { height: 100%; width: 100%; overflow: hidden; background: #e5e7eb; }
          .driver-pin {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #2563EB;
            box-shadow: 0 4px 10px rgba(37, 99, 235, 0.45);
            border: 2.5px solid #FFFFFF;
          }
          .pickup-pin {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #00B5B8;
            color: #FFFFFF;
            font-weight: 800;
            font-size: 11px;
            font-family: sans-serif;
            border: 2px solid #FFFFFF;
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
          }
          .dest-pin {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            background: #F97316;
            color: #FFFFFF;
            font-weight: 800;
            font-size: 11px;
            font-family: sans-serif;
            border: 2px solid #FFFFFF;
            box-shadow: 0 3px 8px rgba(0,0,0,0.3);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${drvLat}, ${drvLon}], 15);
          
          L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 19,
            subdomains: ['0', '1', '2', '3']
          }).addTo(map);

          // 1. Icon Tài xế (Đang di chuyển - Xanh dương)
          var driverIcon = L.divIcon({
            className: 'driver-pin',
            html: '<div style="width:36px; height:36px; border-radius:18px; display:flex; align-items:center; justify-content:center;">${vehicleIconSvg}</div>',
            iconSize: [36, 36],
            iconAnchor: [18, 18]
          });
          var driverMarker = L.marker([${drvLat}, ${drvLon}], { icon: driverIcon, zIndexOffset: 1000 }).addTo(map);

          // 2. Icon Điểm đón khách (Xanh ngọc T&M)
          var pickupIcon = L.divIcon({
            className: 'pickup-pin',
            html: '<div style="width:30px; height:30px; border-radius:15px; display:flex; align-items:center; justify-content:center;">Đón</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });
          var pickupMarker = L.marker([${pLat}, ${pLon}], { icon: pickupIcon }).addTo(map);

          // 3. Icon Điểm trả khách (Cam)
          var destIcon = L.divIcon({
            className: 'dest-pin',
            html: '<div style="width:30px; height:30px; border-radius:15px; display:flex; align-items:center; justify-content:center;">Đến</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });
          var destMarker = L.marker([${dLat}, ${dLon}], { icon: destIcon }).addTo(map);

          // 4. Tuyến đường thực tế bám sát mặt đường
          var routeCoords = ${coordsJson};

          L.polyline(routeCoords, {
            color: '#1E40AF',
            weight: 7,
            opacity: 0.5,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(map);

          var activeLine = L.polyline(routeCoords, {
            color: '#3B82F6',
            weight: 5,
            opacity: 0.95,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(map);

          // Tự động căn chỉnh bao quát tài xế và điểm cần đến
          map.fitBounds(activeLine.getBounds(), { padding: [50, 50] });
        </script>
      </body>
      </html>
    `;
  }, [
    trip.pickUpLatitude,
    trip.pickUpLongitude,
    trip.destinationLatitude,
    trip.destinationLongitude,
    trip.vehicleType,
    driverLocation.latitude,
    driverLocation.longitude,
    routeCoordinates,
  ]);

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="dark" />
      {/* 1. NỬA TRÊN: BẢN ĐỒ THỰC TẾ ĐIỀU HƯỚNG TÀI XẾ & KHÁCH */}
      <View style={styles.mapContainer}>
        <WebView
          key={`driver-webview-${routeCoordinates.length}`}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.mapWebView}
          scrollEnabled={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />

        {/* Thanh Header nổi trên bản đồ */}
        <SafeAreaView style={styles.headerFloatingBar} edges={['top']}>
          <Pressable
            style={styles.headerBackBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/(tabs)/driver');
              }
            }}
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>

          <View style={styles.navRouteBadge}>
            {isLoadingRoute ? (
              <ActivityIndicator size="small" color="#00B5B8" style={{ marginRight: 4 }} />
            ) : (
              <Ionicons name="navigate" size={16} color="#00B5B8" />
            )}
            <ThemedText style={styles.navRouteText}>
              {isLoadingRoute
                ? 'Đang tính lộ trình...'
                : `${navDistanceKm} km${navDurationMin ? ` • ~${navDurationMin} phút` : ''}`}
            </ThemedText>
          </View>

          <View style={styles.statusFloatingBadge}>
            <ThemedText style={styles.statusFloatingText}>{getStatusText()}</ThemedText>
          </View>
        </SafeAreaView>
      </View>

      {/* 2. NỬA DƯỚI: THÔNG TIN KHÁCH HÀNG & LỘ TRÌNH & NÚT TIẾN TRÌNH */}
      <View style={styles.bottomSheetContainer}>
        <View style={styles.dragHandle} />

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Thẻ khách hàng */}
          <View style={styles.customerCard}>
            <View style={styles.customerTopRow}>
              <View style={styles.customerAvatar}>
                <ThemedText style={styles.customerAvatarText}>
                  {(trip.customerName || 'K').charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={styles.customerInfo}>
                <ThemedText style={styles.customerName}>{trip.customerName || 'Nguyễn Văn An'}</ThemedText>
                <View style={styles.customerRatingRow}>
                  <Ionicons name="star" size={14} color="#FBBF24" />
                  <ThemedText style={styles.customerRatingText}>
                    {trip.customerRating || '4.9'} • Khách hàng thân thiết
                  </ThemedText>
                </View>
              </View>

              {/* Nút mở chỉ đường Google Maps ngoài */}
              <Pressable
                style={{
                  backgroundColor: '#EFF6FF',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={handleOpenExternalNav}
              >
                <Ionicons name="compass" size={16} color="#2563EB" />
                <ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#2563EB', marginLeft: 3 }}>
                  Chỉ đường
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.customerActions}>
              <Pressable style={styles.actionBtnCall} onPress={handleCallCustomer}>
                <Ionicons name="call" size={16} color="#059669" />
                <ThemedText style={styles.actionTextCall}>Gọi cho khách</ThemedText>
              </Pressable>
              <Pressable style={styles.actionBtnMsg} onPress={handleMessageCustomer}>
                <Ionicons name="chatbubble-ellipses" size={16} color="#2563EB" />
                <ThemedText style={styles.actionTextMsg}>Nhắn tin</ThemedText>
              </Pressable>
            </View>
          </View>

          {/* Thẻ lộ trình di chuyển */}
          <View style={styles.routeCard}>
            <ThemedText style={styles.sectionTitle}>Lộ trình cuốc xe</ThemedText>

            <View style={styles.routeRow}>
              <View style={styles.routeDotCol}>
                <Ionicons name="radio-button-on" size={16} color="#00B5B8" />
                <View style={styles.routeLine} />
              </View>
              <View style={styles.routeTextCol}>
                <ThemedText style={styles.routeLabel}>Điểm đón khách</ThemedText>
                <ThemedText style={styles.routeAddress} numberOfLines={2}>
                  {trip.pickUpAddress}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.routeRow, { marginTop: 2 }]}>
              <View style={styles.routeDotCol}>
                <Ionicons name="radio-button-on" size={16} color="#F97316" />
              </View>
              <View style={styles.routeTextCol}>
                <ThemedText style={styles.routeLabel}>Điểm trả khách</ThemedText>
                <ThemedText style={styles.routeAddress} numberOfLines={2}>
                  {trip.destinationAddress}
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Thẻ cước phí */}
          <View style={styles.detailCard}>
            <View style={styles.fareHighlightRow}>
              <ThemedText style={styles.fareLabel}>Tiền cước thu khách</ThemedText>
              <ThemedText style={styles.fareAmount}>
                {Number(trip.shippFare || 24000).toLocaleString('vi-VN')} đ
              </ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailItemLabel}>Khoảng cách chuyến đi:</ThemedText>
              <ThemedText style={styles.detailItemValue}>{trip.distanceKm || navDistanceKm} km</ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailItemLabel}>Phương tiện:</ThemedText>
              <ThemedText style={styles.detailItemValue}>
                {trip.vehicleType === 'CAR' ? '🚗 Ô tô (Car)' : '🛵 Xe máy (Motorbike)'}
              </ThemedText>
            </View>

            <View style={[styles.detailRow, { marginBottom: 0 }]}>
              <ThemedText style={styles.detailItemLabel}>Thanh toán:</ThemedText>
              <ThemedText
                style={[
                  styles.detailItemValue,
                  {
                    color: trip.status === TRIP_STATUS.COMPLETED || paymentInfo?.status === 'COMPLETED' ? '#10B981' : '#EF4444',
                    fontWeight: '700',
                  },
                ]}
              >
                {trip.status === TRIP_STATUS.COMPLETED || paymentInfo?.status === 'COMPLETED' ? 'Đã thanh toán' : 'Chưa thanh toán'}
              </ThemedText>
            </View>
          </View>
        </ScrollView>

        {/* Nút hành động trạng thái cuốc */}
        <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
          <Pressable
            style={styles.actionStepBtn}
            onPress={handleAdvanceStatus}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.actionStepBtnText}>{getButtonActionLabel()}</ThemedText>
            )}
          </Pressable>
        </View>
      </View>

      {/* ======================================================== */}
      {/* MODAL XÁC NHẬN KHÁCH ĐÃ CHUYỂN TIỀN / TRẢ CƯỚC CHO TÀI XẾ */}
      {/* ======================================================== */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom + 16, 36) }]}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeaderBox}>
                <View style={styles.modalSuccessIconCircle}>
                  <Ionicons name="cash" size={32} color="#00B5B8" />
                </View>
                <ThemedText style={styles.modalTitle}>Xác nhận thu tiền cước</ThemedText>
                <ThemedText style={styles.modalSubtitle}>
                  Vui lòng kiểm tra và xác nhận hành khách đã hoàn tất trả cước trước khi hoàn tất cuốc xe.
                </ThemedText>
              </View>

              {/* Nếu ĐÃ thanh toán: chỉ hiện thông báo đã hoàn tất */}
              {trip.status === TRIP_STATUS.COMPLETED || paymentInfo?.status === 'COMPLETED' ? (
                <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                  <Ionicons name="checkmark-circle" size={56} color="#10B981" />
                  <ThemedText style={{ fontSize: 18, fontWeight: '800', color: '#065F46', marginTop: 12 }}>
                    Đã thanh toán hoàn tất
                  </ThemedText>
                  <ThemedText style={{ fontSize: 13, color: '#047857', marginTop: 4, textAlign: 'center' }}>
                    Chuyến đi này đã được ghi nhận thanh toán thành công.
                  </ThemedText>
                  <Pressable
                    style={[styles.modalConfirmBtn, { width: '100%', marginTop: 24 }]}
                    onPress={() => router.replace('/(tabs)/driver')}
                  >
                    <ThemedText style={styles.modalConfirmBtnText}>VỀ TRANG CHỦ TÀI XẾ</ThemedText>
                  </Pressable>
                </View>
              ) : (
                <>
                  {/* Phiếu chi tiết cước phí (NẾU CHƯA THANH TOÁN MỚI HIỆN PHƯƠNG THỨC & SỐ TIỀN) */}
                  <View style={styles.fareReceiptBox}>
                    <View style={styles.fareReceiptHeader}>
                      <ThemedText style={styles.fareReceiptTitle}>Tổng tiền cước cần thu</ThemedText>
                      <ThemedText style={styles.fareReceiptAmount}>
                        {Number(paymentInfo?.finalAmount || trip.shippFare || 24000).toLocaleString('vi-VN')} đ
                      </ThemedText>
                    </View>

                    <View style={styles.receiptInfoRow}>
                      <ThemedText style={styles.receiptLabel}>Hành khách:</ThemedText>
                      <ThemedText style={styles.receiptValue}>{trip.customerName || 'Khách hàng T&M'}</ThemedText>
                    </View>

                    <View style={styles.receiptInfoRow}>
                      <ThemedText style={styles.receiptLabel}>Số điện thoại:</ThemedText>
                      <ThemedText style={styles.receiptValue}>{trip.customerPhone || '0988123456'}</ThemedText>
                    </View>

                    <View style={[styles.receiptInfoRow, { marginBottom: 0 }]}>
                      <ThemedText style={styles.receiptLabel}>Phương thức:</ThemedText>
                      <ThemedText
                        style={[
                          styles.receiptValue,
                          { color: selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE ? '#0284C7' : '#059669', fontWeight: '800' },
                        ]}
                      >
                        {selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE
                          ? '💳 Chuyển khoản VietQR'
                          : '💵 Thu tiền mặt trực tiếp'}
                      </ThemedText>
                    </View>
                  </View>

                  {/* THÔNG TIN THANH TOÁN CHI TIẾT THEO PHƯƠNG THỨC KHÁCH ĐÃ CHỌN (TÀI XẾ KHÔNG ĐƯỢC ĐỔI) */}
                  <View style={{ marginTop: 12 }}>
                    {selectedPayMethod === PAYMENT_METHOD.PAY_BEFORE ? (
                      <View style={{ alignItems: 'center', padding: 16, backgroundColor: '#F0F9FF', borderRadius: 16, borderWidth: 1.5, borderColor: '#BAE6FD', marginBottom: 14 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                          <Ionicons name="phone-portrait-outline" size={20} color="#0284C7" style={{ marginRight: 6 }} />
                          <ThemedText style={{ fontSize: 13, fontWeight: '800', color: '#0369A1' }}>
                            ĐƯA MÀN HÌNH NÀY CHO KHÁCH QUÉT MÃ
                          </ThemedText>
                        </View>

                        {/* KHUNG MÃ QR KÈM IMAGEHOLDER NẾU CHƯA LOAD ĐƯỢC */}
                        <View style={{ width: 210, height: 210, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#CBD5E1', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
                          {qrLoadError ? (
                            /* Imageholder dự phòng */
                            <View style={{ alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                              <Ionicons name="qr-code" size={96} color="#00B5B8" />
                              <ThemedText style={{ fontSize: 12, color: '#64748B', fontWeight: '700', marginTop: 8, textAlign: 'center' }}>
                                Mã VietQR 24/7
                              </ThemedText>
                            </View>
                          ) : (
                            <Image
                              source={{
                                uri:
                                  paymentInfo?.qrInfo?.qrDataURL ||
                                  `https://img.vietqr.io/image/970422-0399888999-compact2.png?amount=${
                                    paymentInfo?.finalAmount || trip.shippFare || 24000
                                  }&addInfo=THANH+TOAN+${trip.id}&accountName=TAI+XE+DRIVER+APP`,
                              }}
                              style={{ width: '100%', height: '100%' }}
                              resizeMode="contain"
                              onError={() => setQrLoadError(true)}
                            />
                          )}
                        </View>

                        <ThemedText style={{ fontSize: 14, fontWeight: '800', color: '#0284C7', marginTop: 12 }}>
                          {paymentInfo?.qrInfo?.bankName || 'Ngân hàng Quân Đội (MB Bank)'}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 13, color: '#334155', fontWeight: '600', marginTop: 2 }}>
                          STK: {paymentInfo?.qrInfo?.bankAccountNumber || '0399888999'} • {paymentInfo?.qrInfo?.bankAccountName || 'TAI XE DRIVER APP'}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 16, fontWeight: '900', color: '#0F172A', marginTop: 6 }}>
                          Số tiền: {Number(trip.shippFare || 24000).toLocaleString('vi-VN')} đ
                        </ThemedText>
                        <ThemedText style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                          Nội dung: THANH TOAN {trip.id}
                        </ThemedText>
                      </View>
                    ) : (
                      <View style={[styles.paymentMethodCard, styles.cashMethodBg, { marginBottom: 14 }]}>
                        <View style={[styles.paymentMethodIconBox, { backgroundColor: '#DCFCE7' }]}>
                          <Ionicons name="cash-outline" size={24} color="#16A34A" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={[styles.paymentMethodTitle, { color: '#15803D' }]}>
                            Khách trả tiền mặt trực tiếp
                          </ThemedText>
                          <ThemedText style={styles.paymentMethodDesc}>
                            Vui lòng thu đúng {Number(trip.shippFare || 24000).toLocaleString('vi-VN')} đ tiền mặt từ khách hàng trước khi bấm xác nhận.
                          </ThemedText>
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Nút bấm Tài xế xác nhận */}
                  <Pressable
                    style={styles.modalConfirmBtn}
                    onPress={handleConfirmReceivedPayment}
                    disabled={isConfirmingPayment}
                  >
                    {isConfirmingPayment ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <ThemedText style={styles.modalConfirmBtnText}>XÁC NHẬN ĐÃ NHẬN TIỀN & KẾT THÚC</ThemedText>
                      </>
                    )}
                  </Pressable>

                  <Pressable
                    style={styles.modalSecondaryBtn}
                    onPress={() => setShowPaymentModal(false)}
                    disabled={isConfirmingPayment}
                  >
                    <ThemedText style={styles.modalSecondaryBtnText}>Quay lại (Khách chưa trả tiền)</ThemedText>
                  </Pressable>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}
