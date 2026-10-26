import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AddVehicleModal } from '@/components/ui/add-vehicle-modal';
import { SubHeader } from '@/components/ui/sub-header';
import { VehicleDocumentModal } from '@/components/ui/vehicle-document-modal';
import { useDriverProfile } from '@/hooks/use-driver-profile';
import { driverProfileStyles as styles } from '@/styles/screens/driver-profile.styles';
import { normalizeImageUrl } from '@/utils/image-url';

export default function DriverProfileScreen() {
  const {
    driverDetail,
    vehicles,
    selectedVehicle,
    isDocModalVisible,
    isAddVehicleModalVisible,
    handleOpenDocModal,
    handleCloseDocModal,
    handleOpenAddVehicle,
    handleCloseAddVehicle,
    handleAddVehicleSuccess,
  } = useDriverProfile();

  // Presigned URLs từ backend MinIO hoặc fallback asset
  const idCardFront = driverDetail?.idCard?.front;
  const idCardBack = driverDetail?.idCard?.back;
  const licenseFront = driverDetail?.license?.front;
  const licenseBack = driverDetail?.license?.back;

  return (
    <ThemedView style={styles.container}>
      {/* 1. Header Teal với nút Back & Badge Đã duyệt */}
      <SubHeader
        title="Hồ sơ Tài xế"
        rightElement={
          <View style={styles.approvedBadgeHeader}>
            <ThemedText style={styles.approvedBadgeHeaderText}>Đã duyệt</ThemedText>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 2. Khối 1: Giấy tờ cá nhân */}
        <View style={styles.card}>
          <ThemedText style={styles.cardHeaderTitle}>Giấy tờ cá nhân</ThemedText>

          <View style={styles.documentItem}>
            <ThemedText style={styles.documentLabel}>CCCD mặt trước:</ThemedText>
            <View style={styles.documentImageBox}>
              {idCardFront ? (
                <Image
                  source={{ uri: normalizeImageUrl(idCardFront) }}
                  style={styles.documentImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.documentPlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                  <ThemedText style={styles.documentPlaceholderText}>Chưa có ảnh</ThemedText>
                </View>
              )}
            </View>
          </View>

          <View style={styles.documentItem}>
            <ThemedText style={styles.documentLabel}>CCCD mặt sau:</ThemedText>
            <View style={styles.documentImageBox}>
              {idCardBack ? (
                <Image
                  source={{ uri: normalizeImageUrl(idCardBack) }}
                  style={styles.documentImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.documentPlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                  <ThemedText style={styles.documentPlaceholderText}>Chưa có ảnh</ThemedText>
                </View>
              )}
            </View>
          </View>

          <View style={styles.documentItem}>
            <ThemedText style={styles.documentLabel}>Giấy phép lái xe mặt trước:</ThemedText>
            <View style={styles.documentImageBox}>
              {licenseFront ? (
                <Image
                  source={{ uri: normalizeImageUrl(licenseFront) }}
                  style={styles.documentImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.documentPlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                  <ThemedText style={styles.documentPlaceholderText}>Chưa có ảnh</ThemedText>
                </View>
              )}
            </View>
          </View>

          <View style={styles.documentItem}>
            <ThemedText style={styles.documentLabel}>Giấy phép lái xe mặt sau:</ThemedText>
            <View style={styles.documentImageBox}>
              {licenseBack ? (
                <Image
                  source={{ uri: normalizeImageUrl(licenseBack) }}
                  style={styles.documentImage}
                  contentFit="cover"
                  transition={200}
                />
              ) : (
                <View style={styles.documentPlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#9CA3AF" />
                  <ThemedText style={styles.documentPlaceholderText}>Chưa có ảnh</ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 3. Khối 2: Phương tiện của tôi */}
        <View style={styles.card}>
          <ThemedText style={styles.cardHeaderTitle}>Phương tiện của tôi</ThemedText>

          {/* Danh sách các xe thực tế */}
          {vehicles.length === 0 ? (
            <View style={styles.emptyVehicleContainer}>
              <Ionicons name="car-outline" size={32} color="#9CA3AF" />
              <ThemedText style={styles.emptyVehicleText}>Chưa có phương tiện nào được đăng ký</ThemedText>
            </View>
          ) : (
            vehicles.map((vehicle, index) => (
              <View key={vehicle.id || index} style={styles.vehicleCard}>
                <View style={styles.vehicleCardHeader}>
                  <ThemedText style={styles.vehicleName}>{vehicle.name || `Xe ${index + 1}`}</ThemedText>
                  {vehicle.status === 'APPROVED' ? (
                    <View style={styles.badgeApproved}>
                      <ThemedText style={styles.badgeApprovedText}>Đã duyệt</ThemedText>
                    </View>
                  ) : (
                    <View style={styles.badgePending}>
                      <ThemedText style={styles.badgePendingText}>Chờ duyệt</ThemedText>
                    </View>
                  )}
                </View>

                {/* Nút: Xem giấy tờ xe -> Mở Modal chỉ hiển thị hình ảnh giấy tờ xe & biển số */}
                <Pressable style={styles.viewDocButton} onPress={() => handleOpenDocModal(vehicle)}>
                  <ThemedText style={styles.viewDocButtonText}>Xem giấy tờ xe</ThemedText>
                </Pressable>
              </View>
            ))
          )}

          {/* Nút: + Thêm phương tiện mới */}
          <Pressable style={styles.addVehicleButton} onPress={handleOpenAddVehicle}>
            <Ionicons name="add" size={20} color="#00B5B8" />
            <ThemedText style={styles.addVehicleButtonText}>Thêm phương tiện mới</ThemedText>
          </Pressable>
        </View>
      </ScrollView>

      {/* 4. Modal: Xem chi tiết giấy tờ xe & Biển số xe */}
      <VehicleDocumentModal
        visible={isDocModalVisible}
        vehicle={selectedVehicle}
        onClose={handleCloseDocModal}
      />

      {/* 5. Modal: Thêm phương tiện mới */}
      <AddVehicleModal
        visible={isAddVehicleModalVisible}
        onClose={handleCloseAddVehicle}
        onAddVehicleSuccess={handleAddVehicleSuccess}
      />
    </ThemedView>
  );
}
