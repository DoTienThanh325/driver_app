import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StatusBar } from 'expo-status-bar';
import { tripService, VEHICLE_TYPE } from '@/services/trip.service';
import { paymentService } from '@/services/payment.service';
import { voucherService } from '@/services/voucher.service';
import { tripConfirmStyles as styles } from '@/styles/screens/trip-confirm.styles';

export default function TripConfirmScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const pickUpAddress = params.pickUpAddress || 'Hồ Hoàn Kiếm, Hoàn Kiếm, Hà Nội';
  const destinationAddress = params.destinationAddress || 'Đại học Bách Khoa, Hai Bà Trưng, Hà Nội';
  const pickUpLat = Number(params.pickUpLat) || 21.028511;
  const pickUpLon = Number(params.pickUpLon) || 105.854444;
  const destLat = Number(params.destLat) || 21.00705;
  const destLon = Number(params.destLon) || 105.84318;
  const initialDistanceKm = Number(params.distanceKm) || 2.5;

  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPE.MOTORBIKE);
  const [preferredPayMethod, setPreferredPayMethod] = useState('PAY_DIRECTLY'); // 'PAY_DIRECTLY' (Tiền mặt) | 'PAY_BEFORE' (VietQR)
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quản lý Voucher ưu đãi chuyến đi
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [isVoucherModalVisible, setIsVoucherModalVisible] = useState(false);
  const [customVoucherCode, setCustomVoucherCode] = useState('');
  const [isLoadingVouchers, setIsLoadingVouchers] = useState(false);

  // Tải danh sách Voucher TRANSIT từ Database và API
  useEffect(() => {
    let isMounted = true;
    async function loadTransitVouchers() {
      setIsLoadingVouchers(true);
      try {
        const [appTransitVouchers, appAllVouchers, myVouchers] = await Promise.all([
          voucherService.getAppVouchers('TRANSIT').catch(() => []),
          voucherService.getAppVouchers(null).catch(() => []),
          voucherService.getMyVouchers().catch(() => []),
        ]);

        const list = [];
        const seen = new Set();

        [...(myVouchers || []), ...(appTransitVouchers || []), ...(appAllVouchers || [])].forEach((v) => {
          if (v && v.id && !seen.has(v.id)) {
            seen.add(v.id);
            list.push(v);
          }
        });

        // Seed fallback nếu DB chưa có hoặc đang offline
        if (list.length === 0) {
          list.push(
            {
              id: 'VOUCHER-TRANSIT-50PCT',
              discount: 50,
              maxDiscount: 30000,
              minValue: 0,
              type: 'TRANSIT',
              providerType: 'APP',
              expiredAt: '2027-12-31T23:59:59',
            },
            {
              id: 'VOUCHER-TRANSIT-10K',
              discount: 10000,
              maxDiscount: 10000,
              minValue: 0,
              type: 'TRANSIT',
              providerType: 'APP',
              expiredAt: '2027-12-31T23:59:59',
            },
            {
              id: 'VOUCHER-TRANSIT-20PCT',
              discount: 20,
              maxDiscount: 25000,
              minValue: 0,
              type: 'TRANSIT',
              providerType: 'APP',
              expiredAt: '2027-12-31T23:59:59',
            },
            {
              id: 'VOUCHER-TRANSIT-15K',
              discount: 15000,
              maxDiscount: 15000,
              minValue: 0,
              type: 'TRANSIT',
              providerType: 'APP',
              expiredAt: '2027-12-31T23:59:59',
            },
            {
              id: 'VOUCHER-TRANSIT-100K-MIN',
              discount: 30000,
              maxDiscount: 30000,
              minValue: 100000,
              type: 'TRANSIT',
              providerType: 'APP',
              expiredAt: '2027-12-31T23:59:59',
            },
            {
              id: 'VOUCHER-FOOD-25K',
              discount: 25000,
              maxDiscount: 25000,
              minValue: 0,
              type: 'FOOD',
              providerType: 'APP',
              expiredAt: '2027-12-31T23:59:59',
            }
          );
        }

        if (isMounted) {
          setVouchers(list);
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách voucher:', err);
      } finally {
        if (isMounted) setIsLoadingVouchers(false);
      }
    }

    loadTransitVouchers();
    return () => { isMounted = false; };
  }, []);

  // Parse tọa độ lộ trình từ params nếu đã được tải trước từ book-trip
  const initialRouteCoords = useMemo(() => {
    if (params.routeCoords) {
      try {
        const parsed = typeof params.routeCoords === 'string' ? JSON.parse(params.routeCoords) : params.routeCoords;
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return [];
  }, [params.routeCoords]);

  // Trạng thái lộ trình thực tế từ OSRM
  const [actualDistanceKm, setActualDistanceKm] = useState(initialDistanceKm);
  const [actualDurationMin, setActualDurationMin] = useState(
    params.durationMin ? Number(params.durationMin) : null
  );
  const [routeCoordinates, setRouteCoordinates] = useState(initialRouteCoords);
  const [isLoadingRoute, setIsLoadingRoute] = useState(initialRouteCoords.length === 0);

  // Tính giờ cao điểm
  const isPeakHour = useMemo(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const totalMinutes = hours * 60 + minutes;
    const isMorningPeak = totalMinutes >= 7 * 60 && totalMinutes <= 9 * 60;
    const isEveningPeak = totalMinutes >= 17 * 60 && totalMinutes <= 19 * 60 + 30;
    return isMorningPeak || isEveningPeak;
  }, []);

  // Biểu phí bậc thang chuẩn thực tế (giống Be / Grab):
  // 🛵 Xe máy: 2km đầu: 14.000đ (thường) / 18.000đ (cao điểm). Mỗi km tiếp theo: 5.000đ (thường) / 7.000đ (cao điểm)
  // 🚗 Ô tô:   2km đầu: 25.000đ (thường) / 32.000đ (cao điểm). Mỗi km tiếp theo: 10.000đ (thường) / 13.000đ (cao điểm)
  const BIKE_BASE_KM = 2.0;
  const BIKE_BASE_PRICE = isPeakHour ? 18000 : 14000;
  const BIKE_PER_KM = isPeakHour ? 7000 : 5000;

  const CAR_BASE_KM = 2.0;
  const CAR_BASE_PRICE = isPeakHour ? 32000 : 25000;
  const CAR_PER_KM = isPeakHour ? 13000 : 10000;

  // Lấy cự ly và đường di chuyển thực tế từ OSRM Routing
  useEffect(() => {
    let isMounted = true;
    async function fetchActualRoute() {
      // Nếu đã có sẵn tọa độ tuyến đường từ params (prefetch ở book-trip), không cần gọi lại OSRM
      if (initialRouteCoords.length > 0) {
        setIsLoadingRoute(false);
        return;
      }

      setIsLoadingRoute(true);
      try {
        // Gọi OSRM public service có fallback
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickUpLon},${pickUpLat};${destLon},${destLat}?overview=full&geometries=geojson`;
        
        const response = await fetch(osrmUrl, {
          headers: {
            'User-Agent': 'DriverApp-Client/1.0',
            'Accept': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data?.routes && data.routes.length > 0) {
            const primaryRoute = data.routes[0];
            // Khoảng cách thực tế tính bằng mét chuyển sang km (làm tròn 1 chữ số thập phân)
            const distKm = Math.max(0.5, Math.round((primaryRoute.distance / 1000) * 10) / 10);
            const durationMin = Math.round(primaryRoute.duration / 60);

            // GeoJSON coordinates là [lon, lat], Leaflet polyline nhận [lat, lon]
            const leafletCoords = primaryRoute.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

            if (isMounted) {
              setActualDistanceKm(distKm);
              setActualDurationMin(durationMin);
              setRouteCoordinates(leafletCoords);
              setIsLoadingRoute(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Lỗi khi lấy tuyến đường OSRM:', err);
      }

      // Fallback nếu mất mạng: dùng tọa độ nối thẳng
      if (isMounted) {
        setRouteCoordinates([
          [pickUpLat, pickUpLon],
          [destLat, destLon],
        ]);
        setIsLoadingRoute(false);
      }
    }

    fetchActualRoute();

    return () => {
      isMounted = false;
    };
  }, [pickUpLat, pickUpLon, destLat, destLon]);

  // Giá xe máy tính theo khoảng cách thực tế bậc thang
  const motorbikeFare = useMemo(() => {
    if (actualDistanceKm <= BIKE_BASE_KM) {
      return BIKE_BASE_PRICE;
    }
    const extraKm = actualDistanceKm - BIKE_BASE_KM;
    const raw = BIKE_BASE_PRICE + extraKm * BIKE_PER_KM;
    return Math.round(raw / 1000) * 1000;
  }, [actualDistanceKm, BIKE_BASE_PRICE, BIKE_PER_KM]);

  // Giá ô tô tính theo khoảng cách thực tế bậc thang
  const carFare = useMemo(() => {
    if (actualDistanceKm <= CAR_BASE_KM) {
      return CAR_BASE_PRICE;
    }
    const extraKm = actualDistanceKm - CAR_BASE_KM;
    const raw = CAR_BASE_PRICE + extraKm * CAR_PER_KM;
    return Math.round(raw / 1000) * 1000;
  }, [actualDistanceKm, CAR_BASE_PRICE, CAR_PER_KM]);

  const selectedFare = vehicleType === VEHICLE_TYPE.MOTORBIKE ? motorbikeFare : carFare;

  // Tính số tiền được giảm theo voucher
  const calculateDiscount = (voucher, fare) => {
    if (!voucher || !fare) return 0;
    const isPercent = Number(voucher.discount) < 100;
    let disc = 0;
    if (isPercent) {
      disc = Math.round((fare * Number(voucher.discount)) / 100);
      if (voucher.maxDiscount && voucher.maxDiscount > 0) {
        disc = Math.min(disc, Number(voucher.maxDiscount));
      }
    } else {
      disc = Math.min(Number(voucher.discount), fare);
    }
    return disc;
  };

  // Kiểm tra tính khả dụng của voucher với giá cước chuyến đi hiện tại
  const checkVoucherEligibility = (v, fare) => {
    if (!v) return { isEligible: false, reason: 'Voucher không tồn tại' };

    // 1. Kiểm tra loại dịch vụ: Chỉ áp dụng TRANSIT hoặc voucher chung
    if (v.type && String(v.type).toUpperCase() === 'FOOD') {
      return {
        isEligible: false,
        reason: 'Chỉ áp dụng cho đặt món T&M Meal (Đồ ăn), không dùng cho gọi xe',
      };
    }

    // 2. Kiểm tra hạn sử dụng
    if (v.expiredAt) {
      try {
        const exp = new Date(v.expiredAt).getTime();
        if (exp < Date.now()) {
          return {
            isEligible: false,
            reason: 'Mã ưu đãi này đã hết hạn sử dụng',
          };
        }
      } catch (e) {}
    }

    // 3. Kiểm tra điều kiện giá cước tối thiểu
    const minVal = Number(v.minValue) || 0;
    if (minVal > 0 && fare < minVal) {
      const diff = minVal - fare;
      return {
        isEligible: false,
        reason: `Cần cước tối thiểu ${Number(minVal).toLocaleString('vi-VN')} đ (còn thiếu ${Number(diff).toLocaleString('vi-VN')} đ)`,
      };
    }

    return { isEligible: true, reason: '' };
  };

  // Phân loại thành 2 danh sách: Khả dụng (sáng) và Không khả dụng (xám đi)
  const { eligibleVouchers, ineligibleVouchers } = useMemo(() => {
    const eligible = [];
    const ineligible = [];
    vouchers.forEach((v) => {
      const status = checkVoucherEligibility(v, selectedFare);
      if (status.isEligible) {
        eligible.push({ ...v, ...status });
      } else {
        ineligible.push({ ...v, ...status });
      }
    });
    return { eligibleVouchers: eligible, ineligibleVouchers: ineligible };
  }, [vouchers, selectedFare]);

  // Nếu đã chọn voucher nhưng đổi phương tiện làm cước thấp hơn minValue -> tự động hủy voucher
  useEffect(() => {
    if (selectedVoucher) {
      const status = checkVoucherEligibility(selectedVoucher, selectedFare);
      if (!status.isEligible) {
        setSelectedVoucher(null);
        Alert.alert(
          'Voucher không còn hiệu lực',
          `Voucher "${selectedVoucher.id}" đã tự động hủy do:\n${status.reason}`
        );
      }
    }
  }, [selectedFare]);

  const discountAmount = useMemo(() => {
    return calculateDiscount(selectedVoucher, selectedFare);
  }, [selectedVoucher, selectedFare]);

  const finalFare = Math.max(0, selectedFare - discountAmount);

  const handleApplyCustomCode = () => {
    if (!customVoucherCode.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập mã ưu đãi.');
      return;
    }
    const code = customVoucherCode.trim().toUpperCase();
    const found = vouchers.find((v) => v.id.toUpperCase() === code);
    if (found) {
      const eligibility = checkVoucherEligibility(found, selectedFare);
      if (!eligibility.isEligible) {
        Alert.alert(
          'Chưa đủ điều kiện',
          `Voucher "${found.id}" chưa thể áp dụng cho chuyến xe này:\n\n${eligibility.reason}`
        );
        return;
      }
      setSelectedVoucher(found);
      setIsVoucherModalVisible(false);
      setCustomVoucherCode('');
      Alert.alert('Thành công 🎉', `Đã áp dụng mã "${found.id}"!`);
    } else {
      Alert.alert('Không tìm thấy', `Mã giảm giá "${code}" không tồn tại hoặc đã hết hạn.`);
    }
  };

  // HTML bản đồ Leaflet vẽ cung đường di chuyển thực tế
  const mapHtml = useMemo(() => {
    const midLat = (pickUpLat + destLat) / 2;
    const midLon = (pickUpLon + destLon) / 2;
    const coordsJson = JSON.stringify(
      routeCoordinates.length > 0
        ? routeCoordinates
        : [
            [pickUpLat, pickUpLon],
            [destLat, destLon],
          ]
    );

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
          .custom-pin {
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 700;
            font-size: 11px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            border-radius: 50%;
            box-shadow: 0 3px 8px rgba(0,0,0,0.35);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          var map = L.map('map', { zoomControl: false }).setView([${midLat}, ${midLon}], 13);
          
          L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 19,
            subdomains: ['0', '1', '2', '3']
          }).addTo(map);

          // Icon Điểm đón (Xanh ngọc T&M)
          var pickupIcon = L.divIcon({
            className: 'custom-pin',
            html: '<div style="background:#00B5B8; width:30px; height:30px; border-radius:15px; display:flex; align-items:center; justify-content:center; border:2.5px solid #fff;">Đón</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          // Icon Điểm đến (Cam nổi bật)
          var destIcon = L.divIcon({
            className: 'custom-pin',
            html: '<div style="background:#F97316; width:30px; height:30px; border-radius:15px; display:flex; align-items:center; justify-content:center; border:2.5px solid #fff;">Đến</div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
          });

          var markerA = L.marker([${pickUpLat}, ${pickUpLon}], { icon: pickupIcon }).addTo(map);
          var markerB = L.marker([${destLat}, ${destLon}], { icon: destIcon }).addTo(map);

          // Tọa độ tuyến đường thực tế từ OSRM
          var routeCoords = ${coordsJson};

          // Đường viền nền ngoài (tạo hiệu ứng nổi khối 3D cho cung đường)
          L.polyline(routeCoords, {
            color: '#00838F',
            weight: 8,
            opacity: 0.6,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(map);

          // Đường cung đường chính bám theo mặt đường thực tế
          var routeLine = L.polyline(routeCoords, {
            color: '#00E5FF',
            weight: 5,
            opacity: 0.95,
            lineJoin: 'round',
            lineCap: 'round'
          }).addTo(map);

          // Tự động zoom vừa vặn toàn bộ cung đường với khoảng đệm
          map.fitBounds(routeLine.getBounds(), { padding: [60, 60] });
        </script>
      </body>
      </html>
    `;
  }, [pickUpLat, pickUpLon, destLat, destLon, routeCoordinates]);

  // Hành động đặt chuyến
  const handleConfirmBooking = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        pickUpLatitude: pickUpLat,
        pickUpLongitude: pickUpLon,
        pickUpAddress: pickUpAddress.trim(),
        destinationLatitude: destLat,
        destinationLongitude: destLon,
        destinationAddress: destinationAddress.trim(),
        shippingType: 'PASSENGER',
        vehicleType,
        shippFare: finalFare,
      };

      const res = await tripService.createTrip(payload);
      const newTripId = res?.tripId || res?.id;
      if (newTripId) {
        await paymentService.savePreferredPaymentMethod(newTripId, preferredPayMethod);
      }

      const createdTripData = {
        id: newTripId,
        pickUpLatitude: pickUpLat,
        pickUpLongitude: pickUpLon,
        pickUpAddress: pickUpAddress.trim(),
        destinationLatitude: destLat,
        destinationLongitude: destLon,
        destinationAddress: destinationAddress.trim(),
        shippingType: 'PASSENGER',
        vehicleType,
        shippFare: finalFare,
        originalFare: selectedFare,
        voucherId: selectedVoucher?.id || null,
        discountAmount: discountAmount || 0,
        status: 'REQUESTED',
        distanceKm: actualDistanceKm,
      };

      const voucherMsg = discountAmount > 0
        ? `\nCước gốc: ${Number(selectedFare).toLocaleString('vi-VN')} đ\nƯu đãi (${selectedVoucher?.id}): -${Number(discountAmount).toLocaleString('vi-VN')} đ\nThanh toán thực tế: ${Number(finalFare).toLocaleString('vi-VN')} đ`
        : `\nCước phí: ${Number(selectedFare).toLocaleString('vi-VN')} đ`;

      Alert.alert(
        'Đặt chuyến thành công 🎉',
        `Hệ thống đang điều phối tài xế gần bạn nhất!\nLộ trình thực tế: ${actualDistanceKm} km${voucherMsg}\nThanh toán: ${preferredPayMethod === 'PAY_BEFORE' ? 'Chuyển khoản VietQR' : 'Tiền mặt'}`,
        [
          {
            text: 'Theo dõi chuyến đi',
            onPress: () =>
              router.navigate({
                pathname: '/book-trip',
                params: {
                  tripId: newTripId,
                  preferredPayMethod,
                  tripData: JSON.stringify(createdTripData),
                  routeCoords: JSON.stringify(routeCoordinates),
                },
              }),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Không thể đặt chuyến', err.message || 'Đang có cuốc xe chưa hoàn thành.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <StatusBar style="dark" />
      {/* 1. NỬA 2/3 TRÊN: HIỂN THỊ BẢN ĐỒ & CUNG ĐƯỜNG THỰC TẾ */}
      <View style={styles.mapContainer}>
        <WebView
          key="trip-confirm-webview-route"
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.mapWebView}
          scrollEnabled={false}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />

        {/* Thanh Header nổi trên bản đồ */}
        <SafeAreaView style={styles.headerFloatingBar} edges={['top']}>
          <Pressable style={styles.backButton} onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>

          <View style={styles.routeBadge}>
            {isLoadingRoute ? (
              <ActivityIndicator size="small" color="#00B5B8" style={{ marginRight: 4 }} />
            ) : (
              <Ionicons name="navigate-circle" size={18} color="#00B5B8" />
            )}
            <ThemedText style={styles.routeBadgeText}>
              {isLoadingRoute ? 'Đang vẽ tuyến...' : `Thực tế ${actualDistanceKm} km${actualDurationMin ? ` • ~${actualDurationMin} phút` : ''}`}
            </ThemedText>
          </View>
        </SafeAreaView>
      </View>

      {/* 2. NỬA 1/3 DƯỚI: CHỌN XE & GIÁ XE & ẤN ĐẶT */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom + 8, 16) }]}>
        <View style={styles.dragHandle} />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
        <View style={styles.sheetHeaderRow}>
          <ThemedText style={styles.sheetTitle}>Chọn phương tiện di chuyển</ThemedText>
          <View style={[styles.peakHourBadge, isPeakHour ? styles.peakHourBadgePeak : styles.peakHourBadgeNormal]}>
            <Ionicons name={isPeakHour ? 'flame' : 'sunny'} size={12} color={isPeakHour ? '#EA580C' : '#16A34A'} />
            <ThemedText style={isPeakHour ? styles.peakHourTextPeak : styles.peakHourTextNormal}>
              {isPeakHour ? 'Cao điểm' : 'Tiêu chuẩn'}
            </ThemedText>
          </View>
        </View>

        {/* Danh sách xe & giá tính theo khoảng cách thực tế */}
        <View style={styles.vehicleListRow}>
          {/* Xe máy */}
          <Pressable
            style={[
              styles.vehicleCard,
              vehicleType === VEHICLE_TYPE.MOTORBIKE && styles.vehicleCardActive,
            ]}
            onPress={() => setVehicleType(VEHICLE_TYPE.MOTORBIKE)}
          >
            <View style={styles.vehicleIconBox}>
              <Ionicons
                name="bicycle"
                size={24}
                color={vehicleType === VEHICLE_TYPE.MOTORBIKE ? '#00B5B8' : '#6B7280'}
              />
            </View>
            <View style={styles.vehicleInfoCol}>
              <ThemedText style={styles.vehicleNameText}>Xe máy</ThemedText>
              <ThemedText style={styles.vehiclePriceText}>
                {Number(motorbikeFare).toLocaleString('vi-VN')} đ
              </ThemedText>
            </View>
          </Pressable>

          {/* Ô tô */}
          <Pressable
            style={[
              styles.vehicleCard,
              vehicleType === VEHICLE_TYPE.CAR && styles.vehicleCardActive,
            ]}
            onPress={() => setVehicleType(VEHICLE_TYPE.CAR)}
          >
            <View style={styles.vehicleIconBox}>
              <Ionicons
                name="car"
                size={24}
                color={vehicleType === VEHICLE_TYPE.CAR ? '#00B5B8' : '#6B7280'}
              />
            </View>
            <View style={styles.vehicleInfoCol}>
              <ThemedText style={styles.vehicleNameText}>Ô tô</ThemedText>
              <ThemedText style={styles.vehiclePriceText}>
                {Number(carFare).toLocaleString('vi-VN')} đ
              </ThemedText>
            </View>
          </Pressable>
        </View>

        {/* Tóm tắt đón - trả */}
        <View style={styles.summaryRouteBox}>
          <Ionicons name="location" size={16} color="#00B5B8" />
          <ThemedText style={styles.summaryRouteText} numberOfLines={1}>
            {pickUpAddress} ➜ {destinationAddress}
          </ThemedText>
        </View>

        {/* Khách hàng chọn trước hình thức thanh toán */}
        <View style={{ marginBottom: 12 }}>
          <ThemedText style={{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 6 }}>
            Hình thức thanh toán:
          </ThemedText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 9,
                paddingHorizontal: 8,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: preferredPayMethod === 'PAY_DIRECTLY' ? '#00B5B8' : '#E5E7EB',
                backgroundColor: preferredPayMethod === 'PAY_DIRECTLY' ? '#E6F8F8' : '#F9FAFB',
              }}
              onPress={() => setPreferredPayMethod('PAY_DIRECTLY')}
            >
              <Ionicons
                name="cash-outline"
                size={18}
                color={preferredPayMethod === 'PAY_DIRECTLY' ? '#00B5B8' : '#6B7280'}
                style={{ marginRight: 6 }}
              />
              <ThemedText
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: preferredPayMethod === 'PAY_DIRECTLY' ? '#008B8D' : '#4B5563',
                }}
              >
                Tiền mặt
              </ThemedText>
            </Pressable>

            <Pressable
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 9,
                paddingHorizontal: 8,
                borderRadius: 12,
                borderWidth: 1.5,
                borderColor: preferredPayMethod === 'PAY_BEFORE' ? '#00B5B8' : '#E5E7EB',
                backgroundColor: preferredPayMethod === 'PAY_BEFORE' ? '#E6F8F8' : '#F9FAFB',
              }}
              onPress={() => setPreferredPayMethod('PAY_BEFORE')}
            >
              <Ionicons
                name="qr-code-outline"
                size={18}
                color={preferredPayMethod === 'PAY_BEFORE' ? '#00B5B8' : '#6B7280'}
                style={{ marginRight: 6 }}
              />
              <ThemedText
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: preferredPayMethod === 'PAY_BEFORE' ? '#008B8D' : '#4B5563',
                }}
              >
                VietQR 24/7
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Khối Chọn Voucher / Mã Giảm Giá */}
        <View style={{ marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <ThemedText style={{ fontSize: 13, fontWeight: '700', color: '#374151' }}>
              Mã giảm giá & Khuyến mãi:
            </ThemedText>
            {selectedVoucher && (
              <Pressable onPress={() => setSelectedVoucher(null)} hitSlop={6}>
                <ThemedText style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>
                  Hủy áp dụng
                </ThemedText>
              </Pressable>
            )}
          </View>

          <Pressable
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: selectedVoucher ? '#00B5B8' : '#E5E7EB',
              backgroundColor: selectedVoucher ? '#E6F8F8' : '#F9FAFB',
            }}
            onPress={() => setIsVoucherModalVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: selectedVoucher ? '#00B5B8' : '#E5E7EB',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Ionicons
                  name="pricetag"
                  size={18}
                  color={selectedVoucher ? '#FFFFFF' : '#6B7280'}
                />
              </View>

              <View style={{ flex: 1 }}>
                <ThemedText
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: selectedVoucher ? '#008B8D' : '#111827',
                  }}
                  numberOfLines={1}
                >
                  {selectedVoucher ? selectedVoucher.id : 'Chọn hoặc nhập mã ưu đãi'}
                </ThemedText>
                <ThemedText
                  style={{
                    fontSize: 12,
                    color: selectedVoucher ? '#00B5B8' : '#6B7280',
                    fontWeight: selectedVoucher ? '700' : '400',
                    marginTop: 1,
                  }}
                >
                  {selectedVoucher
                    ? `Tiết kiệm -${Number(discountAmount).toLocaleString('vi-VN')} đ`
                    : `${eligibleVouchers.length} ưu đãi khả dụng`}
                </ThemedText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ThemedText
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: '#00B5B8',
                  marginRight: 4,
                }}
              >
                {selectedVoucher ? 'Đổi mã' : 'Chọn mã'}
              </ThemedText>
              <Ionicons name="chevron-forward" size={16} color="#00B5B8" />
            </View>
          </Pressable>
        </View>

        {/* Nút đặt chuyến */}
        <Pressable
          style={[styles.bookBtn, isSubmitting && styles.bookBtnDisabled]}
          onPress={handleConfirmBooking}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <ThemedText style={styles.bookBtnText}>
                ĐẶT XE • {Number(finalFare).toLocaleString('vi-VN')} đ
              </ThemedText>
              {discountAmount > 0 && (
                <ThemedText
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.75)',
                    textDecorationLine: 'line-through',
                    marginLeft: 8,
                  }}
                >
                  {Number(selectedFare).toLocaleString('vi-VN')} đ
                </ThemedText>
              )}
            </View>
          )}
        </Pressable>
        </ScrollView>
      </View>

      {/* Modal Chọn Voucher */}
      <Modal
        visible={isVoucherModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsVoucherModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'flex-end',
          }}
        >
          <View
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: '80%',
              paddingBottom: Math.max(insets.bottom + 12, 24),
            }}
          >
            {/* Header Modal */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 16,
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
              }}
            >
              <ThemedText style={{ fontSize: 17, fontWeight: '800', color: '#111827' }}>
                Ưu đãi chuyến xe T&M
              </ThemedText>
              <Pressable
                onPress={() => setIsVoucherModalVisible(false)}
                hitSlop={8}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#F3F4F6',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="close" size={20} color="#4B5563" />
              </Pressable>
            </View>

            {/* Ô nhập mã giảm giá trực tiếp */}
            <View
              style={{
                flexDirection: 'row',
                paddingHorizontal: 16,
                paddingVertical: 12,
                gap: 8,
              }}
            >
              <TextInput
                style={{
                  flex: 1,
                  backgroundColor: '#F3F4F6',
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  fontSize: 14,
                  color: '#111827',
                  fontWeight: '600',
                }}
                placeholder="Nhập mã ưu đãi (ví dụ: VOUCHER-TRANSIT-50PCT)"
                placeholderTextColor="#9CA3AF"
                value={customVoucherCode}
                onChangeText={setCustomVoucherCode}
                autoCapitalize="characters"
              />
              <Pressable
                style={{
                  backgroundColor: '#00B5B8',
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={handleApplyCustomCode}
              >
                <ThemedText style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>
                  Áp dụng
                </ThemedText>
              </Pressable>
            </View>

            {/* Danh sách Voucher khả dụng & không khả dụng */}
            <ScrollView
              style={{ paddingHorizontal: 16, maxHeight: 420 }}
              showsVerticalScrollIndicator={false}
            >
              {/* NHÓM 1: VOUCHER KHẢ DỤNG */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 4 }}>
                <Ionicons name="checkmark-circle" size={16} color="#00B5B8" style={{ marginRight: 6 }} />
                <ThemedText style={{ fontSize: 13, fontWeight: '800', color: '#111827' }}>
                  ƯU ĐÃI KHẢ DỤNG CHO CHUYẾN ĐI ({eligibleVouchers.length})
                </ThemedText>
              </View>

              {isLoadingVouchers ? (
                <ActivityIndicator size="small" color="#00B5B8" style={{ marginVertical: 20 }} />
              ) : eligibleVouchers.length === 0 ? (
                <View style={{ backgroundColor: '#F9FAFB', padding: 14, borderRadius: 12, marginBottom: 14, alignItems: 'center' }}>
                  <ThemedText style={{ color: '#6B7280', fontSize: 13 }}>
                    Hiện chưa có mã giảm giá nào đạt điều kiện cho giá cước này.
                  </ThemedText>
                </View>
              ) : (
                eligibleVouchers.map((v) => {
                  const isPercent = Number(v.discount) < 100;
                  const discountText = isPercent
                    ? `Giảm ${Math.round(v.discount)}%`
                    : `Giảm ${Number(v.discount).toLocaleString('vi-VN')} đ`;
                  const maxDiscText = v.maxDiscount > 0
                    ? `Tối đa ${Number(v.maxDiscount).toLocaleString('vi-VN')} đ`
                    : '';
                  const isSelected = selectedVoucher?.id === v.id;
                  const estimatedDisc = calculateDiscount(v, selectedFare);

                  return (
                    <Pressable
                      key={v.id}
                      style={{
                        flexDirection: 'row',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 14,
                        borderWidth: 1.5,
                        borderColor: isSelected ? '#00B5B8' : '#E5E7EB',
                        marginBottom: 10,
                        overflow: 'hidden',
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.05,
                        shadowRadius: 3,
                        elevation: 1,
                      }}
                      onPress={() => {
                        setSelectedVoucher(isSelected ? null : v);
                        setIsVoucherModalVisible(false);
                      }}
                    >
                      {/* Cột trái: Tỷ lệ giảm */}
                      <View
                        style={{
                          width: 80,
                          backgroundColor: isSelected ? '#00B5B8' : '#009688',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 8,
                        }}
                      >
                        <Ionicons name="car-outline" size={20} color="#FFFFFF" style={{ marginBottom: 2 }} />
                        <ThemedText
                          style={{
                            color: '#FFFFFF',
                            fontWeight: '800',
                            fontSize: 16,
                            textAlign: 'center',
                          }}
                        >
                          {isPercent ? `${Math.round(v.discount)}%` : `${Math.round(v.discount / 1000)}k`}
                        </ThemedText>
                        <ThemedText style={{ color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '700' }}>
                          GIẢM
                        </ThemedText>
                      </View>

                      {/* Thân voucher */}
                      <View style={{ flex: 1, padding: 12, justifyContent: 'center' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>
                            {v.id}
                          </ThemedText>
                          {isSelected && (
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: '#E6F8F8',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 8,
                              }}
                            >
                              <Ionicons name="checkmark-circle" size={14} color="#00B5B8" />
                              <ThemedText style={{ fontSize: 11, color: '#00B5B8', fontWeight: '700', marginLeft: 3 }}>
                                Đang dùng
                              </ThemedText>
                            </View>
                          )}
                        </View>

                        <ThemedText style={{ fontSize: 12, color: '#059669', fontWeight: '600', marginTop: 2 }}>
                          {discountText} {maxDiscText ? `• ${maxDiscText}` : ''}
                        </ThemedText>

                        <ThemedText style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                          {v.minValue > 0 ? `Đơn tối thiểu ${Number(v.minValue).toLocaleString('vi-VN')} đ` : 'Áp dụng cho mọi giá cước'}
                        </ThemedText>

                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: 6,
                            paddingTop: 6,
                            borderTopWidth: 1,
                            borderTopColor: '#F3F4F6',
                          }}
                        >
                          <ThemedText style={{ fontSize: 11, color: '#00B5B8', fontWeight: '600' }}>
                            Tiết kiệm: ~{Number(estimatedDisc).toLocaleString('vi-VN')} đ
                          </ThemedText>
                          <ThemedText
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: isSelected ? '#EF4444' : '#00B5B8',
                            }}
                          >
                            {isSelected ? 'Bỏ chọn' : 'Áp dụng'}
                          </ThemedText>
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}

              {/* NHÓM 2: VOUCHER KHÔNG KHẢ DỤNG (LÀM XÁM ĐI) */}
              {ineligibleVouchers.length > 0 && (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, marginTop: 14 }}>
                    <Ionicons name="close-circle-outline" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
                    <ThemedText style={{ fontSize: 13, fontWeight: '800', color: '#6B7280' }}>
                      ƯU ĐÃI CHƯA ĐỦ ĐIỀU KIỆN ÁP DỤNG ({ineligibleVouchers.length})
                    </ThemedText>
                  </View>

                  {ineligibleVouchers.map((v) => {
                    const isPercent = Number(v.discount) < 100;
                    const discountText = isPercent
                      ? `Giảm ${Math.round(v.discount)}%`
                      : `Giảm ${Number(v.discount).toLocaleString('vi-VN')} đ`;
                    const maxDiscText = v.maxDiscount > 0
                      ? `Tối đa ${Number(v.maxDiscount).toLocaleString('vi-VN')} đ`
                      : '';

                    return (
                      <Pressable
                        key={v.id}
                        style={{
                          flexDirection: 'row',
                          backgroundColor: '#F9FAFB',
                          borderRadius: 14,
                          borderWidth: 1.5,
                          borderColor: '#E5E7EB',
                          marginBottom: 10,
                          overflow: 'hidden',
                          opacity: 0.65,
                        }}
                        onPress={() => {
                          Alert.alert('Chưa đủ điều kiện áp dụng', v.reason);
                        }}
                      >
                        {/* Cột trái: Làm xám đi */}
                        <View
                          style={{
                            width: 80,
                            backgroundColor: '#9CA3AF',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 8,
                          }}
                        >
                          <Ionicons
                            name={v.type === 'FOOD' ? 'fast-food-outline' : 'car-outline'}
                            size={20}
                            color="#FFFFFF"
                            style={{ marginBottom: 2 }}
                          />
                          <ThemedText
                            style={{
                              color: '#FFFFFF',
                              fontWeight: '800',
                              fontSize: 16,
                              textAlign: 'center',
                            }}
                          >
                            {isPercent ? `${Math.round(v.discount)}%` : `${Math.round(v.discount / 1000)}k`}
                          </ThemedText>
                          <ThemedText style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: '700' }}>
                            GIẢM
                          </ThemedText>
                        </View>

                        {/* Thân voucher */}
                        <View style={{ flex: 1, padding: 12, justifyContent: 'center' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <ThemedText style={{ fontSize: 14, fontWeight: '700', color: '#6B7280' }}>
                              {v.id}
                            </ThemedText>
                            <View
                              style={{
                                backgroundColor: '#E5E7EB',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 6,
                              }}
                            >
                              <ThemedText style={{ fontSize: 10, color: '#6B7280', fontWeight: '700' }}>
                                Không khả dụng
                              </ThemedText>
                            </View>
                          </View>

                          <ThemedText style={{ fontSize: 12, color: '#6B7280', fontWeight: '600', marginTop: 2 }}>
                            {discountText} {maxDiscText ? `• ${maxDiscText}` : ''}
                          </ThemedText>

                          {/* Lý do chưa đủ điều kiện (Màu đỏ cảnh báo) */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: '#FEE2E2',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              marginTop: 5,
                            }}
                          >
                            <Ionicons name="alert-circle" size={13} color="#DC2626" style={{ marginRight: 4 }} />
                            <ThemedText
                              style={{ fontSize: 11, color: '#DC2626', fontWeight: '600', flex: 1 }}
                              numberOfLines={2}
                            >
                              {v.reason}
                            </ThemedText>
                          </View>

                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: 6,
                              paddingTop: 6,
                              borderTopWidth: 1,
                              borderTopColor: '#E5E7EB',
                            }}
                          >
                            <ThemedText style={{ fontSize: 11, color: '#9CA3AF' }}>
                              {v.type === 'FOOD' ? 'Voucher món ăn' : 'Chưa đạt giá cước'}
                            </ThemedText>
                            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: '#9CA3AF' }}>
                              Chi tiết ➜
                            </ThemedText>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}
