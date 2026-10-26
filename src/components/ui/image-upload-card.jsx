import React from 'react';
import { View, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { ThemedText } from '@/components/themed-text';

export function ImageUploadCard({ label, imageUri, onImageSelected, onImageRemoved, isRequired = true }) {
  const [loading, setLoading] = React.useState(false);

  const handlePickImage = async () => {
    try {
      setLoading(true);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        onImageSelected(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Lỗi chọn ảnh:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ThemedText style={styles.label}>
        {label}
        {isRequired && <ThemedText style={styles.requiredMark}> *</ThemedText>}
      </ThemedText>

      {imageUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
          <Pressable style={styles.removeButton} onPress={onImageRemoved} hitSlop={8}>
            <Ionicons name="close-circle" size={24} color="#EF4444" />
          </Pressable>
          <Pressable style={styles.changeOverlay} onPress={handlePickImage}>
            <ThemedText style={styles.changeText}>Thay đổi ảnh</ThemedText>
          </Pressable>
        </View>
      ) : (
        <Pressable
          style={styles.dashedBox}
          onPress={handlePickImage}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#00B5B8" />
          ) : (
            <>
              <Ionicons name="image-outline" size={32} color="#9CA3AF" style={styles.uploadIcon} />
              <ThemedText style={styles.placeholderText}>Nhấn để tải ảnh lên</ThemedText>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  requiredMark: {
    color: '#EF4444',
  },
  dashedBox: {
    height: 120,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D1D5DB',
    borderRadius: 14,
    backgroundColor: '#FAFAFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIcon: {
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  previewContainer: {
    height: 140,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  changeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingVertical: 5,
    alignItems: 'center',
  },
  changeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});
