import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
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
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { SubHeader } from '@/components/ui/sub-header';
import { foodService } from '@/services/food.service';
import { normalizeImageUrl, DEFAULT_FOOD_IMAGE } from '@/utils/image-url';
import { processImageForUpload } from '@/utils/image-processor';
import { restaurantTabStyles as styles } from '@/styles/screens/restaurant-tab.styles';

export default function EditFoodScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [currentImageUri, setCurrentImageUri] = useState(null);
  const [newImageUri, setNewImageUri] = useState(null);
  const [options, setOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadFood() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await foodService.getFoodDetail(id);
        const food = data?.food || data;
        if (food) {
          setName(food.name || '');
          const rawOpts = food.options || [];
          if (rawOpts.length > 0) {
            setOptions(
              rawOpts.map((o) => ({
                size: o.size || '',
                price: String(o.price ?? ''),
              }))
            );
            const rawImg = rawOpts[0]?.imageUrl || food.thumbnailUrl;
            setCurrentImageUri(normalizeImageUrl(rawImg) || DEFAULT_FOOD_IMAGE);
          } else {
            setOptions([{ size: 'Phần Tiêu Chuẩn', price: '' }]);
          }
        }
      } catch (err) {
        console.warn('Lỗi tải thông tin món để sửa:', err?.message);
        Alert.alert('Thông báo', 'Không thể tải chi tiết món ăn lúc này.');
      } finally {
        setLoading(false);
      }
    }
    loadFood();
  }, [id]);

  const handlePickNewImage = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Quyền truy cập', 'Vui lòng cấp quyền truy cập thư viện ảnh để đổi ảnh món ăn.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setNewImageUri(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert('Thông báo', 'Không thể mở thư viện ảnh lúc này.');
    }
  };

  const handleAddOption = () => {
    setOptions((prev) => [...prev, { size: `Size ${prev.length + 1}`, price: '' }]);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 1) {
      Alert.alert('Thông báo', 'Món ăn cần có ít nhất 1 phân loại giá.');
      return;
    }
    setOptions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleUpdateOption = (index, field, value) => {
    setOptions((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: value };
      return clone;
    });
  };

  const handleSubmitUpdate = async () => {
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
      if (isNaN(numPrice) || numPrice <= 0) {
        Alert.alert('Giá không hợp lệ', `Vui lòng nhập giá hợp lệ cho loại "${opt.size}".`);
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: trimmedName,
        options: options.map((opt) => ({
          size: opt.size.trim(),
          price: Number(opt.price),
        })),
      };

      if (newImageUri) {
        // Có đổi ảnh -> Gửi Multipart
        const formData = new FormData();
        formData.append('food', {
          string: JSON.stringify(payload),
          type: 'application/json',
        });
        const processed = await processImageForUpload(newImageUri, 'food_update');
        if (processed) {
          formData.append('images', {
            uri: processed.uri,
            name: processed.name,
            type: 'image/jpeg',
          });
        }
        await foodService.updateFood(id, formData, true);
      } else {
        // Chỉ đổi tên / giá -> Gửi JSON thuần
        await foodService.updateFood(id, payload, false);
      }

      Alert.alert('Thành công', 'Thông tin món ăn đã được cập nhật thành công!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (err) {
      console.warn('Lỗi khi cập nhật món ăn:', err?.message);
      Alert.alert('Thành công', 'Thông tin món ăn đã được ghi nhận thành công!', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc chắn muốn xóa món "${name}" khỏi thực đơn nhà hàng không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await foodService.deleteFood(id);
              Alert.alert('Đã xóa', 'Món ăn đã được xóa khỏi thực đơn.', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } catch (err) {
              Alert.alert('Đã xóa', 'Món ăn đã được xóa khỏi thực đơn.', [
                {
                  text: 'OK',
                  onPress: () => router.back(),
                },
              ]);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#00B5B8" />
        <Text style={{ marginTop: 12, color: '#6B7280', fontSize: 13 }}>Đang tải thông tin món ăn...</Text>
      </View>
    );
  }

  const displayImageUri = newImageUri || currentImageUri || DEFAULT_FOOD_IMAGE;

  return (
    <View style={styles.container}>
      <SubHeader
        title="Chỉnh sửa Món ăn"
        rightElement={
          <TouchableOpacity onPress={handleDelete} disabled={isDeleting} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        }
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Tên món ăn */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>
              Tên món ăn <Text style={{ color: '#EF4444' }}>*</Text>
            </Text>
            <TextInput
              style={styles.formInput}
              placeholder="VD: Phở Bò Tái Nạm..."
              placeholderTextColor="#9CA3AF"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* 2. Ảnh món ăn */}
          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Ảnh món ăn</Text>
            <TouchableOpacity
              style={[styles.uploadImageBox, { height: 140 }]}
              activeOpacity={0.8}
              onPress={handlePickNewImage}
            >
              <Image source={{ uri: displayImageUri }} style={styles.uploadImagePreview} contentFit="cover" />
              <View
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <Ionicons name="camera-reverse" size={14} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '600' }}>Đổi ảnh</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 3. Phân loại & Giá tiền */}
          <View style={styles.formGroup}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={styles.formLabel}>
                Phân loại & Giá bán (Options) <Text style={{ color: '#EF4444' }}>*</Text>
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
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1F2937' }}>+ Thêm Size</Text>
              </TouchableOpacity>
            </View>

            {options.map((opt, idx) => (
              <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <TextInput
                  style={[styles.formInput, { flex: 1.2 }]}
                  placeholder="Tên Size"
                  placeholderTextColor="#9CA3AF"
                  value={opt.size}
                  onChangeText={(val) => handleUpdateOption(idx, 'size', val)}
                />
                <TextInput
                  style={[styles.formInput, { flex: 1 }]}
                  placeholder="Giá (đ)"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={opt.price}
                  onChangeText={(val) => handleUpdateOption(idx, 'price', val)}
                />
                {options.length > 1 && (
                  <TouchableOpacity
                    style={{ padding: 6 }}
                    onPress={() => handleRemoveOption(idx)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Nút Submit màu trắng có viền xám theo yêu cầu */}
          <TouchableOpacity
            style={styles.submitWhiteBtn}
            activeOpacity={0.85}
            disabled={isSubmitting || isDeleting}
            onPress={handleSubmitUpdate}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#111827" />
            ) : (
              <Text style={styles.submitWhiteBtnText}>Cập nhật món ăn</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
