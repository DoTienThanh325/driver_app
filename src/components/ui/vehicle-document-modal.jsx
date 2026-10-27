import { ThemedText } from '@/components/themed-text';
import { ImageSourceModal } from '@/components/ui/image-source-modal';
import { ZoomableImageModal } from '@/components/ui/zoomable-image-modal';
import { driverService } from '@/services/driver.service';
import { processImageForUpload } from '@/utils/image-processor';
import { normalizeImageUrl } from '@/utils/image-url';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
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

export function VehicleDocumentModal({ visible, vehicle, onClose, onUpdated }) {
  const [zoomImage, setZoomImage] = useState({
    visible: false,
    imageUrl: null,
    title: '',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [vehicleDraft, setVehicleDraft] = useState({
    registrationFront: null,
    plate: null,
  });

  const [pickerModal, setPickerModal] = useState({
    visible: false,
    fieldKey: null,
    title: '',
  });

  if (!vehicle) return null;

  const isCar = vehicle.vehicleType === 'CAR';
  const vehicleTypeLabel = isCar ? 'xe ô tô' : 'xe máy';
  const vehicleIcon = isCar ? '🚗' : '🛵';

  const rawReg =
    vehicle.registrationFrontUrl ||
    vehicle.registrationFront ||
    vehicle.registrationFrontImgUrl;
  const regFrontUrl = rawReg ? normalizeImageUrl(rawReg) : null;

  const rawPlate =
    vehicle.plateImgUrl ||
    vehicle.plate ||
    vehicle.plateUrl;
  const plateUrl = rawPlate ? normalizeImageUrl(rawPlate) : null;

  const handleZoom = (url, title) => {
    if (url) {
      setZoomImage({
        visible: true,
        imageUrl: url,
        title,
      });
    }
  };

  const handleCloseZoom = () => {
    setZoomImage({
      visible: false,
      imageUrl: null,
      title: '',
    });
  };

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

  const handleSelectImage = async (uri) => {
    const targetKey = pickerModal.fieldKey;
    handleClosePicker();

    if (targetKey && uri) {
      try {
        const processed = await processImageForUpload(uri, targetKey);
        setVehicleDraft((prev) => ({
          ...prev,
          [targetKey]: processed ? processed.uri : uri,
        }));
      } catch (err) {
        setVehicleDraft((prev) => ({
          ...prev,
          [targetKey]: uri,
        }));
      }
    }
  };

  const handleRemoveDraft = (fieldKey) => {
    setVehicleDraft((prev) => ({
      ...prev,
      [fieldKey]: null,
    }));
  };

  const handleCancelEdit = () => {
    const hasChanges = Boolean(vehicleDraft.registrationFront || vehicleDraft.plate);
    if (hasChanges) {
      Alert.alert(
        'Hủy thay đổi',
        'Bạn có chắc chắn muốn hủy các ảnh phương tiện vừa chọn không?',
        [
          { text: 'Tiếp tục sửa', style: 'cancel' },
          {
            text: 'Hủy bỏ',
            style: 'destructive',
            onPress: () => {
              setVehicleDraft({ registrationFront: null, plate: null });
              setIsEditing(false);
            },
          },
        ]
      );
    } else {
      setIsEditing(false);
    }
  };

  const handleCloseModal = () => {
    const hasChanges = Boolean(vehicleDraft.registrationFront || vehicleDraft.plate);
    if (isEditing && hasChanges) {
      Alert.alert(
        'Đóng cửa sổ',
        'Các ảnh phương tiện bạn vừa chọn sẽ không được lưu. Bạn có muốn thoát?',
        [
          { text: 'Ở lại', style: 'cancel' },
          {
            text: 'Thoát',
            style: 'destructive',
            onPress: () => {
              setVehicleDraft({ registrationFront: null, plate: null });
              setIsEditing(false);
              onClose();
            },
          },
        ]
      );
    } else {
      setVehicleDraft({ registrationFront: null, plate: null });
      setIsEditing(false);
      onClose();
    }
  };

  const handleSaveVehicleImages = async () => {
    const hasChanges = Boolean(vehicleDraft.registrationFront || vehicleDraft.plate);
    if (!hasChanges) {
      Alert.alert('Chưa có thay đổi', 'Bạn chưa chọn ảnh giấy tờ mới nào.');
      setIsEditing(false);
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

      if (vehicleDraft.registrationFront) {
        compressTasks.push(appendField('registrationFront', vehicleDraft.registrationFront));
      }
      if (vehicleDraft.plate) {
        compressTasks.push(appendField('plate', vehicleDraft.plate));
      }

      await Promise.all(compressTasks);

      // Gọi cùng API PATCH /api/drivers/registration như các ảnh cá nhân
      await driverService.updateRegistration(formData);

      Alert.alert(
        'Cập nhật thành công',
        'Ảnh giấy tờ xe mới đã được lưu và gửi tới quản trị viên để xét duyệt lại.',
        [
          {
            text: 'Đồng ý',
            onPress: async () => {
              setIsEditing(false);
              setVehicleDraft({ registrationFront: null, plate: null });
              if (onUpdated) {
                await onUpdated();
              }
              onClose();
            },
          },
        ]
      );
    } catch (err) {
      const msg = err.message || 'Cập nhật ảnh giấy tờ xe thất bại. Vui lòng thử lại.';
      Alert.alert('Lỗi cập nhật', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const renderDocCard = (fieldKey, originalUrl, title, placeholderIcon, placeholderText) => {
    const isDraft = Boolean(vehicleDraft[fieldKey]);
    const displayUri = isDraft ? vehicleDraft[fieldKey] : originalUrl;

    const handlePress = () => {
      if (isEditing) {
        handleOpenPicker(fieldKey, title);
      } else {
        handleZoom(displayUri, title);
      }
    };

    return (
      <View style={styles.imageSection}>
        <View style={styles.imageHeaderRow}>
          <ThemedText style={styles.imageLabel}>
            {title} {isEditing ? '(chạm để thay đổi)' : '(chạm để phóng to)'}:
          </ThemedText>
          {isDraft && (
            <Pressable
              style={styles.revertBtn}
              onPress={() => handleRemoveDraft(fieldKey)}
              hitSlop={6}
            >
              <Ionicons name="trash-outline" size={13} color="#EF4444" />
              <ThemedText style={styles.revertBtnText}>Hủy ảnh mới</ThemedText>
            </Pressable>
          )}
        </View>

        <Pressable
          style={[
            styles.imageBox,
            isEditing && styles.imageBoxEditable,
            isDraft && styles.imageBoxDraft,
          ]}
          onPress={handlePress}
          disabled={!isEditing && !displayUri}
        >
          {displayUri ? (
            <>
              <Image
                source={{ uri: displayUri }}
                style={styles.docImage}
                contentFit="cover"
                transition={200}
              />
              {!isEditing && (
                <View style={styles.zoomHintIcon}>
                  <Ionicons name="expand" size={16} color="#FFFFFF" />
                </View>
              )}
              {isEditing && (
                <View style={styles.editOverlayHint}>
                  <Ionicons name="camera" size={18} color="#FFFFFF" />
                  <ThemedText style={styles.editOverlayText}>Chạm để đổi</ThemedText>
                </View>
              )}
              {isDraft && (
                <View style={styles.draftBadge}>
                  <Ionicons name="sparkles" size={12} color="#FFFFFF" />
                  <ThemedText style={styles.draftBadgeText}>Mới chọn</ThemedText>
                </View>
              )}
            </>
          ) : (
            <View style={styles.placeholderBox}>
              <Ionicons
                name={placeholderIcon}
                size={28}
                color={isEditing ? '#00B5B8' : '#9CA3AF'}
              />
              <ThemedText
                style={[
                  styles.placeholderText,
                  isEditing && { color: '#00B5B8', fontWeight: '600' },
                ]}
              >
                {isEditing ? `+ Chạm để thêm ${title}` : placeholderText}
              </ThemedText>
            </View>
          )}
        </Pressable>
      </View>
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCloseModal}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContainer}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={styles.headerTitleWrap}>
                <ThemedText style={styles.modalTitle}>
                  {isEditing
                    ? `Chỉnh sửa giấy tờ ${vehicleTypeLabel}`
                    : `${vehicleIcon} Giấy tờ ${vehicleTypeLabel}`}
                </ThemedText>
                <ThemedText style={styles.modalSubtitle} numberOfLines={1}>
                  {isEditing
                    ? 'Chạm vào ảnh để chụp hoặc chọn ảnh mới'
                    : `Hình ảnh đăng ký ${vehicleTypeLabel} và biển số thực tế`}
                </ThemedText>
              </View>

              <View style={styles.headerRightActions}>
                {!isEditing ? (
                  <>
                    <Pressable
                      style={styles.editHeaderBtn}
                      onPress={() => setIsEditing(true)}
                      hitSlop={6}
                    >
                      <Ionicons name="create-outline" size={15} color="#00B5B8" />
                      <ThemedText style={styles.editHeaderBtnText}>Sửa</ThemedText>
                    </Pressable>

                    <Pressable
                      style={styles.closeIconButton}
                      onPress={handleCloseModal}
                      hitSlop={10}
                    >
                      <Ionicons name="close" size={20} color="#4B5563" />
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Pressable
                      style={styles.cancelHeaderBtn}
                      onPress={handleCancelEdit}
                      hitSlop={6}
                      disabled={isSaving}
                    >
                      <ThemedText style={styles.cancelHeaderBtnText}>Hủy</ThemedText>
                    </Pressable>

                    <Pressable
                      style={styles.saveHeaderBtn}
                      onPress={handleSaveVehicleImages}
                      hitSlop={6}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#00B5B8" />
                      ) : (
                        <>
                          <Ionicons name="cloud-upload-outline" size={15} color="#00B5B8" />
                          <ThemedText style={styles.saveHeaderBtnText}>Lưu</ThemedText>
                        </>
                      )}
                    </Pressable>
                  </>
                )}
              </View>
            </View>

            {/* Banner hướng dẫn khi ở chế độ chỉnh sửa */}
            {isEditing && (
              <View style={styles.editNoticeBanner}>
                <Ionicons name="information-circle" size={18} color="#00B5B8" />
                <ThemedText style={styles.editNoticeText}>
                  Chạm vào ảnh đăng ký hoặc biển số xe để chụp hoặc chọn ảnh mới.
                </ThemedText>
              </View>
            )}

            {/* Body */}
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* 1. Giấy đăng ký xe (Cà vẹt) */}
              {renderDocCard(
                'registrationFront',
                regFrontUrl,
                'Giấy đăng ký xe',
                'document-text-outline',
                'Chưa có ảnh đăng ký xe'
              )}

              {/* 2. Ảnh chụp biển số xe */}
              {renderDocCard(
                'plate',
                plateUrl,
                'Ảnh chụp biển số xe',
                'camera-outline',
                'Chưa có ảnh biển số xe'
              )}
            </ScrollView>

            {/* Footer buttons */}
            {!isEditing ? (
              <Pressable style={styles.closeButton} onPress={handleCloseModal}>
                <ThemedText style={styles.closeButtonText}>Đóng</ThemedText>
              </Pressable>
            ) : (
              <View style={styles.footerActionRow}>
                <Pressable
                  style={styles.footerCancelBtn}
                  onPress={handleCancelEdit}
                  disabled={isSaving}
                >
                  <ThemedText style={styles.footerCancelBtnText}>Hủy chỉnh sửa</ThemedText>
                </Pressable>

                <Pressable
                  style={[styles.footerSaveBtn, isSaving && { opacity: 0.7 }]}
                  onPress={handleSaveVehicleImages}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload" size={16} color="#FFFFFF" />
                      <ThemedText style={styles.footerSaveBtnText}>Lưu thay đổi</ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          {/* Modal Zoom xe đặt bên trong modalBackdrop (phủ trọn 100% màn hình đè lên sheet hiện tại) */}
          {zoomImage.visible && (
            <ZoomableImageModal
              visible={zoomImage.visible}
              imageUrl={zoomImage.imageUrl}
              title={zoomImage.title}
              onClose={handleCloseZoom}
              useModal={false}
            />
          )}

          {/* Modal Chọn nguồn ảnh (Camera / Thư viện) với useModal={false} tránh xung đột Modal lồng nhau trên iOS */}
          {pickerModal.visible && (
            <ImageSourceModal
              visible={pickerModal.visible}
              title={pickerModal.title}
              onSelectImage={handleSelectImage}
              onClose={handleClosePicker}
              useModal={false}
            />
          )}

          {/* Overlay loading khi đang lưu và gửi ảnh */}
          {isSaving && (
            <View style={styles.loadingBackdrop}>
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#00B5B8" />
                <ThemedText style={styles.loadingText}>Đang cập nhật ảnh lên hệ thống...</ThemedText>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </>
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
    paddingTop: 16,
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
  headerTitleWrap: {
    flex: 1,
    marginRight: 10,
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
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F8F8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editHeaderBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00B5B8',
  },
  cancelHeaderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelHeaderBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  saveHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#E6F8F8',
    borderWidth: 1,
    borderColor: '#00B5B8',
  },
  saveHeaderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00B5B8',
  },
  closeIconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  editNoticeText: {
    fontSize: 12,
    color: '#0D9488',
    flex: 1,
    lineHeight: 16,
  },
  modalBody: {
    flexShrink: 1,
    marginVertical: 10,
  },
  imageSection: {
    marginBottom: 14,
  },
  imageHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  imageLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  revertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  revertBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  imageBox: {
    height: 150,
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  imageBoxEditable: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#00B5B8',
  },
  imageBoxDraft: {
    borderColor: '#10B981',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  docImage: {
    width: '100%',
    height: '100%',
  },
  zoomHintIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editOverlayHint: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  editOverlayText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  draftBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10B981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  draftBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
  },
  placeholderText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },
  footerActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  footerCancelBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  footerSaveBtn: {
    flex: 1.5,
    height: 48,
    backgroundColor: '#00B5B8',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerSaveBtnText: {
    fontSize: 14,
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
