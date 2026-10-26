import React, { useState } from 'react';
import { View, StyleSheet, Modal, Pressable, ScrollView, Alert } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { ThemedText } from '@/components/themed-text';
import { ImageUploadCard } from '@/components/ui/image-upload-card';

export function AddVehicleModal({ visible, onClose, onAddVehicleSuccess }) {
  const [vehicleType, setVehicleType] = useState('MOTORBIKE');
  const [registrationFront, setRegistrationFront] = useState(null);
  const [plate, setPlate] = useState(null);

  const handleSubmit = () => {
    if (!registrationFront) {
      Alert.alert('Thiếu thông tin', 'Vui lòng tải lên ảnh Giấy tờ xe mặt trước.');
      return;
    }
    if (!plate) {
      Alert.alert('Thiếu thông tin', 'Vui lòng tải lên ảnh chụp Biển số xe.');
      return;
    }

    const newVehicle = {
      id: `veh-${Date.now()}`,
      name: vehicleType === 'MOTORBIKE' ? 'Xe máy mới' : 'Ô tô mới',
      plateNumber: 'Đang cập nhật',
      status: 'PENDING',
      vehicleType,
      registrationFrontUrl: registrationFront,
      plateImgUrl: plate,
    };

    Alert.alert('Thành công', 'Yêu cầu thêm phương tiện mới đã được gửi và đang chờ xét duyệt.');
    if (onAddVehicleSuccess) {
      onAddVehicleSuccess(newVehicle);
    }
    setRegistrationFront(null);
    setPlate(null);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Thêm phương tiện mới</ThemedText>
            <Pressable style={styles.closeIconButton} onPress={onClose} hitSlop={10}>
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

            {/* 2. Khung Upload: Giấy tờ xe mặt trước */}
            <ImageUploadCard
              label="Giấy tờ xe mặt trước:"
              imageUri={registrationFront}
              onImageSelected={setRegistrationFront}
              onImageRemoved={() => setRegistrationFront(null)}
            />

            {/* 3. Khung Upload: Biển số xe */}
            <ImageUploadCard
              label="Biển số xe:"
              imageUri={plate}
              onImageSelected={setPlate}
              onImageRemoved={() => setPlate(null)}
            />
          </ScrollView>

          {/* Nút gửi yêu cầu */}
          <Pressable style={styles.submitBtn} onPress={handleSubmit}>
            <ThemedText style={styles.submitBtnText}>Gửi yêu cầu xác minh</ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    padding: 20,
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
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
    marginVertical: 10,
  },
  typeSection: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  typeSelectorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  typeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  typeBtnActive: {
    borderColor: '#00B5B8',
    backgroundColor: '#E6F8F8',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  typeBtnTextActive: {
    color: '#00B5B8',
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: '#00B5B8',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    shadowColor: '#00B5B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
