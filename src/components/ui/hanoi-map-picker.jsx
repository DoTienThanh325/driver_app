import React, { useMemo, useRef, useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Modal,
  SafeAreaView,
  Alert,
  TextInput,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';
import { reverseGeocodeCoords, geocodeAddress } from '@/utils/geocoding';

// Tọa độ trung tâm Hà Nội (Khu vực Hoàn Kiếm / Phố Cổ)
const HANOI_CENTER = {
  lat: 21.028511,
  lng: 105.854444,
};

export const HanoiMapPicker = forwardRef(function HanoiMapPicker(
  { onLocationChange, onAddressResolved, initialCoords, currentAddress },
  ref
) {
  const inlineWebviewRef = useRef(null);
  const modalWebviewRef = useRef(null);
  const reverseGeocodeTimeoutRef = useRef(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isSearchingModal, setIsSearchingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveAddress, setLiveAddress] = useState(currentAddress || '');
  const [currentCoords, setCurrentCoords] = useState({
    latitude: initialCoords?.latitude || HANOI_CENTER.lat,
    longitude: initialCoords?.longitude || HANOI_CENTER.lng,
  });

  useEffect(() => {
    if (currentAddress) {
      setLiveAddress(currentAddress);
    }
  }, [currentAddress]);

  // Đồng bộ khi initialCoords từ bên ngoài thay đổi
  useEffect(() => {
    if (initialCoords?.latitude && initialCoords?.longitude) {
      setCurrentCoords({
        latitude: initialCoords.latitude,
        longitude: initialCoords.longitude,
      });
      flyTo(initialCoords.latitude, initialCoords.longitude);
    }
  }, [initialCoords?.latitude, initialCoords?.longitude]);

  // Di chuyển bản đồ đến tọa độ mong muốn
  const flyTo = (lat, lng) => {
    const jsCode = `
      if (window.flyToCoords) {
        window.flyToCoords(${lat}, ${lng});
      }
      true;
    `;
    inlineWebviewRef.current?.injectJavaScript(jsCode);
    if (isFullscreen) {
      modalWebviewRef.current?.injectJavaScript(jsCode);
    }
  };

  // Zoom In
  const zoomIn = () => {
    const jsCode = `if (window.zoomInMap) { window.zoomInMap(); } true;`;
    inlineWebviewRef.current?.injectJavaScript(jsCode);
    modalWebviewRef.current?.injectJavaScript(jsCode);
  };

  // Zoom Out
  const zoomOut = () => {
    const jsCode = `if (window.zoomOutMap) { window.zoomOutMap(); } true;`;
    inlineWebviewRef.current?.injectJavaScript(jsCode);
    modalWebviewRef.current?.injectJavaScript(jsCode);
  };

  // Tìm kiếm địa điểm ngay bên trong màn hình toàn màn hình
  const handleSearchInModal = async (queryText) => {
    const text = (queryText !== undefined ? queryText : searchQuery).trim();
    if (!text || text.length < 2) return;

    try {
      setIsSearchingModal(true);
      const result = await geocodeAddress(text);
      if (result) {
        setCurrentCoords({
          latitude: result.latitude,
          longitude: result.longitude,
        });
        flyTo(result.latitude, result.longitude);

        if (result.formattedAddress) {
          setLiveAddress(result.formattedAddress);
          if (onAddressResolved) {
            onAddressResolved(result.formattedAddress);
          }
        }
        if (onLocationChange) {
          onLocationChange(result.latitude, result.longitude);
        }
      } else {
        Alert.alert(
          'Không tìm thấy địa điểm',
          `Không tìm thấy địa điểm "${text}" tại Hà Nội. Vui lòng thử từ khóa khác hoặc kéo ghim thủ công.`
        );
      }
    } catch (err) {
      console.warn('Lỗi tìm kiếm trong modal:', err);
    } finally {
      setIsSearchingModal(false);
    }
  };

  // Expose các phương thức ra component cha qua ref
  useImperativeHandle(ref, () => ({
    flyTo,
    zoomIn,
    zoomOut,
    getCurrentLocation: handleGetGPSLocation,
  }));

  // Lấy vị trí GPS thực từ điện thoại
  const handleGetGPSLocation = async () => {
    try {
      setIsLocatingGPS(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền vị trí',
          'Vui lòng cấp quyền truy cập vị trí trong cài đặt điện thoại để sử dụng tính năng định vị GPS.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setCurrentCoords({ latitude, longitude });

      // Bay bản đồ đến tọa độ GPS
      flyTo(latitude, longitude);

      if (onLocationChange) {
        onLocationChange(latitude, longitude);
      }

      // Tự động phân giải tên địa chỉ chữ tương ứng
      const resolvedAddress = await reverseGeocodeCoords(latitude, longitude);
      if (resolvedAddress && onAddressResolved) {
        onAddressResolved(resolvedAddress);
      }
    } catch (error) {
      Alert.alert('Lỗi GPS', 'Không thể lấy vị trí hiện tại của thiết bị. Vui lòng bật định vị GPS.');
    } finally {
      setIsLocatingGPS(false);
    }
  };

  // Tạo mã HTML Leaflet dùng Google Maps Tiles
  const getHtmlContent = (centerLat, centerLng) => {
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
          .center-marker {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -100%);
            z-index: 1000;
            pointer-events: none;
            filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.38));
            transition: transform 0.15s ease-out;
          }
          .pulse-dot {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 10px;
            height: 10px;
            background: rgba(0, 181, 184, 0.45);
            border-radius: 50%;
            z-index: 999;
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <div class="pulse-dot"></div>
        <div class="center-marker" id="pinMarker">
          <svg width="36" height="46" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 0C5.37258 0 0 5.37258 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.37258 18.6274 0 12 0Z" fill="#00B5B8"/>
            <circle cx="12" cy="11" r="5" fill="#FFFFFF"/>
            <circle cx="12" cy="11" r="2.5" fill="#00B5B8"/>
          </svg>
        </div>

        <script>
          // Giới hạn phạm vi chỉ trong khu vực Hà Nội [Tây Nam, Đông Bắc]
          var hanoiBounds = L.latLngBounds(
            L.latLng(20.45, 105.25),
            L.latLng(21.50, 106.20)
          );

          var map = L.map('map', {
            zoomControl: false,
            maxBounds: hanoiBounds,
            maxBoundsViscosity: 0.8
          }).setView([${centerLat}, ${centerLng}], 16);

          // Google Maps Tiles chuẩn không cần API Key, hỗ trợ CORS 100%
          var googleTile = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
            maxZoom: 20,
            minZoom: 10,
            subdomains: ['0', '1', '2', '3']
          });

          // CartoCDN Tiles dự phòng
          var cartoTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            minZoom: 10,
            subdomains: 'abcd'
          });

          googleTile.on('tileerror', function() {
            if (!map.hasLayer(cartoTile)) {
              cartoTile.addTo(map);
            }
          });

          googleTile.addTo(map);

          setTimeout(function() {
            map.invalidateSize();
          }, 250);

          // Hàm bay bản đồ tới tọa độ được truyền từ React Native
          window.flyToCoords = function(lat, lng) {
            map.flyTo([lat, lng], 17, { animate: true, duration: 1 });
          };

          window.zoomInMap = function() {
            map.zoomIn();
          };

          window.zoomOutMap = function() {
            map.zoomOut();
          };

          // Khi người dùng di chuyển bản đồ
          map.on('movestart', function() {
            var pin = document.getElementById('pinMarker');
            if (pin) pin.style.transform = 'translate(-50%, -115%) scale(1.08)';
          });

          map.on('moveend', function() {
            var pin = document.getElementById('pinMarker');
            if (pin) pin.style.transform = 'translate(-50%, -100%) scale(1)';

            var center = map.getCenter();
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'LOCATION_CHANGED',
                latitude: center.lat,
                longitude: center.lng
              }));
            }
          });
        </script>
      </body>
      </html>
    `;
  };

  const inlineHtml = useMemo(
    () => getHtmlContent(currentCoords.latitude, currentCoords.longitude),
    []
  );

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOCATION_CHANGED' && data.latitude && data.longitude) {
        setCurrentCoords({ latitude: data.latitude, longitude: data.longitude });
        if (onLocationChange) {
          onLocationChange(data.latitude, data.longitude);
        }

        // Tự động phân giải địa chỉ khi người dùng dừng di chuyển ghim
        if (reverseGeocodeTimeoutRef.current) {
          clearTimeout(reverseGeocodeTimeoutRef.current);
        }
        reverseGeocodeTimeoutRef.current = setTimeout(async () => {
          try {
            const resolved = await reverseGeocodeCoords(data.latitude, data.longitude);
            if (resolved) {
              setLiveAddress(resolved);
              if (onAddressResolved) {
                onAddressResolved(resolved);
              }
            }
          } catch (err) {
            console.warn('Lỗi reverse geocoding ghim:', err);
          }
        }, 650);
      }
    } catch (e) {
      console.warn('Lỗi phân tích tọa độ bản đồ:', e);
    }
  };

  const handleConfirmFullscreen = () => {
    if (liveAddress && onAddressResolved) {
      onAddressResolved(liveAddress);
    }
    setIsFullscreen(false);
  };

  return (
    <View style={styles.container}>
      {/* WebView bản đồ hiển thị inline */}
      <WebView
        ref={inlineWebviewRef}
        originWhitelist={['*']}
        source={{ html: inlineHtml }}
        onMessage={handleMessage}
        scrollEnabled={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#00B5B8" />
            <ThemedText style={styles.loadingText}>Đang tải bản đồ Hà Nội...</ThemedText>
          </View>
        )}
        style={styles.webview}
      />

      {/* Cụm nút điều khiển bên phải: Toàn màn hình + Zoom In + Zoom Out + GPS */}
      <View style={styles.controlButtonsContainer}>
        {/* Nút phóng to toàn màn hình */}
        <Pressable
          style={styles.controlButton}
          onPress={() => setIsFullscreen(true)}
          hitSlop={6}
        >
          <Ionicons name="expand-outline" size={19} color="#111827" />
        </Pressable>

        {/* Nút định vị GPS */}
        <Pressable
          style={[styles.controlButton, isLocatingGPS && styles.controlButtonActive]}
          onPress={handleGetGPSLocation}
          disabled={isLocatingGPS}
          hitSlop={6}
        >
          {isLocatingGPS ? (
            <ActivityIndicator size="small" color="#00B5B8" />
          ) : (
            <Ionicons name="locate-outline" size={20} color="#00B5B8" />
          )}
        </Pressable>

        {/* Nút Zoom In (+) */}
        <Pressable style={styles.controlButton} onPress={zoomIn} hitSlop={6}>
          <Ionicons name="add-outline" size={20} color="#111827" />
        </Pressable>

        {/* Nút Zoom Out (-) */}
        <Pressable style={styles.controlButton} onPress={zoomOut} hitSlop={6}>
          <Ionicons name="remove-outline" size={20} color="#111827" />
        </Pressable>
      </View>

      {/* Nhãn hướng dẫn kéo ghim */}
      <View style={styles.guideBadge} pointerEvents="none">
        <ThemedText style={styles.guideText}>
          Kéo bản đồ để đặt ghim đúng vị trí quán
        </ThemedText>
      </View>

      {/* MODAL BẢN ĐỒ TOÀN MÀN HÌNH (FULLSCREEN MAP MODAL) */}
      <Modal
        visible={isFullscreen}
        animationType="slide"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <SafeAreaView style={styles.fullscreenModalContainer}>
          {/* Header Fullscreen tích hợp Thanh tìm kiếm địa chỉ */}
          <View style={styles.fullscreenHeader}>
            <Pressable
              style={styles.fullscreenBackButton}
              onPress={() => setIsFullscreen(false)}
            >
              <Ionicons name="close" size={22} color="#111827" />
            </Pressable>

            {/* Khung tìm kiếm địa chỉ nổi phong cách Google Maps */}
            <View style={styles.fullscreenSearchWrapper}>
              <Ionicons name="search" size={17} color="#00B5B8" style={{ marginLeft: 10 }} />
              <TextInput
                style={styles.fullscreenSearchInput}
                placeholder="Tìm địa chỉ (VD: học viện bưu chính viễn thông)..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => handleSearchInModal(searchQuery)}
                returnKeyType="search"
              />
              {isSearchingModal ? (
                <ActivityIndicator size="small" color="#00B5B8" style={{ marginRight: 8 }} />
              ) : searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  hitSlop={8}
                  style={{ marginRight: 6 }}
                >
                  <Ionicons name="close-circle" size={17} color="#9CA3AF" />
                </Pressable>
              ) : null}
              <Pressable
                style={styles.fullscreenSearchBtn}
                onPress={() => handleSearchInModal(searchQuery)}
                disabled={isSearchingModal}
              >
                <ThemedText style={styles.fullscreenSearchBtnText}>Tìm</ThemedText>
              </Pressable>
            </View>

            {/* Nút GPS */}
            <Pressable
              style={styles.fullscreenGpsButton}
              onPress={handleGetGPSLocation}
              disabled={isLocatingGPS}
            >
              {isLocatingGPS ? (
                <ActivityIndicator size="small" color="#00B5B8" />
              ) : (
                <Ionicons name="locate-outline" size={20} color="#00B5B8" />
              )}
            </Pressable>
          </View>

          {/* Banner hiển thị địa chỉ chi tiết đang được ghim */}
          <View style={styles.fullscreenAddressBanner}>
            <Ionicons name="location" size={16} color="#00B5B8" style={{ marginTop: 2 }} />
            <ThemedText style={styles.fullscreenAddressText} numberOfLines={2}>
              {liveAddress || currentAddress || 'Kéo ghim hoặc nhập tìm kiếm để chọn vị trí'}
            </ThemedText>
          </View>

          {/* Bản đồ chiếm toàn bộ không gian còn lại */}
          <View style={styles.fullscreenMapWrapper}>
            <WebView
              ref={modalWebviewRef}
              originWhitelist={['*']}
              source={{
                html: getHtmlContent(currentCoords.latitude, currentCoords.longitude),
              }}
              onMessage={handleMessage}
              scrollEnabled={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mixedContentMode="always"
              style={styles.webview}
            />

            {/* Cụm Zoom In / Out trong chế độ Fullscreen */}
            <View style={styles.fullscreenZoomControls}>
              <Pressable style={styles.controlButton} onPress={zoomIn}>
                <Ionicons name="add-outline" size={22} color="#111827" />
              </Pressable>
              <Pressable style={styles.controlButton} onPress={zoomOut}>
                <Ionicons name="remove-outline" size={22} color="#111827" />
              </Pressable>
            </View>
          </View>

          {/* Footer nút xác nhận vị trí */}
          <View style={styles.fullscreenFooter}>
            <Pressable
              style={styles.fullscreenConfirmButton}
              onPress={handleConfirmFullscreen}
            >
              <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
              <ThemedText style={styles.fullscreenConfirmText}>XÁC NHẬN VỊ TRÍ NÀY</ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    height: 290, // Kích thước to hơn rõ ràng theo yêu cầu
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: 8,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  webview: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    color: '#6B7280',
  },
  controlButtonsContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
    zIndex: 10,
  },
  controlButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  controlButtonActive: {
    backgroundColor: '#E6F8F8',
    borderColor: '#00B5B8',
  },
  guideBadge: {
    position: 'absolute',
    bottom: 10,
    alignSelf: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.78)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 5,
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Modal Fullscreen Styles
  fullscreenModalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 12,
  },
  fullscreenBackButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenSearchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    height: 42,
  },
  fullscreenSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fullscreenSearchBtn: {
    backgroundColor: '#00B5B8',
    paddingHorizontal: 12,
    height: '100%',
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullscreenSearchBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  fullscreenAddressBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E6F8F8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#CCF2F4',
    gap: 8,
  },
  fullscreenAddressText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#00838F',
    lineHeight: 18,
  },
  fullscreenGpsButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#E6F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#9CEBF9',
  },
  fullscreenMapWrapper: {
    flex: 1,
    position: 'relative',
  },
  fullscreenZoomControls: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    gap: 10,
    zIndex: 10,
  },
  fullscreenFooter: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  fullscreenConfirmButton: {
    backgroundColor: '#00B5B8',
    borderRadius: 14,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#00B5B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  fullscreenConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
