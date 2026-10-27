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
          <View style={styles.sectionHeaderContainer}>
            <ThemedText style={styles.sectionHeading}>1. Giấy tờ tùy thân</ThemedText>
            <ThemedText style={styles.sectionSubHeading}>Căn cước công dân (CCCD/CMND) còn hạn sử dụng</ThemedText>
          </View>

          <ImageUploadCard
            label="CCCD/CMND mặt trước: *"
            imageUri={idCardFront}
            onImageSelected={setIdCardFront}
            onImageRemoved={() => setIdCardFront(null)}
          />

          <ImageUploadCard
            label="CCCD/CMND mặt sau: *"
            imageUri={idCardBack}
            onImageSelected={setIdCardBack}
            onImageRemoved={() => setIdCardBack(null)}
          />

          {/* Phần 2: Thông tin phương tiện & Giấy tờ xe */}
          <View style={styles.sectionDivider}>
            <View style={styles.sectionHeaderContainer}>
              <ThemedText style={styles.sectionHeading}>2. Thông tin phương tiện & Giấy tờ lái xe</ThemedText>
              <ThemedText style={styles.sectionSubHeading}>
                Chọn loại phương tiện và cung cấp đầy đủ giấy tờ tương ứng
              </ThemedText>
            </View>

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

            {/* Giấy phép lái xe tương ứng với loại phương tiện */}
            <ImageUploadCard
              label={
                vehicleType === 'CAR'
                  ? 'GPLX Ô tô mặt trước: *'
                  : 'GPLX Xe máy mặt trước: *'
              }
              imageUri={driverLicenseFront}
              onImageSelected={setDriverLicenseFront}
              onImageRemoved={() => setDriverLicenseFront(null)}
            />

            <ImageUploadCard
              label={
                vehicleType === 'CAR'
                  ? 'GPLX Ô tô mặt sau: *'
                  : 'GPLX Xe máy mặt sau: *'
              }
              imageUri={driverLicenseBack}
              onImageSelected={setDriverLicenseBack}
              onImageRemoved={() => setDriverLicenseBack(null)}
            />

            {/* Giấy tờ đăng ký xe tương ứng */}
            <ImageUploadCard
              label={
                vehicleType === 'CAR'
                  ? 'Đăng ký ô tô mặt trước (Cà vẹt): *'
                  : 'Đăng ký xe máy mặt trước (Cà vẹt): *'
              }
              imageUri={registrationFront}
              onImageSelected={setRegistrationFront}
              onImageRemoved={() => setRegistrationFront(null)}
            />

            {/* Ảnh biển số xe tương ứng */}
            <ImageUploadCard
              label={
                vehicleType === 'CAR'
                  ? 'Ảnh biển số xe ô tô: *'
                  : 'Ảnh biển số xe máy: *'
              }
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
