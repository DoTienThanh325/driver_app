import { ThemedText } from '@/components/themed-text';
import { ImageUploadCard } from '@/components/ui/image-upload-card';
import { driverService } from '@/services/driver.service';
import { processImageForUpload } from '@/utils/image-processor';
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

export function AddVehicleModal({
  visible,
  onClose,
  onAddVehicleSuccess,
  hasMotorbikeLicense = false,
  hasCarLicense = false,
}) {
  const [vehicleType, setVehicleType] = useState('MOTORBIKE');
  const [registrationFront, setRegistrationFront] = useState(null);
  const [plate, setPlate] = useState(null);
  const [driverLicenseFront, setDriverLicenseFront] = useState(null);
  const [driverLicenseBack, setDriverLicenseBack] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Xác định loại xe này tài xế đã có bằng lái trong hồ sơ chưa
  const needLicense = vehicleType === 'CAR' ? !hasCarLicense : !hasMotorbikeLicense;

  const resetForm = () => {
    setRegistrationFront(null);
    setPlate(null);
    setDriverLicenseFront(null);
    setDriverLicenseBack(null);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!registrationFront) {
      Alert.alert('Thiếu thông tin', 'Vui lòng tải lên ảnh Giấy tờ xe mặt trước (Cà vẹt xe).');
      return;
    }
    if (!plate) {
      Alert.alert('Thiếu thông tin', 'Vui lòng tải lên ảnh chụp Biển số xe thực tế.');
      return;
    }
    if (needLicense) {
      const typeLabel = vehicleType === 'CAR' ? 'ô tô' : 'xe máy';
      if (!driverLicenseFront) {
        Alert.alert(
          'Thiếu bằng lái',
          `Vui lòng tải lên ảnh mặt trước Giấy phép lái xe ${typeLabel}.`
        );
        return;
      }
      if (!driverLicenseBack) {
        Alert.alert(
          'Thiếu bằng lái',
          `Vui lòng tải lên ảnh mặt sau Giấy phép lái xe ${typeLabel}.`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
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

      compressTasks.push(appendField('registrationFront', registrationFront));
      compressTasks.push(appendField('plate', plate));

      if (needLicense) {
        compressTasks.push(appendField('driverLicenseFront', driverLicenseFront));
        compressTasks.push(appendField('driverLicenseBack', driverLicenseBack));
      }

      await Promise.all(compressTasks);

      await driverService.addVehicle(formData, vehicleType);

      Alert.alert(
        'Gửi yêu cầu thành công',
        'Phương tiện mới đã được thêm và đang chờ ban quản trị xét duyệt.',
        [
          {
            text: 'Đồng ý',
            onPress: () => {
              if (onAddVehicleSuccess) {
                onAddVehicleSuccess();
              }
              handleClose();
            },
          },
        ]
      );
    } catch (err) {
      const msg = err.message || 'Thêm phương tiện mới thất bại. Vui lòng thử lại.';
      Alert.alert('Lỗi', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <ThemedText style={styles.modalTitle}>Thêm phương tiện mới</ThemedText>
              <ThemedText style={styles.modalSubtitle}>Đăng ký thêm xe chạy dịch vụ</ThemedText>
            </View>
            <Pressable style={styles.closeIconButton} onPress={handleClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#4B5563" />
            </Pressable>
          </View>

          {/* Form Content */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* 1. Chọn loại phương tiện */}
            <View style={styles.typeSection}>
              <ThemedText style={styles.sectionLabel}>Loại phương tiện:</ThemedText>
              <View style={styles.typeSelectorRow}>
                <Pressable
                  style={[
                    styles.typeBtn,
                    vehicleType === 'MOTORBIKE' && styles.typeBtnActive,
                  ]}
                  onPress={() => setVehicleType('MOTORBIKE')}
                >
                  <ThemedText
                    style={[
                      styles.typeBtnText,
                      vehicleType === 'MOTORBIKE' && styles.typeBtnTextActive,
                    ]}
                  >
                    🛵 Xe máy
                  </ThemedText>
                </Pressable>

                <Pressable
                  style={[
                    styles.typeBtn,
                    vehicleType === 'CAR' && styles.typeBtnActive,
                  ]}
                  onPress={() => setVehicleType('CAR')}
                >
                  <ThemedText
                    style={[
                      styles.typeBtnText,
                      vehicleType === 'CAR' && styles.typeBtnTextActive,
                    ]}
                  >
                    🚗 Ô tô
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Banner trạng thái bằng lái của loại xe này */}
            {needLicense ? (
              <View style={styles.warningBanner}>
                <Ionicons name="alert-circle" size={18} color="#D97706" />
                <ThemedText style={styles.warningBannerText}>
                  Bạn đang thêm phương tiện {vehicleType === 'CAR' ? 'Ô tô' : 'Xe máy'} lần đầu.
                  Vui lòng tải lên cả 2 mặt Giấy phép lái xe tương ứng.
                </ThemedText>
              </View>
            ) : (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={18} color="#059669" />
                <ThemedText style={styles.successBannerText}>
                  Đã có bằng lái {vehicleType === 'CAR' ? 'ô tô' : 'xe máy'} trong hồ sơ của bạn.
                </ThemedText>
              </View>
            )}

            {/* 2. Khung Upload: Giấy tờ xe mặt trước */}
            <ImageUploadCard
              label="Giấy tờ xe mặt trước (Cà vẹt):"
              imageUri={registrationFront}
              onImageSelected={setRegistrationFront}
              onImageRemoved={() => setRegistrationFront(null)}
            />

            {/* 3. Khung Upload: Biển số xe */}
            <ImageUploadCard
              label="Ảnh chụp biển số xe thực tế:"
              imageUri={plate}
              onImageSelected={setPlate}
              onImageRemoved={() => setPlate(null)}
            />

            {/* 4. Khung Upload Bằng lái xe (chỉ hiển thị khi chưa có bằng) */}
            {needLicense && (
              <View style={styles.licenseSection}>
                <View style={styles.sectionDivider} />
                <ThemedText style={styles.sectionSubTitle}>
                  Giấy phép lái xe {vehicleType === 'CAR' ? 'ô tô' : 'xe máy'} (Bắt buộc):
                </ThemedText>

                <ImageUploadCard
                  label={`GPLX ${vehicleType === 'CAR' ? 'ô tô' : 'xe máy'} mặt trước:`}
                  imageUri={driverLicenseFront}
                  onImageSelected={setDriverLicenseFront}
                  onImageRemoved={() => setDriverLicenseFront(null)}
                />

                <ImageUploadCard
                  label={`GPLX ${vehicleType === 'CAR' ? 'ô tô' : 'xe máy'} mặt sau:`}
                  imageUri={driverLicenseBack}
                  onImageSelected={setDriverLicenseBack}
                  onImageRemoved={() => setDriverLicenseBack(null)}
                />
              </View>
            )}
          </ScrollView>

          {/* Nút gửi yêu cầu */}
          <Pressable
            style={[styles.submitBtn, isSubmitting && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.submitBtnText}>Gửi yêu cầu xác minh</ThemedText>
            )}
          </Pressable>
        </View>

        {/* Loading Overlay */}
        {isSubmitting && (
          <View style={styles.loadingBackdrop}>
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#00B5B8" />
              <ThemedText style={styles.loadingText}>Đang cập nhật ảnh lên hệ thống...</ThemedText>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    marginVertical: 12,
    flexShrink: 1,
  },
  typeSection: {
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  typeBtnActive: {
    borderColor: '#00B5B8',
    backgroundColor: '#E6F8F8',
  },
  typeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  typeBtnTextActive: {
    color: '#00B5B8',
    fontWeight: '700',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  warningBannerText: {
    fontSize: 12,
    color: '#B45309',
    flex: 1,
    lineHeight: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  successBannerText: {
    fontSize: 12,
    color: '#047857',
    flex: 1,
    lineHeight: 16,
  },
  licenseSection: {
    marginTop: 4,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  sectionSubTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  submitBtn: {
    backgroundColor: '#00B5B8',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  loadingBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999999,
    elevation: 999999,
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: 20,
    alignItems: 'center',
    gap: 14,
    maxWidth: '80%',
    minWidth: 240,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
});
