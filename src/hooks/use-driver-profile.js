import { getUserErrorMessage } from '../utils/error-message';
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { authService } from '@/services/auth.service';
import { userStorage } from '@/services/storage/user.storage';
import { driverService } from '@/services/driver.service';
import { processImageForUpload } from '@/utils/image-processor';
import { offlineCacheStorage } from '@/services/storage/offline-cache.storage';
import { offlineSyncService, SYNC_TASK_TYPE } from '@/services/offline-sync.service';

export function useDriverProfile() {
  const [profile, setProfile] = useState(null);
  const [driverDetail, setDriverDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

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

  const syncVehicleList = useCallback((detail) => {
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
  }, []);

  const fetchProfile = useCallback(async (isManualCheck = false) => {
    try {
      // Ưu tiên đọc dữ liệu từ cache trước để người dùng thấy ngay
      if (!isManualCheck && !driverDetail) {
        const cached = await offlineCacheStorage.getDriverProfile();
        if (cached) {
          setDriverDetail(cached);
          syncVehicleList(cached);
          setIsLoading(false);
        }
      }

      const pending = await offlineSyncService.hasPendingTask(SYNC_TASK_TYPE.DRIVER_PROFILE_IMAGES);
      setHasPendingSync(pending);

      if (!isManualCheck && !driverDetail) setIsLoading(true);
      const user = await userStorage.getUserProfile();
      setProfile(user);

      if (user?.id) {
        const detail = await driverService.getDriverDetail(user.id);
        setDriverDetail(detail);
        setIsOfflineMode(false);

        // [ROLE UPDATE STRATEGY]
        const isApproved = detail?.verificationStatus === 'APPROVED';
        if (isApproved) {
          const hasDriverRole = await userStorage.isDriver();
          if (!hasDriverRole) {
            const syncResult = await authService.syncRolesAndProfile();
            if (syncResult?.refreshed) {
              Alert.alert(
                '🎉 Chúc mừng!',
                'Hồ sơ tài xế của bạn đã được quản trị viên phê duyệt thành công. Quyền đối tác tài xế đã được kích hoạt!'
              );
            }
          }
        }

        if (isManualCheck) {
          if (isApproved) {
            Alert.alert('🎉 Thành công', 'Hồ sơ tài xế đã được phê duyệt và quyền tài xế đã sẵn sàng hoạt động!');
          } else if (detail?.verificationStatus === 'PENDING') {
            Alert.alert('Đang xét duyệt', 'Hồ sơ tài xế của bạn đang được ban quản trị xét duyệt. Vui lòng quay lại sau ít phút!');
          } else {
            Alert.alert('Trạng thái hồ sơ', `Trạng thái hiện tại: ${detail?.verificationStatus || 'Chờ duyệt'}`);
          }
        }

        syncVehicleList(detail);
      }
    } catch (err) {
      console.warn('Lỗi tải thông tin hồ sơ tài xế (dùng dữ liệu cache):', err);
      setIsOfflineMode(true);
      // Nạp fallback từ cache nếu fetch gặp sự cố
      const cached = await offlineCacheStorage.getDriverProfile();
      if (cached) {
        setDriverDetail(cached);
        syncVehicleList(cached);
      }
      if (isManualCheck) {
        Alert.alert(
          'Chưa có kết nối mạng',
          'Hiện chưa thể kiểm tra xét duyệt mới nhất từ ban quản trị. Bạn đang xem thông tin đã lưu gần nhất.'
        );
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
      setIsCheckingStatus(false);
    }
  }, [driverDetail, syncVehicleList]);

  const handlePullRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await offlineSyncService.processSyncQueue();
      const pending = await offlineSyncService.hasPendingTask(SYNC_TASK_TYPE.DRIVER_PROFILE_IMAGES);
      setHasPendingSync(pending);
    } catch (e) {
      console.warn('Lỗi khi sync queue lúc pull refresh:', e);
    }
    await fetchProfile();
  }, [fetchProfile]);

  const handleCheckApprovalStatus = useCallback(async () => {
    setIsCheckingStatus(true);
    await fetchProfile(true);
  }, [fetchProfile]);

  useEffect(() => {
    fetchProfile();
    const unsubscribe = offlineSyncService.subscribe(() => {
      offlineSyncService.hasPendingTask(SYNC_TASK_TYPE.DRIVER_PROFILE_IMAGES).then(setHasPendingSync);
    });
    return () => unsubscribe();
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

      try {
        await driverService.updateRegistration(formData);
        await offlineSyncService.removeTask(SYNC_TASK_TYPE.DRIVER_PROFILE_IMAGES);
        setHasPendingSync(false);

        Alert.alert(
          'Cập nhật thành công',
          'Ảnh giấy tờ mới đã được lưu và gửi tới quản trị viên để xét duyệt lại.',
          [{ text: 'Đồng ý' }]
        );
      } catch (uploadErr) {
        // Nếu upload thất bại do lỗi mạng hoặc server: Lưu cache cục bộ + Enqueue sync task
        console.warn('Lỗi kết nối khi cập nhật hồ sơ tài xế, lưu vào hàng đợi đồng bộ:', uploadErr?.message);
        
        const updatedDetail = {
          ...driverDetail,
          idCard: {
            front: draftImages.idCardFront || driverDetail?.idCard?.front,
            back: draftImages.idCardBack || driverDetail?.idCard?.back,
          },
          license: {
            front: draftImages.driverLicenseFront || draftImages.driverLicenseMotorbikeFront || draftImages.driverLicenseCarFront || driverDetail?.license?.front,
            back: draftImages.driverLicenseBack || draftImages.driverLicenseMotorbikeBack || draftImages.driverLicenseCarBack || driverDetail?.license?.back,
          },
          verificationStatus: 'PENDING',
        };
        setDriverDetail(updatedDetail);
        await offlineCacheStorage.saveDriverProfile(updatedDetail);
        await offlineSyncService.enqueueTask(SYNC_TASK_TYPE.DRIVER_PROFILE_IMAGES, { draftImages });
        setHasPendingSync(true);

        Alert.alert(
          'Đã ghi nhận ảnh giấy tờ',
          'Ảnh mới đã được lưu trên máy của bạn. Hệ thống sẽ tự động gửi đi xét duyệt ngay khi mạng ổn định lại mà bạn không cần tải lại ảnh.',
          [{ text: 'Đồng ý' }]
        );
      }

      // Reset draft và tắt edit mode
      handleCancelEdit();
      // Tải lại dữ liệu mới nhất
      await fetchProfile();
    } catch (err) {
      Alert.alert(
        'Chưa thể gửi ảnh',
        getUserErrorMessage(err, 'Không thể lưu hồ sơ. Vui lòng thử lại.')
      );
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
    isRefreshing,
    isCheckingStatus,
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
    hasPendingSync,
    isOfflineMode,
    fetchProfile,
    handlePullRefresh,
    handleCheckApprovalStatus,
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
