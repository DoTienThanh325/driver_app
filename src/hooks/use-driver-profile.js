import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { userStorage } from '@/services/storage/user.storage';
import { driverService } from '@/services/driver.service';
import { processImageForUpload } from '@/utils/image-processor';

export function useDriverProfile() {
  const [profile, setProfile] = useState(null);
  const [driverDetail, setDriverDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Chế độ chỉnh sửa (Edit Mode)
  const [isEditMode, setIsEditMode] = useState(false);

  // State lưu trữ các ảnh nháp được chọn mới cục bộ
  const [draftImages, setDraftImages] = useState({
    idCardFront: null,
    idCardBack: null,
    driverLicenseFront: null,
    driverLicenseBack: null,
    driverLicenseMotorbikeFront: null,
    driverLicenseMotorbikeBack: null,
    driverLicenseCarFront: null,
    driverLicenseCarBack: null,
  });

  // State quản lý Modal phóng to ảnh (Zoomable Image Viewer)
  const [zoomImage, setZoomImage] = useState({
    visible: false,
    imageUrl: null,
    title: '',
  });

  // State quản lý Modal chọn nguồn ảnh (Camera / Gallery)
  const [pickerModal, setPickerModal] = useState({
    visible: false,
    fieldKey: null,
    title: '',
  });

  // Danh sách phương tiện thực tế của tài xế
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isDocModalVisible, setIsDocModalVisible] = useState(false);
  const [isAddVehicleModalVisible, setIsAddVehicleModalVisible] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const user = await userStorage.getUserProfile();
      setProfile(user);

      if (user?.id) {
        const detail = await driverService.getDriverDetail(user.id);
        setDriverDetail(detail);

        if (detail?.vehicles && detail.vehicles.length > 0) {
          setVehicles(
            detail.vehicles.map((v, idx) => ({
              id: v.id || `veh-${idx + 1}`,
              name: v.vehicleType === 'CAR' ? `Ô tô ${idx + 1}` : `Xe máy ${idx + 1}`,
              vehicleType: v.vehicleType || 'MOTORBIKE',
              registrationFrontUrl: v.registrationFront,
              plateImgUrl: v.plate,
              status: v.status || detail.verificationStatus || 'APPROVED',
            }))
          );
        } else if (detail?.vehicle) {
          setVehicles([
            {
              id: detail.vehicle.id || 'veh-1',
              name: detail.vehicle.vehicleType === 'CAR' ? 'Ô tô 1' : 'Xe máy 1',
              vehicleType: detail.vehicle.vehicleType || 'MOTORBIKE',
              registrationFrontUrl: detail.vehicle.registrationFront,
              plateImgUrl: detail.vehicle.plate,
              status: detail.vehicle.status || detail.verificationStatus || 'APPROVED',
            },
          ]);
        } else {
          setVehicles([]);
        }
      }
    } catch (err) {
      console.warn('Lỗi tải thông tin hồ sơ tài xế:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Điều khiển Modal Zoom
  const handleOpenZoom = (imageUrl, title) => {
    if (!imageUrl) return;
    setZoomImage({
      visible: true,
      imageUrl,
      title: title || 'Chi tiết ảnh',
    });
  };

  const handleCloseZoom = () => {
    setZoomImage({
      visible: false,
      imageUrl: null,
      title: '',
    });
  };

  // Điều khiển chế độ Chỉnh sửa
  const handleToggleEditMode = () => {
    if (isEditMode) {
      // Đang ở edit mode, nếu có ảnh thay đổi thì hỏi xác nhận hủy
      const hasChanges = Object.values(draftImages).some((val) => val !== null);
      if (hasChanges) {
        Alert.alert(
          'Hủy thay đổi',
          'Bạn có chắc chắn muốn hủy các ảnh vừa chọn không?',
          [
            { text: 'Tiếp tục sửa', style: 'cancel' },
            {
              text: 'Hủy bỏ',
              style: 'destructive',
              onPress: handleCancelEdit,
            },
          ]
        );
      } else {
        setIsEditMode(false);
      }
    } else {
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setDraftImages({
      idCardFront: null,
      idCardBack: null,
      driverLicenseFront: null,
      driverLicenseBack: null,
      driverLicenseMotorbikeFront: null,
      driverLicenseMotorbikeBack: null,
      driverLicenseCarFront: null,
      driverLicenseCarBack: null,
    });
    setIsEditMode(false);
  };

  // Mở bộ chọn ảnh
  const handleOpenPicker = (fieldKey, title) => {
    setPickerModal({
      visible: true,
      fieldKey,
      title,
    });
  };

  const handleClosePicker = () => {
    setPickerModal({
      visible: false,
      fieldKey: null,
      title: '',
    });
  };

  // Khi chọn xong 1 ảnh mới: xử lý nén và ép định dạng JPEG ngay lập tức
  const handleSelectImage = async (uri) => {
    const targetKey = pickerModal.fieldKey;
    handleClosePicker();

    if (targetKey && uri) {
      try {
        const processed = await processImageForUpload(uri, targetKey);
        setDraftImages((prev) => ({
          ...prev,
          [targetKey]: processed ? processed.uri : uri,
        }));
      } catch (err) {
        setDraftImages((prev) => ({
          ...prev,
          [targetKey]: uri,
        }));
      }
    }
  };

  // Hoàn tác 1 ảnh nháp về ảnh gốc
  const handleRemoveDraftImage = (fieldKey) => {
    setDraftImages((prev) => ({
      ...prev,
      [fieldKey]: null,
    }));
  };

  // Xử lý nén ảnh và Lưu cập nhật lên Backend / MinIO
  const handleSaveProfileImages = async () => {
    const hasChanges = Object.values(draftImages).some((val) => val !== null);
    if (!hasChanges) {
      Alert.alert('Chưa có thay đổi', 'Bạn chưa chọn ảnh mới nào để cập nhật.');
      setIsEditMode(false);
      return;
    }

    try {
      setIsSaving(true);

      const formData = new FormData();
      const compressTasks = [];

      const appendField = async (fieldName, uri) => {
        if (!uri) return;
        const part = await processImageForUpload(uri, fieldName);
        if (part) {
          formData.append(fieldName, {
            uri: part.uri,
            name: part.name,
            type: 'image/jpeg',
          });
        }
      };

      if (draftImages.idCardFront) {
        compressTasks.push(appendField('idCardFront', draftImages.idCardFront));
      }
      if (draftImages.idCardBack) {
        compressTasks.push(appendField('idCardBack', draftImages.idCardBack));
      }
      if (draftImages.driverLicenseMotorbikeFront) {
        compressTasks.push(appendField('driverLicenseMotorbikeFront', draftImages.driverLicenseMotorbikeFront));
      }
      if (draftImages.driverLicenseMotorbikeBack) {
        compressTasks.push(appendField('driverLicenseMotorbikeBack', draftImages.driverLicenseMotorbikeBack));
      }
      if (draftImages.driverLicenseCarFront) {
        compressTasks.push(appendField('driverLicenseCarFront', draftImages.driverLicenseCarFront));
      }
      if (draftImages.driverLicenseCarBack) {
        compressTasks.push(appendField('driverLicenseCarBack', draftImages.driverLicenseCarBack));
      }
      if (draftImages.driverLicenseFront) {
        compressTasks.push(appendField('driverLicenseFront', draftImages.driverLicenseFront));
      }
      if (draftImages.driverLicenseBack) {
        compressTasks.push(appendField('driverLicenseBack', draftImages.driverLicenseBack));
      }

      await Promise.all(compressTasks);

      await driverService.updateRegistration(formData);

      Alert.alert(
        'Cập nhật thành công',
        'Ảnh giấy tờ mới đã được lưu và gửi tới quản trị viên để xét duyệt lại.',
        [{ text: 'Đồng ý' }]
      );

      // Reset draft và tắt edit mode
      handleCancelEdit();
      // Tải lại dữ liệu mới nhất
      await fetchProfile();
    } catch (err) {
      const msg = err.message || 'Cập nhật ảnh giấy tờ thất bại. Vui lòng thử lại.';
      Alert.alert('Lỗi cập nhật', msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Tương tác khi click vào 1 ô ảnh
  const handleImagePress = (fieldKey, currentUrl, title) => {
    if (isEditMode) {
      handleOpenPicker(fieldKey, title);
    } else {
      handleOpenZoom(currentUrl, title);
    }
  };

  const handleOpenDocModal = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDocModalVisible(true);
  };

  const handleCloseDocModal = () => {
    setIsDocModalVisible(false);
    setSelectedVehicle(null);
  };

  const handleOpenAddVehicle = () => {
    setIsAddVehicleModalVisible(true);
  };

  const handleCloseAddVehicle = () => {
    setIsAddVehicleModalVisible(false);
  };

  const handleAddVehicleSuccess = async () => {
    await fetchProfile();
  };

  const hasMotorbike = vehicles.some((v) => v.vehicleType === 'MOTORBIKE');
  const hasCar = vehicles.some((v) => v.vehicleType === 'CAR');

  const hasMotorbikeLicense = Boolean(
    driverDetail?.licenseMotorbike?.front ||
    (driverDetail?.license?.front && (hasMotorbike || !hasCar))
  );

  const hasCarLicense = Boolean(
    driverDetail?.licenseCar?.front ||
    (driverDetail?.license?.front && hasCar && !hasMotorbike)
  );

  return {
    profile,
    driverDetail,
    isLoading,
    isSaving,
    isEditMode,
    draftImages,
    zoomImage,
    pickerModal,
    vehicles,
    selectedVehicle,
    isDocModalVisible,
    isAddVehicleModalVisible,
    hasMotorbikeLicense,
    hasCarLicense,
    fetchProfile,
    handleToggleEditMode,
    handleCancelEdit,
    handleSaveProfileImages,
    handleImagePress,
    handleOpenZoom,
    handleCloseZoom,
    handleOpenPicker,
    handleClosePicker,
    handleSelectImage,
    handleRemoveDraftImage,
    handleOpenDocModal,
    handleCloseDocModal,
    handleOpenAddVehicle,
    handleCloseAddVehicle,
    handleAddVehicleSuccess,
  };
}
