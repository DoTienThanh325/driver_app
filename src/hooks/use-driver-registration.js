import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { driverService } from '@/services/driver.service';

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

  const appendImagePart = (formData, fieldName, uri) => {
    if (!uri) return;
    const filename = uri.split('/').pop() || `${fieldName}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';

    formData.append(fieldName, {
      uri,
      name: filename,
      type,
    });
  };

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
      appendImagePart(formData, 'idCardFront', idCardFront);
      appendImagePart(formData, 'idCardBack', idCardBack);
      appendImagePart(formData, 'driverLicenseFront', driverLicenseFront);
      appendImagePart(formData, 'driverLicenseBack', driverLicenseBack);
      appendImagePart(formData, 'registrationFront', registrationFront);
      appendImagePart(formData, 'plate', plate);

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
      const msg = err.message || 'Đăng ký hồ sơ thất bại. Vui lòng thử lại.';
      setErrorMessage(msg);
      Alert.alert('Lỗi đăng ký', msg);
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
