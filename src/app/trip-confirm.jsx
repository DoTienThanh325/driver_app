import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Pressable,
  ActivityIndicator,
  Alert,
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

  // Trạng thái lộ trình thực tế từ OSRM
  const [actualDistanceKm, setActualDistanceKm] = useState(initialDistanceKm);
  const [actualDurationMin, setActualDurationMin] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]); // Mảng [[lat, lon], ...]
  const [isLoadingRoute, setIsLoadingRoute] = useState(true);

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
        shippFare: selectedFare,
      };

      const res = await tripService.createTrip(payload);
      const newTripId = res?.tripId || res?.id;
      if (newTripId) {
        await paymentService.savePreferredPaymentMethod(newTripId, preferredPayMethod);
      }

      Alert.alert(
        'Đặt chuyến thành công 🎉',
        `Hệ thống đang điều phối tài xế gần bạn nhất!\nLộ trình thực tế: ${actualDistanceKm} km\nCước phí: ${Number(selectedFare).toLocaleString('vi-VN')} đ\nThanh toán: ${preferredPayMethod === 'PAY_BEFORE' ? 'Chuyển khoản VietQR' : 'Tiền mặt'}`,
        [
          {
            text: 'Theo dõi chuyến đi',
            onPress: () =>
              router.replace({
                pathname: '/book-trip',
                params: { tripId: newTripId, preferredPayMethod },
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
          key={`webview-route-${routeCoordinates.length}`}
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
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
        <View style={styles.dragHandle} />

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

        {/* Nút đặt chuyến */}
        <Pressable
          style={[styles.bookBtn, isSubmitting && styles.bookBtnDisabled]}
          onPress={handleConfirmBooking}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.bookBtnText}>
              ĐẶT XE • {Number(selectedFare).toLocaleString('vi-VN')} đ
            </ThemedText>
          )}
        </Pressable>
      </View>
    </ThemedView>
  );
}
