import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { businessService } from '@/services/business.service';
import { processImageForUpload } from '@/utils/image-processor';
import { geocodeAddress, reverseGeocodeCoords } from '@/utils/geocoding';

export function useBusinessRegistration() {
  const mapRef = useRef(null);
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantAddress, setRestaurantAddress] = useState('');
  const [locationCoords, setLocationCoords] = useState({
    latitude: 21.028511, // Mặc định trung tâm Hà Nội (Hoàn Kiếm)
    longitude: 105.854444,
  });

  // Danh sách các ảnh minh chứng đã chọn (mảng URI)
  const [licenseImages, setLicenseImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [zoomImage, setZoomImage] = useState(null);
  const [isPickerModalVisible, setPickerModalVisible] = useState(false);

  // Cập nhật tọa độ từ bản đồ khi người dùng kéo thả ghim
  const handleLocationChange = useCallback((latitude, longitude) => {
    setLocationCoords({ latitude, longitude });
  }, []);

  // Nhận địa chỉ được giải mã tự động từ tọa độ GPS
  const handleAddressResolved = useCallback((resolvedAddress) => {
    if (resolvedAddress) {
      setRestaurantAddress(resolvedAddress);
    }
  }, []);

  // Tìm kiếm tọa độ từ địa chỉ chữ và bay bản đồ tới đó, đồng thời cập nhật địa chỉ chi tiết chuẩn
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

        // Tự động cập nhật lại thông tin địa chỉ chuẩn (tên cơ sở, đường, phường, quận, Hà Nội)
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

  // Mở thư viện chọn ảnh
  const pickFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để tiếp tục.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        const newUris = result.assets.map((asset) => asset.uri);
        setLicenseImages((prev) => [...prev, ...newUris]);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể chọn ảnh từ thư viện.');
    } finally {
      setPickerModalVisible(false);
    }
  };

  // Mở máy ảnh chụp ảnh
  const takeFromCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền máy ảnh để chụp ảnh.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setLicenseImages((prev) => [...prev, result.assets[0].uri]);
      }
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể khởi động máy ảnh.');
    } finally {
      setPickerModalVisible(false);
    }
  };

  // Thêm một ảnh mới vào mảng
  const handleAddImage = (uri) => {
    if (uri) {
      setLicenseImages((prev) => [...prev, uri]);
    }
  };

  // Xóa bớt một ảnh theo index
  const handleRemoveImage = (indexToRemove) => {
    setLicenseImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Gửi hồ sơ đăng ký kinh doanh lên backend
  const submitRegistration = async () => {
    const trimmedName = restaurantName.trim();
    const trimmedAddress = restaurantAddress.trim();

    if (!trimmedName) {
      Alert.alert('Thông tin bắt buộc', 'Vui lòng nhập tên nhà hàng, quán ăn.');
      return;
    }

    if (licenseImages.length === 0) {
      Alert.alert(
        'Thông tin bắt buộc',
        'Vui lòng tải lên ít nhất một ảnh Giấy phép đăng ký kinh doanh hoặc tài liệu minh chứng.'
      );
      return;
    }

    if (!trimmedAddress) {
      Alert.alert('Thông tin bắt buộc', 'Vui lòng nhập địa chỉ nhà hàng, quán ăn tại Hà Nội.');
      return;
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      formData.append('restaurantName', trimmedName);
      formData.append('restaurantAddress', trimmedAddress);
      // Tọa độ Hà Nội lưu ngầm không hiển thị số ra ngoài
      formData.append('restaurantLatitude', String(locationCoords.latitude));
      formData.append('restaurantLongitude', String(locationCoords.longitude));

      // Xử lý nén từng ảnh và append vào FormData với key businessLicenseImages
      for (let i = 0; i < licenseImages.length; i++) {
        const processed = await processImageForUpload(licenseImages[i], `business_license_${i}`);
        if (processed) {
          formData.append('businessLicenseImages', processed);
        }
      }

      const res = await businessService.registerBusiness(formData);

      Alert.alert(
        'Nộp hồ sơ thành công',
        res.message || 'Đơn đăng ký kinh doanh của bạn đã được gửi và đang chờ xét duyệt.',
        [
          {
            text: 'Đóng',
            onPress: () => {
              router.replace('/(tabs)/account');
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Đăng ký thất bại', err.message || 'Đã có lỗi xảy ra trong quá trình nộp hồ sơ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    mapRef,
    restaurantName,
    setRestaurantName,
    restaurantAddress,
    setRestaurantAddress,
    locationCoords,
    handleLocationChange,
    handleAddressResolved,
    handleSearchAddress,
    isSearchingAddress,
    licenseImages,
    handleAddImage,
    handleRemoveImage,
    isPickerModalVisible,
    setPickerModalVisible,
    pickFromLibrary,
    takeFromCamera,
    zoomImage,
    setZoomImage,
    isSubmitting,
    submitRegistration,
  };
}
