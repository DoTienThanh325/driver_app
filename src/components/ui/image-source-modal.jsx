import { ThemedText } from '@/components/themed-text';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

export function ImageSourceModal({ visible, title, onSelectImage, onClose, useModal = true }) {
  const handleLaunchCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Cần cấp quyền truy cập máy ảnh để chụp giấy tờ.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onSelectImage(result.assets[0].uri);
        onClose();
      }
    } catch (err) {
      console.warn('Lỗi khi mở camera:', err);
    }
  };

  const handleLaunchGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Cần cấp quyền truy cập thư viện để chọn ảnh.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onSelectImage(result.assets[0].uri);
        onClose();
      }
    } catch (err) {
      console.warn('Lỗi khi mở thư viện ảnh:', err);
    }
  };

  if (!visible) return null;

  const content = (
    <View style={useModal ? styles.overlay : styles.overlayAbsolute}>
      {/* Nền tối phía sau - chạm vào nền tối để đóng */}
      <Pressable style={styles.backdropPressable} onPress={onClose} />

      {/* Sheet nội dung nổi ở dưới cùng */}
      <View style={styles.sheetContainer}>
        <View style={styles.indicator} />

        <ThemedText style={styles.title}>
          {title ? `Thay đổi ${title}` : 'Chọn ảnh giấy tờ'}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Vui lòng chọn ảnh chụp rõ nét, không bị lóa sáng hay mất góc
        </ThemedText>

        <View style={styles.optionsList}>
          <Pressable style={styles.optionItem} onPress={handleLaunchCamera}>
            <View style={[styles.iconBox, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="camera" size={22} color="#0284C7" />
            </View>
            <View style={styles.optionTextWrap}>
              <ThemedText style={styles.optionTitle}>Chụp ảnh mới</ThemedText>
              <ThemedText style={styles.optionDesc}>Sử dụng máy ảnh để chụp trực tiếp</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>

          <Pressable style={styles.optionItem} onPress={handleLaunchGallery}>
            <View style={[styles.iconBox, { backgroundColor: '#E6F8F8' }]}>
              <Ionicons name="images" size={22} color="#00B5B8" />
            </View>
            <View style={styles.optionTextWrap}>
              <ThemedText style={styles.optionTitle}>Chọn từ thư viện</ThemedText>
              <ThemedText style={styles.optionDesc}>Chọn ảnh có sẵn trong album điện thoại</ThemedText>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>
        </View>

        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <ThemedText style={styles.cancelText}>Hủy bỏ</ThemedText>
        </Pressable>
      </View>
    </View>
  );

  if (!useModal) {
    return content;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  overlayAbsolute: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
    zIndex: 99999,
    elevation: 99999,
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    zIndex: 10,
    elevation: 10,
  },
  indicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionsList: {
    gap: 12,
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: 12,
    color: '#6B7280',
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4B5563',
  },
});
