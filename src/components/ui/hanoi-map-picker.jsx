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
  Keyboard,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Location from 'expo-location';

import { ThemedText } from '@/components/themed-text';
import { reverseGeocodeCoords, geocodeAddress } from '@/utils/geocoding';


// Danh mục tra cứu nhanh địa điểm & tọa độ thực tế tại Hà Nội cho Autocomplete
const POPULAR_AUTOCOMPLETE_DATABASE = [
  { title: 'Hồ Hoàn Kiếm (Hồ Gươm)', address: 'Hồ Hoàn Kiếm, Hoàn Kiếm, Hà Nội', lat: 21.028511, lon: 105.854444, keywords: ['ho guom', 'hồ gươm', 'hoan kiem', 'hoàn kiếm', 'tràng tiền', 'đinh tiên hoàng'] },
  { title: 'Đại học Bách Khoa Hà Nội', address: 'Số 1 Đại Cồ Việt, Hai Bà Trưng, Hà Nội', lat: 21.00705, lon: 105.84318, keywords: ['bach khoa', 'bách khoa', 'hust', 'đại cồ việt', 'tạ quang bửu'] },
  { title: 'Học viện Công nghệ Bưu chính Viễn thông', address: 'Km10 Đường Nguyễn Trãi, Mộ Lao, Hà Đông', lat: 20.9808, lon: 105.7876, keywords: ['ptit', 'bưu chính', 'buu chinh', 'mộ lao', 'nguyễn trãi'] },
  { title: 'Keangnam Landmark 72', address: 'Khu E6 Phạm Hùng, Mễ Trì, Nam Từ Liêm', lat: 21.0173, lon: 105.7838, keywords: ['keangnam', 'keang nam', 'landmark', 'phạm hùng', 'mễ trì'] },
  { title: 'Lotte Center Liễu Giai', address: '54 Liễu Giai, Cống Vị, Ba Đình, Hà Nội', lat: 21.033333, lon: 105.814444, keywords: ['lotte', 'liễu giai', 'đào tấn', 'ba đình'] },
  { title: 'Ngã tư Sở (Royal City)', address: '72A Nguyễn Trãi, Thượng Đình, Thanh Xuân', lat: 21.0016, lon: 105.8202, keywords: ['ngã tư sở', 'nga tu so', 'royal city', 'thanh xuân', 'nguyễn trãi'] },
  { title: 'Sân bay Quốc tế Nội Bài', address: 'Xã Phú Minh, Huyện Sóc Sơn, Hà Nội', lat: 21.218715, lon: 105.804176, keywords: ['nội bài', 'noi bai', 'sân bay', 'san bay', 'sóc sơn'] },
  { title: 'Aeon Mall Hà Đông', address: 'Khu dân cư Hoàng Văn Thụ, Dương Nội, Hà Đông', lat: 20.9786, lon: 105.7483, keywords: ['aeon', 'aeon hà đông', 'dương nội', 'ha dong'] },
  { title: 'Aeon Mall Long Biên', address: '27 Cổ Linh, Long Biên, Hà Nội', lat: 21.0315, lon: 105.8924, keywords: ['aeon long biên', 'cổ linh', 'long biên'] },
  { title: 'Hồ Tây (Chùa Trấn Quốc)', address: 'Đường Thanh Niên, Yên Phụ, Tây Hồ, Hà Nội', lat: 21.0558, lon: 105.8239, keywords: ['hồ tây', 'ho tay', 'thanh niên', 'yên phụ', 'trấn quốc'] },
  { title: 'Văn Miếu - Quốc Tử Giám', address: '58 Quốc Tử Giám, Văn Miếu, Đống Đa', lat: 21.0274, lon: 105.8355, keywords: ['văn miếu', 'van mieu', 'quốc tử giám'] },
  { title: 'Sân vận động Quốc gia Mỹ Đình', address: '1 Lê Đức Thọ, Mỹ Đình, Nam Từ Liêm', lat: 21.0205, lon: 105.7645, keywords: ['mỹ đình', 'my dinh', 'lê đức thọ', 'sân vận động'] },
  { title: 'Đại học Kinh tế Quốc dân (NEU)', address: '207 Giải Phóng, Đồng Tâm, Hai Bà Trưng', lat: 21.0006, lon: 105.8427, keywords: ['neu', 'kinh tế quốc dân', 'giải phóng', 'trần đại nghĩa'] },
  { title: 'Đại học Ngoại Thương (FTU)', address: '91 Chùa Láng, Láng Thượng, Đống Đa', lat: 21.0232, lon: 105.8052, keywords: ['ftu', 'ngoại thương', 'chùa láng'] },
  { title: 'Bến xe Giáp Bát', address: 'Km6 Đường Giải Phóng, Hoàng Mai, Hà Nội', lat: 20.9818, lon: 105.8415, keywords: ['giáp bát', 'giap bat', 'bến xe'] },
  { title: 'Bến xe Mỹ Đình', address: '20 Phạm Hùng, Mỹ Đình, Nam Từ Liêm', lat: 21.0282, lon: 105.7782, keywords: ['bến xe mỹ đình', 'ben xe my dinh'] },
];

