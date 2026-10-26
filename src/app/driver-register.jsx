import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SubHeader } from '@/components/ui/sub-header';
import { ImageUploadCard } from '@/components/ui/image-upload-card';
import { useDriverRegistration } from '@/hooks/use-driver-registration';
import { driverRegisterStyles as styles } from '@/styles/screens/driver-register.styles';

export default function DriverRegisterScreen() {
  const {
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
    submitRegistration,
  } = useDriverRegistration();

  return (
    <ThemedView style={styles.container}>
      {/* 1. Header Teal với nút quay lại tròn */}
      <SubHeader title="Đăng ký Tài xế" />

      {/* 2. Form nội dung cuộn */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <ThemedText style={styles.instructionText}>
            Vui lòng tải lên đầy đủ các giấy tờ dưới đây để được xét duyệt trở thành tài xế của T&M.
          </ThemedText>

          {/* Phần 1: Giấy tờ tùy thân */}
          <ImageUploadCard
            label="CCCD mặt trước:"
            imageUri={idCardFront}
            onImageSelected={setIdCardFront}
            onImageRemoved={() => setIdCardFront(null)}
          />

          <ImageUploadCard
            label="CCCD mặt sau:"
            imageUri={idCardBack}
            onImageSelected={setIdCardBack}
            onImageRemoved={() => setIdCardBack(null)}
          />

          <ImageUploadCard
            label="Giấy phép lái xe mặt trước:"
            imageUri={driverLicenseFront}
            onImageSelected={setDriverLicenseFront}
            onImageRemoved={() => setDriverLicenseFront(null)}
          />

          <ImageUploadCard
            label="Giấy phép lái xe mặt sau:"
            imageUri={driverLicenseBack}
            onImageSelected={setDriverLicenseBack}
            onImageRemoved={() => setDriverLicenseBack(null)}
          />

          {/* Phần 2: Thông tin phương tiện */}
          <View style={styles.sectionDivider}>
            <ThemedText style={styles.sectionHeading}>Thông tin phương tiện</ThemedText>

            {/* Bộ chọn loại phương tiện */}
            <View style={styles.vehicleTypeContainer}>
              <Pressable
                style={[
                  styles.vehicleTypeButton,
                  vehicleType === 'MOTORBIKE' && styles.vehicleTypeButtonActive,
                ]}
                onPress={() => setVehicleType('MOTORBIKE')}
              >
                <ThemedText
                  style={[
                    styles.vehicleTypeText,
                    vehicleType === 'MOTORBIKE' && styles.vehicleTypeTextActive,
                  ]}
                >
                  🛵 Xe máy
                </ThemedText>
              </Pressable>

              <Pressable
                style={[
                  styles.vehicleTypeButton,
                  vehicleType === 'CAR' && styles.vehicleTypeButtonActive,
                ]}
                onPress={() => setVehicleType('CAR')}
              >
                <ThemedText
                  style={[
                    styles.vehicleTypeText,
                    vehicleType === 'CAR' && styles.vehicleTypeTextActive,
                  ]}
                >
                  🚗 Ô tô
                </ThemedText>
              </Pressable>
            </View>

            <ImageUploadCard
              label="Giấy tờ xe mặt trước:"
              imageUri={registrationFront}
              onImageSelected={setRegistrationFront}
              onImageRemoved={() => setRegistrationFront(null)}
            />

            <ImageUploadCard
              label="Biển số xe:"
              imageUri={plate}
              onImageSelected={setPlate}
              onImageRemoved={() => setPlate(null)}
            />
          </View>

          {/* Nút gửi yêu cầu xác minh */}
          <Pressable
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={submitRegistration}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.submitButtonText}>Gửi yêu cầu xác minh</ThemedText>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}
