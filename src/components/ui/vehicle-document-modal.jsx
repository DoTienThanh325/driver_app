import { ThemedText } from '@/components/themed-text';
import { normalizeImageUrl } from '@/utils/image-url';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

export function VehicleDocumentModal({ visible, vehicle, onClose }) {
  if (!vehicle) return null;

  const regFrontUrl = vehicle.registrationFrontUrl
    ? normalizeImageUrl(vehicle.registrationFrontUrl)
    : null;

  const plateUrl = vehicle.plateImgUrl
    ? normalizeImageUrl(vehicle.plateImgUrl)
    : null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <ThemedText style={styles.modalTitle}>Giấy tờ xe</ThemedText>
              <ThemedText style={styles.modalSubtitle}>Hình ảnh đăng ký xe và biển số thực tế</ThemedText>
            </View>

            <Pressable style={styles.closeIconButton} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color="#4B5563" />
            </Pressable>
          </View>

          {/* Body: Chỉ hiển thị hình ảnh giấy tờ xe & biển số, không điền thông tin bừa */}
          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* 1. Giấy đăng ký xe (Cà vẹt) */}
            <View style={styles.imageSection}>
              <ThemedText style={styles.imageLabel}>Giấy đăng ký xe:</ThemedText>
              <View style={styles.imageBox}>
                {regFrontUrl ? (
                  <Image
                    source={{ uri: regFrontUrl }}
                    style={styles.docImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.placeholderBox}>
                    <Ionicons name="document-text-outline" size={28} color="#9CA3AF" />
                    <ThemedText style={styles.placeholderText}>Chưa có ảnh đăng ký xe</ThemedText>
                  </View>
                )}
              </View>
            </View>

            {/* 2. Ảnh chụp biển số xe */}
            <View style={styles.imageSection}>
              <ThemedText style={styles.imageLabel}>Ảnh chụp biển số xe:</ThemedText>
              <View style={styles.imageBox}>
                {plateUrl ? (
                  <Image
                    source={{ uri: plateUrl }}
                    style={styles.docImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={styles.placeholderBox}>
                    <Ionicons name="camera-outline" size={28} color="#9CA3AF" />
                    <ThemedText style={styles.placeholderText}>Chưa có ảnh biển số xe</ThemedText>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Button Đóng */}
          <Pressable style={styles.closeButton} onPress={onClose}>
            <ThemedText style={styles.closeButtonText}>Đóng</ThemedText>
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
    maxHeight: '85%',
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
  },
  imageSection: {
    marginBottom: 16,
  },
  imageLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },
  imageBox: {
    height: 160,
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  docImage: {
    width: '100%',
    height: '100%',
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
});