// Tọa độ trung tâm Hà Nội (Khu vực Hoàn Kiếm / Phố Cổ)
const HANOI_CENTER = {
  lat: 21.028511,
  lng: 105.854444,
};

export const HanoiMapPicker = forwardRef(function HanoiMapPicker(
  { onLocationChange, onAddressResolved, initialCoords, currentAddress, modalOnly = false },
  ref
) {
  const inlineWebviewRef = useRef(null);
  const modalWebviewRef = useRef(null);
  const reverseGeocodeTimeoutRef = useRef(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isSearchingModal, setIsSearchingModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const searchDebounceTimerRef = useRef(null);
  const isSelectingSuggestionRef = useRef(false);

  // Debounce Autocomplete khi người dùng gõ vào ô tìm kiếm
  useEffect(() => {
    // Nếu vừa bấm chọn một gợi ý, không kích hoạt tìm kiếm lại
    if (isSelectingSuggestionRef.current) {
      isSelectingSuggestionRef.current = false;
      return;
    }

    const text = searchQuery.trim().toLowerCase();
    if (text.length < 2) {
      setAutocompleteSuggestions([]);
      return;
    }

    if (searchDebounceTimerRef.current) {
      clearTimeout(searchDebounceTimerRef.current);
    }

    searchDebounceTimerRef.current = setTimeout(async () => {
      setIsSearchingSuggestions(true);
      try {
        // 1. Tìm trong danh mục offline trước (siêu nhanh)
        const localMatches = POPULAR_AUTOCOMPLETE_DATABASE.filter(item =>
          item.keywords.some(k => text.includes(k) || k.includes(text)) ||
          item.title.toLowerCase().includes(text) ||
          item.address.toLowerCase().includes(text)
        ).slice(0, 5);

        // 2. Nếu có ít hơn 3 kết quả, gọi thêm Photon Geocoding API cho khu vực Hà Nội
        let apiMatches = [];
        if (localMatches.length < 3) {
          try {
            const encoded = encodeURIComponent(text);
            const res = await fetch(`https://photon.komoot.io/api/?q=${encoded}&lat=21.028511&lon=105.854444&limit=4`);
            if (res.ok) {
              const data = await res.json();
              if (data && data.features) {
                apiMatches = data.features.map(f => {
                  const props = f.properties || {};
                  const coords = f.geometry?.coordinates || [105.854444, 21.028511];
                  const title = props.name || props.street || text;
                  const parts = [props.street, props.district || props.suburb, props.city || 'Hà Nội'].filter(Boolean);
                  return {
                    title,
                    address: parts.length > 0 ? parts.join(', ') : 'Hà Nội, Việt Nam',
                    lat: coords[1],
                    lon: coords[0],
                  };
                });
              }
            }
          } catch {
            // bỏ qua lỗi API online
          }
        }

        const combined = [...localMatches, ...apiMatches].slice(0, 5);
        setAutocompleteSuggestions(combined);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 320);

    return () => {
      if (searchDebounceTimerRef.current) {
        clearTimeout(searchDebounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Hành động khi chọn 1 địa điểm từ danh sách gợi ý
  const handleSelectSuggestion = (item) => {
    // Đánh dấu để useEffect debounce không kích hoạt lại
    isSelectingSuggestionRef.current = true;

    // 1. Tắt bàn phím ngay lập tức
    Keyboard.dismiss();

    // 2. Điền tên địa điểm vào thanh tìm kiếm và xóa danh sách gợi ý
    setSearchQuery(item.title);
    setAutocompleteSuggestions([]);

    // 3. Cập nhật tọa độ và di chuyển bản đồ đến vị trí
    setCurrentCoords({ latitude: item.lat, longitude: item.lon });
    setLiveAddress(item.address || item.title);
    flyTo(item.lat, item.lon);

    if (onAddressResolved) {
      onAddressResolved(item.address || item.title);
    }
    if (onLocationChange) {
      onLocationChange(item.lat, item.lon);
    }
  };
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

  // Lưu lại tọa độ tương tác gần nhất từ bản đồ
  const lastInternalCoordsRef = useRef({ lat: 0, lng: 0 });

  // Đồng bộ khi initialCoords từ bên ngoài thay đổi (chỉ bay bản đồ khi đổi mục tiêu, không bay khi đang kéo ghim)
  useEffect(() => {
    if (initialCoords?.latitude && initialCoords?.longitude) {
      const latDiff = Math.abs(initialCoords.latitude - lastInternalCoordsRef.current.lat);
      const lngDiff = Math.abs(initialCoords.longitude - lastInternalCoordsRef.current.lng);
      
      // Nếu sự thay đổi là do bản đồ vừa gửi lên (< 0.00001), BỎ QUA flyTo để không bị giật hay reset mức zoom!
      if (latDiff < 0.00001 && lngDiff < 0.00001) {
        return;
      }

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
    openModal: () => setIsFullscreen(true),
    closeModal: () => setIsFullscreen(false),
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
            zoomAnimation: true,
            zoomDelta: 0.8,
            zoomSnap: 0.2,
            wheelPxPerZoomLevel: 120,
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
            var currentZoom = map.getZoom() || 16;
            map.flyTo([lat, lng], currentZoom, { animate: true, duration: 0.8 });
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

    // Giữ nguyên HTML bản đồ Modal khi mở ra, tránh bị reload giật/co zoom khi tọa độ cập nhật
  const modalHtml = useMemo(
    () => getHtmlContent(currentCoords.latitude, currentCoords.longitude),
    [isFullscreen]
  );

  const inlineHtml = useMemo(
    () => getHtmlContent(currentCoords.latitude, currentCoords.longitude),
    []
  );

  const handleMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LOCATION_CHANGED' && data.latitude && data.longitude) {
        lastInternalCoordsRef.current = { lat: data.latitude, lng: data.longitude };
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

  if (modalOnly) {
    return (
      <Modal
        visible={isFullscreen}
        animationType="slide"
        onRequestClose={() => setIsFullscreen(false)}
      >
        <SafeAreaView style={styles.fullscreenModalContainer}>
          <View style={styles.fullscreenHeader}>
            <Pressable
              style={styles.fullscreenBackButton}
              onPress={() => setIsFullscreen(false)}
            >
              <Ionicons name="close" size={22} color="#111827" />
            </Pressable>

            <View style={styles.fullscreenSearchWrapper}>
              <Ionicons name="search" size={17} color="#00B5B8" style={{ marginLeft: 10 }} />
              <TextInput
                style={styles.fullscreenSearchInput}
                placeholder="Tìm địa chỉ (VD: bưu chính viễn thông)..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={() => {
                  setAutocompleteSuggestions([]);
                  handleSearchInModal(searchQuery);
                }}
                returnKeyType="search"
              />
              {(isSearchingModal || isSearchingSuggestions) ? (
                <ActivityIndicator size="small" color="#00B5B8" style={{ marginRight: 8 }} />
              ) : searchQuery.length > 0 ? (
                <Pressable
                  onPress={() => {
                    setSearchQuery('');
                    setAutocompleteSuggestions([]);
                  }}
                  hitSlop={8}
                  style={{ marginRight: 6 }}
                >
                  <Ionicons name="close-circle" size={17} color="#9CA3AF" />
                </Pressable>
              ) : null}
              <Pressable
                style={styles.fullscreenSearchBtn}
                onPress={() => {
                  setAutocompleteSuggestions([]);
                  handleSearchInModal(searchQuery);
                }}
                disabled={isSearchingModal}
              >
                <ThemedText style={styles.fullscreenSearchBtnText}>Tìm</ThemedText>
              </Pressable>

              {/* Danh sách gợi ý Autocomplete thả xuống */}
              {autocompleteSuggestions.length > 0 && (
                <View style={styles.suggestionsDropdown}>
                  {autocompleteSuggestions.map((item, idx) => (
                    <Pressable
                      key={idx}
                      style={[
                        styles.suggestionItem,
                        idx === autocompleteSuggestions.length - 1 && { borderBottomWidth: 0 }
                      ]}
                      onPress={() => handleSelectSuggestion(item)}
                    >
                      <View style={styles.suggestionIconBox}>
                        <Ionicons name="location-outline" size={16} color="#00B5B8" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.suggestionTitle} numberOfLines={1}>
                          {item.title}
                        </ThemedText>
                        <ThemedText style={styles.suggestionSubtitle} numberOfLines={1}>
                          {item.address}
                        </ThemedText>
                      </View>
                      <Ionicons name="arrow-forward" size={14} color="#9CA3AF" />
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

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

          <View style={styles.fullscreenAddressBanner}>
            <Ionicons name="location" size={16} color="#00B5B8" style={{ marginTop: 2 }} />
            <ThemedText style={styles.fullscreenAddressText} numberOfLines={2}>
              {liveAddress || currentAddress || 'Kéo ghim hoặc nhập tìm kiếm để chọn vị trí'}
            </ThemedText>
          </View>

          <View style={styles.fullscreenMapWrapper}>
            <WebView
              ref={modalWebviewRef}
              originWhitelist={['*']}
              source={{
                html: modalHtml,
              }}
              onMessage={handleMessage}
              scrollEnabled={false}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              mixedContentMode="always"
              style={styles.webview}
            />

            <View style={styles.fullscreenZoomControls}>
              <Pressable style={styles.controlButton} onPress={zoomIn}>
                <Ionicons name="add-outline" size={22} color="#111827" />
              </Pressable>
              <Pressable style={styles.controlButton} onPress={zoomOut}>
                <Ionicons name="remove-outline" size={22} color="#111827" />
              </Pressable>
            </View>
          </View>

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
    );
  }

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
                html: modalHtml,
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
  
  // Dropdown danh sách gợi ý Autocomplete
  suggestionsDropdown: {
    position: 'absolute',
    top: 46,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E6F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  suggestionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  suggestionSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  fullscreenSearchWrapper: {
    zIndex: 9999, // Cho phép dropdown hiển thị nổi lên trên bản đồ
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
