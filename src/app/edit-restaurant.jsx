import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SubHeader } from '@/components/ui/sub-header';
import { HanoiMapPicker } from '@/components/ui/hanoi-map-picker';
import { businessService } from '@/services/business.service';
import { userStorage } from '@/services/storage/user.storage';
import { geocodeAddress } from '@/utils/geocoding';
import { businessRegisterStyles as styles } from '@/styles/screens/business-register.styles';

export default function EditRestaurantScreen() {
  const params = useLocalSearchParams();
  const mapRef = useRef(null);

  const [restaurantId, setRestaurantId] = useState(params.restaurantId || '');
  const [restaurantName, setRestaurantName] = useState(params.initialName || '');
  const [restaurantAddress, setRestaurantAddress] = useState(params.initialAddress || '');
  const [locationCoords, setLocationCoords] = useState({
    latitude: params.latitude ? parseFloat(params.latitude) : 21.028511,
    longitude: params.longitude ? parseFloat(params.longitude) : 105.854444,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // Tìm kiếm tọa độ từ địa chỉ chữ và bay bản đồ tới đó
  const handleSearchAddress = async (overrideAddress) => {
    const textToSearch = (overrideAddress !== undefined ? overrideAddress : restaurantAddress).trim();
    if (!textToSearch || textToSearch.length < 2) return;

    try {
      setIsSearchingAddress(true);
      const result = await geocodeAddress(textToSearch);
      if (result) {
        setLocationCoords({
          latitude: result.latitude,
          longitude: result.longitude,
        });
        mapRef.current?.flyTo(result.latitude, result.longitude);

        if (result.formattedAddress) {
          setRestaurantAddress(result.formattedAddress);
        }
      } else {
        Alert.alert(
          'Không tìm thấy địa điểm',
          `Không tìm thấy địa điểm "${textToSearch}" tại Hà Nội. Vui lòng kiểm tra lại từ khóa hoặc dùng ghim trên bản đồ.`
        );
      }
    } catch (err) {
      console.warn('Lỗi tìm kiếm địa chỉ:', err);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  // Nếu thiếu dữ liệu từ params, tự động lấy thông tin từ Backend & Storage
  useEffect(() => {
    const fetchExistingData = async () => {
      if (restaurantId && restaurantName && restaurantAddress) {
        return;
      }
      setIsLoading(true);
      try {
        const [backendData, localInfo] = await Promise.all([
          businessService.getBusinessRegistration(),
          userStorage.getBusinessInfo(),
        ]);

        const targetId =
          params.restaurantId ||
          backendData?.restaurantId ||
          localInfo?.restaurantId ||
          backendData?.id;
        const targetName =
          params.initialName ||
          backendData?.restaurantName ||
          localInfo?.restaurantName ||
          '';
        const targetAddress =
          params.initialAddress ||
          backendData?.restaurantAddress ||
          localInfo?.restaurantAddress ||
          '';
        const targetLat =
          params.latitude ? parseFloat(params.latitude) :
          backendData?.restaurantLatitude ||
          localInfo?.restaurantLatitude ||
          21.028511;
        const targetLng =
          params.longitude ? parseFloat(params.longitude) :
          backendData?.restaurantLongitude ||
          localInfo?.restaurantLongitude ||
          105.854444;

        if (targetId) setRestaurantId(targetId);
        if (targetName) setRestaurantName(targetName);
        if (targetAddress) setRestaurantAddress(targetAddress);
        setLocationCoords({ latitude: targetLat, longitude: targetLng });
      } catch (err) {
        console.warn('Không thể tải thông tin nhà hàng hiện tại:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingData();
  }, [params.restaurantId, params.initialName, params.initialAddress, params.latitude, params.longitude]);

  // Cập nhật tọa độ khi người dùng di chuyển ghim trên bản đồ
  const handleLocationChange = useCallback((latitude, longitude) => {
    setLocationCoords({ latitude, longitude });
  }, []);

  // Nhận địa chỉ giải mã tự động từ tọa độ GPS trên bản đồ
  const handleAddressResolved = useCallback((resolvedAddress) => {
    if (resolvedAddress) {
      setRestaurantAddress(resolvedAddress);
    }
  }, []);

  // Xử lý gửi cập nhật thông tin nhà hàng
  const handleSubmitUpdate = async () => {
    const trimmedName = restaurantName.trim();
    const trimmedAddress = restaurantAddress.trim();

    if (!trimmedName) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên nhà hàng, quán ăn.');
      return;
    }

    if (!trimmedAddress) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn hoặc nhập địa chỉ nhà hàng.');
      return;
    }

    if (!restaurantId) {
      Alert.alert(
        'Lỗi',
        'Không tìm thấy mã nhà hàng (restaurantId) để thực hiện cập nhật. Vui lòng thử lại sau.'
      );
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: trimmedName,
        locationAddress: trimmedAddress,
        locationLatitude: locationCoords.latitude,
        locationLongitude: locationCoords.longitude,
      };

      await businessService.updateRestaurant(restaurantId, payload);

      // Cập nhật lại cache cục bộ
      const currentLocal = await userStorage.getBusinessInfo();
      await userStorage.saveBusinessInfo({
        ...currentLocal,
        restaurantId,
        restaurantName: trimmedName,
        restaurantAddress: trimmedAddress,
        restaurantLatitude: locationCoords.latitude,
        restaurantLongitude: locationCoords.longitude,
      });

      Alert.alert(
        'Thành công',
        'Thông tin nhà hàng đã được cập nhật thành công.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        'Lỗi cập nhật',
        error?.message || 'Có lỗi xảy ra khi cập nhật thông tin nhà hàng. Vui lòng thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* 1. Header màu chủ đạo Teal */}
      <SubHeader title="Chỉnh sửa Nhà hàng" />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#00B5B8" />
          <ThemedText style={{ marginTop: 12, color: '#6B7280', fontSize: 14 }}>
            Đang tải thông tin quán ăn...
          </ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <ThemedText style={styles.instructionText}>
              Cập nhật tên và vị trí hiển thị của nhà hàng tại Hà Nội để khách hàng dễ dàng tìm kiếm và đặt món.
            </ThemedText>

            {/* Phần 1: Tên nhà hàng - Chỉnh sửa trực tiếp */}
            <View style={styles.sectionHeaderContainer}>
              <ThemedText style={styles.sectionHeading}>1. Thông tin cửa hàng / Quán ăn</ThemedText>
              <ThemedText style={styles.sectionSubHeading}>
                Tên cơ sở kinh doanh hiển thị cho khách hàng đặt món
              </ThemedText>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Tên nhà hàng, quán ăn: *</ThemedText>
              <TextInput
                style={styles.textInput}
                placeholder="VD: Phở Bò Gia Truyền Hà Nội - CS Hoàn Kiếm"
                placeholderTextColor="#9CA3AF"
                value={restaurantName}
                onChangeText={setRestaurantName}
                editable={!isSubmitting}
              />
            </View>

            {/* Phần 2: Địa chỉ & Vị trí cửa hàng - Dùng chung HanoiMapPicker */}
            <View style={styles.sectionDivider}>
              <View style={styles.sectionHeaderContainer}>
                <ThemedText style={styles.sectionHeading}>2. Địa chỉ & Vị trí cửa hàng (Hà Nội)</ThemedText>
                <ThemedText style={styles.sectionSubHeading}>
                  Nhập địa chỉ và xác định vị trí của quán trên bản đồ Hà Nội
                </ThemedText>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Địa chỉ hiển thị: *</ThemedText>
                <View style={styles.addressInputWrapper}>
                  <TextInput
                    style={styles.addressTextInput}
                    placeholder="Địa chỉ sẽ tự động hiển thị khi bạn chọn trên bản đồ"
                    placeholderTextColor="#9CA3AF"
                    value={restaurantAddress}
                    onChangeText={setRestaurantAddress}
                    editable={!isSubmitting}
                    onSubmitEditing={() => handleSearchAddress()}
                    returnKeyType="search"
                  />
                  <Pressable
                    style={[styles.addressActionBtn, isSearchingAddress && styles.addressActionBtnActive]}
                    onPress={() => handleSearchAddress()}
                    disabled={isSearchingAddress || isSubmitting}
                  >
                    {isSearchingAddress ? (
                      <ActivityIndicator size="small" color="#00B5B8" />
                    ) : (
                      <Ionicons name="search" size={20} color="#00B5B8" />
                    )}
                  </Pressable>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.inputLabel}>Vị trí quán trên bản đồ Hà Nội: *</ThemedText>

                {/* Bản đồ nhúng Leaflet Google Tiles Hà Nội giống trang Đăng ký kinh doanh */}
                <HanoiMapPicker
                  ref={mapRef}
                  onLocationChange={handleLocationChange}
                  onAddressResolved={handleAddressResolved}
                  initialCoords={locationCoords}
                  currentAddress={restaurantAddress}
                />

                <View style={styles.mapStatusBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#059669" />
                  <ThemedText style={styles.mapStatusText}>
                    Đã xác định vị trí cửa hàng tại Hà Nội
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Nút lưu thay đổi */}
            <Pressable
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmitUpdate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.submitButtonText}>LƯU THAY ĐỔI</ThemedText>
              )}
            </Pressable>
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}
