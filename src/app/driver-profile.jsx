import React from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Modal } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SubHeader } from '@/components/ui/sub-header';
import { AddVehicleModal } from '@/components/ui/add-vehicle-modal';
import { VehicleDocumentModal } from '@/components/ui/vehicle-document-modal';
import { ZoomableImageModal } from '@/components/ui/zoomable-image-modal';
import { ImageSourceModal } from '@/components/ui/image-source-modal';
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
    hasMotorbikeLicense,
    hasCarLicense,
    fetchProfile,
    isLoading,
    isSaving,
    isEditMode,
    draftImages,
    zoomImage,
    pickerModal,
    handleToggleEditMode,
    handleCancelEdit,
    handleSaveProfileImages,
    handleImagePress,
    handleCloseZoom,
    handleClosePicker,
    handleSelectImage,
    handleRemoveDraftImage,
    handleOpenDocModal,
    handleCloseDocModal,
    handleOpenAddVehicle,
    handleCloseAddVehicle,
    handleAddVehicleSuccess,
  } = useDriverProfile();

  // Presigned URLs từ hệ thống hoặc fallback asset
  const idCardFront = driverDetail?.idCard?.front;
  const idCardBack = driverDetail?.idCard?.back;

  const mbLicenseFront = driverDetail?.licenseMotorbike?.front;
  const mbLicenseBack = driverDetail?.licenseMotorbike?.back;
  const carLicenseFront = driverDetail?.licenseCar?.front;
  const carLicenseBack = driverDetail?.licenseCar?.back;
  const generalLicenseFront = driverDetail?.license?.front;
  const generalLicenseBack = driverDetail?.license?.back;

  const hasMotorbike = vehicles.some((v) => v.vehicleType === 'MOTORBIKE');
  const hasCar = vehicles.some((v) => v.vehicleType === 'CAR');

  const showBothLicenses =
    (hasMotorbike && hasCar) ||
    (Boolean(mbLicenseFront) && Boolean(carLicenseFront));

  const showCarOnly =
    (hasCar && !hasMotorbike) ||
    (Boolean(carLicenseFront) && !hasMotorbike && !mbLicenseFront);

  // Render từng thẻ hình ảnh giấy tờ
  const renderDocumentBox = (fieldKey, originalUrl, title) => {
    const isDraft = Boolean(draftImages[fieldKey]);
    const displayUri = isDraft
      ? draftImages[fieldKey]
      : originalUrl
      ? normalizeImageUrl(originalUrl)
      : null;

    return (
      <View style={styles.documentItem} key={fieldKey}>
        <View style={styles.documentLabelRow}>
          <ThemedText style={styles.documentLabel}>{title}:</ThemedText>
          {isDraft && (
            <View style={styles.draftBadge}>
              <Ionicons name="checkmark-circle" size={13} color="#FFFFFF" />
              <ThemedText style={styles.draftBadgeText}>Mới chọn</ThemedText>
            </View>
          )}
        </View>

        <Pressable
          style={[
            styles.documentImageBox,
            isEditMode && styles.documentImageBoxEditable,
          ]}
          onPress={() => handleImagePress(fieldKey, displayUri, title)}
          disabled={isSaving}
        >
          {displayUri ? (
            <Image
              source={{ uri: displayUri }}
              style={styles.documentImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.documentPlaceholder}>
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
              <ThemedText style={styles.documentPlaceholderText}>
                {isEditMode ? 'Chạm để tải ảnh lên' : 'Chưa có ảnh'}
              </ThemedText>
            </View>
          )}

          {/* Lớp phủ trực quan khi ở Chế độ Chỉnh sửa */}
          {isEditMode && (
            <View style={styles.editOverlay}>
              <Ionicons name="camera-reverse" size={26} color="#FFFFFF" />
              <ThemedText style={styles.editOverlayText}>
                {displayUri ? 'Chạm để thay đổi' : 'Chạm để chọn ảnh'}
              </ThemedText>
            </View>
          )}

          {/* Nút hủy bỏ riêng ảnh vừa chọn nháp */}
          {isEditMode && isDraft && (
            <Pressable
              style={styles.removeDraftBtn}
              onPress={() => handleRemoveDraftImage(fieldKey)}
              hitSlop={8}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </Pressable>
          )}

          {/* Icon gợi ý xem phóng to khi ở chế độ thường */}
          {!isEditMode && displayUri && (
            <View style={styles.zoomIndicatorIcon}>
              <Ionicons name="expand" size={16} color="#FFFFFF" />
            </View>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* 1. SubHeader: Tích hợp nút Chỉnh sửa / Hủy / Lưu */}
      <SubHeader
        title="Hồ sơ Tài xế"
        rightElement={
          <View style={styles.headerActions}>
            {!isEditMode ? (
              <>
                <View style={styles.approvedBadgeHeader}>
                  <ThemedText style={styles.approvedBadgeHeaderText}>
                    {driverDetail?.verificationStatus === 'PENDING' ? 'Chờ duyệt' : 'Đã duyệt'}
                  </ThemedText>
                </View>

                <Pressable
                  style={styles.editToggleBtn}
                  onPress={handleToggleEditMode}
                  hitSlop={6}
                >
                  <Ionicons name="create-outline" size={16} color="#00B5B8" />
                  <ThemedText style={styles.editToggleBtnText}>Sửa</ThemedText>
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  style={styles.cancelHeaderBtn}
                  onPress={handleToggleEditMode}
                  hitSlop={6}
                  disabled={isSaving}
                >
                  <ThemedText style={styles.cancelHeaderBtnText}>Hủy</ThemedText>
                </Pressable>

                <Pressable
                  style={styles.saveHeaderBtn}
                  onPress={handleSaveProfileImages}
                  hitSlop={6}
                  disabled={isSaving}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color="#00B5B8" />
                  <ThemedText style={styles.saveHeaderBtnText}>Lưu</ThemedText>
                </Pressable>
              </>
            )}
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner thông báo chế độ chỉnh sửa */}
        {isEditMode && (
          <View style={styles.editNoticeBanner}>
            <Ionicons name="information-circle" size={20} color="#00B5B8" />
            <ThemedText style={styles.editNoticeText}>
              Đang ở chế độ chỉnh sửa. Chạm vào bất kỳ ảnh nào để chụp hoặc chọn ảnh mới từ thư viện.
            </ThemedText>
          </View>
        )}

        {/* 2. Khối 1: Giấy tờ cá nhân */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <ThemedText style={styles.cardHeaderTitle}>Giấy tờ cá nhân</ThemedText>
            {isEditMode && (
              <ThemedText style={{ fontSize: 11, color: '#00B5B8', fontWeight: '600' }}>
                Chế độ chỉnh sửa
              </ThemedText>
            )}
          </View>

          {renderDocumentBox('idCardFront', idCardFront, 'CCCD mặt trước')}
          {renderDocumentBox('idCardBack', idCardBack, 'CCCD mặt sau')}

          {showBothLicenses ? (
            <>
              <View style={styles.licenseSectionDivider} />
              <ThemedText style={styles.licenseSectionHeader}>
                🛵 Giấy phép lái xe máy (Hạng A1/A2)
              </ThemedText>
              {renderDocumentBox(
                'driverLicenseMotorbikeFront',
                mbLicenseFront || generalLicenseFront,
                'GPLX xe máy mặt trước'
              )}
              {renderDocumentBox(
                'driverLicenseMotorbikeBack',
                mbLicenseBack || generalLicenseBack,
                'GPLX xe máy mặt sau'
              )}

              <View style={styles.licenseSectionDivider} />
              <ThemedText style={styles.licenseSectionHeader}>
                🚗 Giấy phép lái xe ô tô (Hạng B1/B2/C...)
              </ThemedText>
              {renderDocumentBox(
                'driverLicenseCarFront',
                carLicenseFront,
                'GPLX ô tô mặt trước'
              )}
              {renderDocumentBox(
                'driverLicenseCarBack',
                carLicenseBack,
                'GPLX ô tô mặt sau'
              )}
            </>
          ) : showCarOnly ? (
            <>
              <View style={styles.licenseSectionDivider} />
              <ThemedText style={styles.licenseSectionHeader}>
                🚗 Giấy phép lái xe ô tô
              </ThemedText>
              {renderDocumentBox(
                'driverLicenseCarFront',
                carLicenseFront || generalLicenseFront,
                'GPLX ô tô mặt trước'
              )}
              {renderDocumentBox(
                'driverLicenseCarBack',
                carLicenseBack || generalLicenseBack,
                'GPLX ô tô mặt sau'
              )}
            </>
          ) : (
            <>
              <View style={styles.licenseSectionDivider} />
              <ThemedText style={styles.licenseSectionHeader}>
                🛵 Giấy phép lái xe máy
              </ThemedText>
              {renderDocumentBox(
                'driverLicenseMotorbikeFront',
                mbLicenseFront || generalLicenseFront,
                'GPLX xe máy mặt trước'
              )}
              {renderDocumentBox(
                'driverLicenseMotorbikeBack',
                mbLicenseBack || generalLicenseBack,
                'GPLX xe máy mặt sau'
              )}
            </>
          )}
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
            vehicles.map((vehicle, index) => {
              const isCar = vehicle.vehicleType === 'CAR';
              const typeIcon = isCar ? '🚗' : '🛵';
              const typeLabel = isCar ? 'Loại: Ô tô 4 - 7 chỗ' : 'Loại: Xe máy (2 bánh)';
              const vehicleDisplayName = vehicle.name || (isCar ? `Ô tô ${index + 1}` : `Xe máy ${index + 1}`);

              return (
                <View key={vehicle.id || index} style={styles.vehicleCard}>
                  <View style={styles.vehicleCardHeader}>
                    <ThemedText style={styles.vehicleName}>
                      {typeIcon} {vehicleDisplayName}
                    </ThemedText>
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

                  <View style={styles.vehicleTypeTag}>
                    <ThemedText style={styles.vehicleTypeTagText}>{typeLabel}</ThemedText>
                  </View>

                  {/* Nút: Xem giấy tờ xe -> Mở Modal chỉ hiển thị hình ảnh giấy tờ xe & biển số */}
                  <Pressable style={styles.viewDocButton} onPress={() => handleOpenDocModal(vehicle)}>
                    <ThemedText style={styles.viewDocButtonText}>Xem giấy tờ xe</ThemedText>
                  </Pressable>
                </View>
              );
            })
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
        onUpdated={fetchProfile}
      />

      {/* 5. Modal: Thêm phương tiện mới */}
      <AddVehicleModal
        visible={isAddVehicleModalVisible}
        onClose={handleCloseAddVehicle}
        onAddVehicleSuccess={handleAddVehicleSuccess}
        hasMotorbikeLicense={hasMotorbikeLicense}
        hasCarLicense={hasCarLicense}
      />

      {/* 6. Modal: Xem ảnh phóng to (Zoom & Pan Lightbox) */}
      <ZoomableImageModal
        visible={zoomImage.visible}
        imageUrl={zoomImage.imageUrl}
        title={zoomImage.title}
        onClose={handleCloseZoom}
      />

      {/* 7. Modal: Bộ chọn nguồn ảnh (Camera / Gallery) */}
      <ImageSourceModal
        visible={pickerModal.visible}
        title={pickerModal.title}
        onSelectImage={handleSelectImage}
        onClose={handleClosePicker}
      />

      {/* 8. Overlay loading khi đang cập nhật ảnh */}
      <Modal visible={isSaving} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.loadingBackdrop}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#00B5B8" />
            <ThemedText style={styles.loadingText}>Đang cập nhật ảnh lên hệ thống...</ThemedText>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}
