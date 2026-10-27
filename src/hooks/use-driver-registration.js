import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { driverService } from '@/services/driver.service';
import { userStorage } from '@/services/storage/user.storage';
import { processImageForUpload } from '@/utils/image-processor';

export function useDriverRegistration() {
  const [vehicleType, setVehicleType] = useState('MOTORBIKE');
  const [idCardFront, setIdCardFront] = useState(null);
  const [idCardBack, setIdCardBack] = useState(null);
  const [driverLicenseFront, setDriverLicenseFront] = useState(null);
  const [driverLicenseBack, setDriverLicenseBack] = useState(null);
  const [registrationFront, setRegistrationFront] = useState(null);
  const [plate, setPlate] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Kiểm tra nếu tài khoản đã nộp hồ sơ thì thông báo và chuyển sang Hồ sơ Tài xế
  useEffect(() => {
    let isMounted = true;
    (async () => {
      const userProfile = await userStorage.getUserProfile();
      if (userProfile?.id && isMounted) {
        try {
          const regInfo = await driverService.getRegistrationStatus(userProfile.id);
          if (regInfo?.status && regInfo.status !== 'NOT_REGISTERED') {
            Alert.alert(
              'Hồ sơ đã tồn tại',
              'Tài khoản của bạn đã gửi hồ sơ đăng ký tài xế trên hệ thống. Đang chuyển tới trang Hồ sơ Tài xế.',
              [
                {
                  text: 'Đồng ý',
                  onPress: () => router.replace('/driver-profile'),
                },
              ]
            );
          }
        } catch {
          // Bỏ qua lỗi kết nối
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const submitRegistration = useCallback(async () => {
    if (!idCardFront || !idCardBack) {
      Alert.alert('Thiếu giấy tờ', 'Vui lòng tải lên đầy đủ cả 2 mặt Căn cước công dân (CCCD).');
      return;
    }
    if (!driverLicenseFront || !driverLicenseBack) {
      Alert.alert('Thiếu giấy tờ', 'Vui lòng tải lên đầy đủ cả 2 mặt Giấy phép lái xe (GPLX).');
      return;
    }
    if (!registrationFront) {
      Alert.alert('Thiếu giấy tờ', 'Vui lòng tải lên ảnh Giấy tờ xe mặt trước (Cà vẹt xe).');
      return;
    }
    if (!plate) {
      Alert.alert('Thiếu giấy tờ', 'Vui lòng tải lên ảnh chụp Biển số xe thực tế.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const formData = new FormData();

      // Nén và chuẩn hóa ảnh trước khi đưa vào FormData
      const [pIdFront, pIdBack, pLicFront, pLicBack, pRegFront, pPlate] = await Promise.all([
        processImageForUpload(idCardFront, 'idCardFront'),
        processImageForUpload(idCardBack, 'idCardBack'),
        processImageForUpload(driverLicenseFront, 'driverLicenseFront'),
        processImageForUpload(driverLicenseBack, 'driverLicenseBack'),
        processImageForUpload(registrationFront, 'registrationFront'),
        processImageForUpload(plate, 'plate'),
      ]);

      if (pIdFront) formData.append('idCardFront', pIdFront);
      if (pIdBack) formData.append('idCardBack', pIdBack);
      if (pLicFront) formData.append('driverLicenseFront', pLicFront);
      if (pLicBack) formData.append('driverLicenseBack', pLicBack);
      if (pRegFront) formData.append('registrationFront', pRegFront);
      if (pPlate) formData.append('plate', pPlate);

      const res = await driverService.registerDriver(formData, vehicleType);

      Alert.alert(
        'Nộp hồ sơ thành công',
        'Hồ sơ đăng ký tài xế của bạn đã được gửi. Quản trị viên sẽ tiến hành phê duyệt trong vòng 24h.',
        [
          {
            text: 'Đồng ý',
            onPress: () => router.replace('/(tabs)/account'),
          },
        ]
      );

      return res;
    } catch (err) {
      let msg = err.message || 'Đăng ký hồ sơ thất bại. Vui lòng thử lại.';
      if (
        msg.includes('409') ||
        msg.toLowerCase().includes('already has a driver profile') ||
        msg.toLowerCase().includes('conflicts')
      ) {
        msg = 'Tài khoản của bạn đã gửi hồ sơ đăng ký tài xế trên hệ thống. Vui lòng kiểm tra lại tại mục Hồ sơ Tài xế.';
        Alert.alert('Hồ sơ đã tồn tại', msg, [
          {
            text: 'Đến Hồ sơ Tài xế',
            onPress: () => router.replace('/driver-profile'),
          },
          { text: 'Đóng', style: 'cancel' },
        ]);
      } else {
        Alert.alert('Lỗi đăng ký', msg);
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    idCardFront,
    idCardBack,
    driverLicenseFront,
    driverLicenseBack,
    registrationFront,
    plate,
    vehicleType,
  ]);

  return {
    vehicleType,
    setVehicleType,
    idCardFront,
    setIdCardFront,
    idCardBack,
    setIdCardBack,
    driverLicenseFront,
    setDriverLicenseFront,
    driverLicenseBack,
    setDriverLicenseBack,
    registrationFront,
    setRegistrationFront,
    plate,
    setPlate,
    isSubmitting,
    errorMessage,
    submitRegistration,
  };
}
