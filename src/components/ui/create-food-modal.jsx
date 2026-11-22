import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { processImageForUpload } from '@/utils/image-processor';
import { foodService } from '@/services/food.service';
import { getUserErrorMessage } from '@/utils/error-message';
import { restaurantTabStyles as styles } from '@/styles/screens/restaurant-tab.styles';

const initialOptions = [{ id: 0, size: 'Phần tiêu chuẩn', price: '', imageUri: null }];

export function CreateFoodModal({ visible, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [options, setOptions] = useState(initialOptions);
  const nextOptionId = useRef(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickImage = async (optionId) => {
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để tải ảnh món ăn.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        handleUpdateOption(optionId, 'imageUri', result.assets[0].uri);
      }
    } catch {
      Alert.alert('Thông báo', 'Không thể mở thư viện ảnh lúc này.');
    }
  };

  const handleAddOption = () => {
    const id = nextOptionId.current++;
    setOptions((prev) => [...prev, { id, size: '', price: '', imageUri: null }]);
  };

  const handleRemoveOption = (id) => {
    setOptions((prev) => prev.length > 1 ? prev.filter((option) => option.id !== id) : prev);
  };

  const handleUpdateOption = (id, field, value) => {
    setOptions((prev) => prev.map((option) => (
      option.id === id ? { ...option, [field]: value } : option
    )));
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tên món ăn.');
      return;
    }

    for (const opt of options) {
      if (!opt.size.trim()) {
        Alert.alert('Thiếu thông tin', 'Vui lòng điền tên loại / size cho tất cả các phân loại.');
        return;
      }
      const numPrice = Number(opt.price);
      if (!Number.isFinite(numPrice) || numPrice <= 0) {
        Alert.alert('Giá không hợp lệ', `Vui lòng nhập giá hợp lệ cho loại "${opt.size}".`);
        return;
      }
      if (!opt.imageUri) {
        Alert.alert('Thiếu ảnh', `Vui lòng chọn ảnh cho size "${opt.size.trim()}".`);
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const formData = new FormData();
      const foodPayload = {
        name: trimmedName,
        options: options.map((opt) => ({
          size: opt.size.trim(),
          price: Number(opt.price),
        })),
      };

      const foodJson = JSON.stringify(foodPayload);
      if (Platform.OS === 'web') {
        formData.append('food', new Blob([foodJson], { type: 'application/json' }));
      } else {
        formData.append('food', { string: foodJson, type: 'application/json' });
      }

      // Backend ghép từng ảnh với size ở cùng vị trí trong danh sách.
      for (const [index, option] of options.entries()) {
        const image = await processImageForUpload(option.imageUri, `food_opt_${index + 1}`);
        if (Platform.OS === 'web') {
          const response = await fetch(image.uri);
          if (!response.ok) {
            throw new Error(`Không thể đọc ảnh của size "${option.size.trim()}". Vui lòng chọn lại ảnh.`);
          }
          formData.append('images', await response.blob(), image.name);
        } else {
          formData.append('images', image);
        }
      }

      await foodService.createFood(formData);

      Alert.alert('Thành công', `Đã thêm món "${trimmedName}" vào thực đơn quán!`);
      setName('');
      setOptions(initialOptions);
      onSuccess?.();
      onClose();
    } catch (err) {
      Alert.alert('Không thể thêm món', getUserErrorMessage(err, 'Không thể thêm món ăn. Vui lòng thử lại.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Header Modal */}
          <View style={styles.modalHeaderRow}>
            <Text style={styles.modalTitle}>Thêm món ăn mới</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} disabled={isSubmitting}>
              <Ionicons name="close" size={18} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* 1. Tên món ăn */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>
                Tên món ăn <Text style={{ color: '#EF4444' }}>*</Text>
              </Text>
              <TextInput
                style={styles.formInput}
                placeholder="VD: Phở Bò Tái Nạm, Bún Chả..."
                placeholderTextColor="#9CA3AF"
                value={name}
                editable={!isSubmitting}
                onChangeText={setName}
              />
            </View>

            <View style={styles.formGroup}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={styles.formLabel}>
                  Các size <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 8,
                  }}
                  onPress={handleAddOption}
                  disabled={isSubmitting}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#1F2937' }}>+ Thêm size</Text>
                </TouchableOpacity>
              </View>

              {options.map((opt, index) => (
                <View key={opt.id} style={styles.foodOptionCard}>
                  <View style={styles.foodOptionInputs}>
                    <TextInput
                      style={[styles.formInput, { flex: 1.2 }]}
                      accessibilityLabel={`Tên size ${index + 1}`}
                      placeholder="Tên size"
                      placeholderTextColor="#9CA3AF"
                      value={opt.size}
                      editable={!isSubmitting}
                      onChangeText={(value) => handleUpdateOption(opt.id, 'size', value)}
                    />
                    <TextInput
                      style={[styles.formInput, { flex: 1 }]}
                      accessibilityLabel={`Giá size ${index + 1}`}
                      placeholder="Giá"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="numeric"
                      value={opt.price}
                      editable={!isSubmitting}
                      onChangeText={(value) => handleUpdateOption(opt.id, 'price', value)}
                    />
                    {options.length > 1 && (
                      <TouchableOpacity
                        style={styles.foodOptionRemove}
                        accessibilityLabel={`Xóa size ${index + 1}`}
                        disabled={isSubmitting}
                        onPress={() => handleRemoveOption(opt.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.uploadImageBox}
                    accessibilityLabel={`${opt.imageUri ? 'Đổi' : 'Chọn'} ảnh cho ${opt.size.trim() || `size ${index + 1}`}`}
                    disabled={isSubmitting}
                    onPress={() => handlePickImage(opt.id)}
                  >
                    {opt.imageUri ? (
                      <Image source={{ uri: opt.imageUri }} style={styles.uploadImagePreview} contentFit="cover" />
                    ) : (
                      <View style={styles.foodOptionImagePlaceholder}>
                        <Ionicons name="camera-outline" size={24} color="#6B7280" />
                        <Text style={styles.uploadImageText}>Chọn ảnh cho size này</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Nút Submit màu trắng có viền xám theo yêu cầu */}
            <TouchableOpacity
              style={styles.submitWhiteBtn}
              activeOpacity={0.85}
              disabled={isSubmitting}
              onPress={handleSubmit}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <Text style={styles.submitWhiteBtnText}>Lưu món ăn vào thực đơn</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
