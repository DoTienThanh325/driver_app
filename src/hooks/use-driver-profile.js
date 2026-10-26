import { useState, useEffect, useCallback } from 'react';
import { userStorage } from '@/services/storage/user.storage';
import { driverService } from '@/services/driver.service';

export function useDriverProfile() {
  const [profile, setProfile] = useState(null);
  const [driverDetail, setDriverDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Danh sách phương tiện thực tế của tài xế (mặc định rỗng, chỉ hiển thị số xe tài xế thực sự sở hữu)
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

        // Nếu API trả về thông tin vehicle từ backend
        if (detail?.vehicle) {
          setVehicles([
            {
              id: detail.vehicle.id || 'veh-1',
              name: 'Xe 1',
              vehicleType: detail.vehicle.vehicleType || 'MOTORBIKE',
              registrationFrontUrl: detail.vehicle.registrationFront,
              plateImgUrl: detail.vehicle.plate,
              status: detail.verificationStatus || 'APPROVED',
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

  const handleAddVehicleSuccess = (newVehicle) => {
    setVehicles((prev) => [
      ...prev,
      {
        ...newVehicle,
        name: `Xe ${prev.length + 1}`,
      },
    ]);
  };

  return {
    profile,
    driverDetail,
    isLoading,
    vehicles,
    selectedVehicle,
    isDocModalVisible,
    isAddVehicleModalVisible,
    handleOpenDocModal,
    handleCloseDocModal,
    handleOpenAddVehicle,
    handleCloseAddVehicle,
    handleAddVehicleSuccess,
  };
}
