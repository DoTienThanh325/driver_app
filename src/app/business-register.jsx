import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SubHeader } from '@/components/ui/sub-header';
import { HanoiMapPicker } from '@/components/ui/hanoi-map-picker';
import { ZoomableImageModal } from '@/components/ui/zoomable-image-modal';
import { ImageSourceModal } from '@/components/ui/image-source-modal';
import { useBusinessRegistration } from '@/hooks/use-business-registration';
import { businessRegisterStyles as styles } from '@/styles/screens/business-register.styles';

export default function BusinessRegisterScreen() {
  const {
    mapRef,
    restaurantName,
    setRestaurantName,
    restaurantAddress,
    setRestaurantAddress,
    locationCoords,
    handleLocationChange,
    handleAddressResolved,
    handleSearchAddress,
    isSearchingAddress,
    licenseImages,
    handleAddImage,
    handleRemoveImage,
    isPickerModalVisible,
    setPickerModalVisible,
    zoomImage,
    setZoomImage,
    isSubmitting,
    submitRegistration,
  } = useBusinessRegistration();

  const handleSelectNewImage = (newUri) => {
    if (newUri) {
      handleAddImage(newUri);
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* 1. Header màu chủ đạo Teal của ứng dụng */}
      <SubHeader title="Đăng ký Kinh doanh" />

      {/* 2. Form nội dung cuộn */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <ThemedText style={styles.instructionText}>
            Vui lòng điền thông tin nhà hàng tại Hà Nội và tải lên giấy phép kinh doanh hợp lệ để được xét duyệt.
          </ThemedText>

          {/* Phần 1: Thông tin cơ bản */}
          <View style={styles.sectionHeaderContainer}>
            <ThemedText style={styles.sectionHeading}>1. Thông tin cửa hàng / Quán ăn</ThemedText>
            <ThemedText style={styles.sectionSubHeading}>
              Tên cơ sở kinh doanh sẽ hiển thị cho khách hàng đặt món
            </ThemedText>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Tên nhà hàng, quán ăn: *</ThemedText>
            <TextInput
              style={styles.textInput}
              placeholder="VD: Phở Bò Gia Truyền Hà Nội - CS Hoàn Kiếm"
              placeholderTextColor="#9CA3AF"
              value={restaurantName}
              onChangeText={setRestaurantName}
              editable={!isSubmitting}
            />
          </View>

          {/* Phần 2: Giấy phép kinh doanh & Minh chứng (Bỏ nhãn Lưu MinIO, hỗ trợ nhiều ảnh) */}
          <View style={styles.sectionDivider}>
            <View style={styles.sectionHeaderContainer}>
              <ThemedText style={styles.sectionHeading}>2. Giấy phép kinh doanh & Minh chứng</ThemedText>
              <ThemedText style={styles.sectionSubHeading}>
                Tải lên ảnh chụp giấy chứng nhận ĐKKD và các giấy tờ xác thực liên quan
              </ThemedText>
            </View>

            {/* Danh sách ảnh minh chứng đã chọn */}
            {licenseImages.length > 0 && (
              <View style={styles.imagesGrid}>
                {licenseImages.map((uri, index) => (
                  <View key={`${uri}_${index}`} style={styles.imageCard}>
                    <Image
                      source={{ uri }}
                      style={styles.imageThumbnail}
                      contentFit="cover"
                      transition={200}
                    />
                    <View style={styles.imageToolbar}>
                      <Pressable
                        style={styles.imageActionButton}
                        onPress={() =>
                          setZoomImage({
                            uri,
                            title: `Minh chứng #${index + 1}`,
                          })
                        }
                      >
                        <Ionicons name="eye-outline" size={14} color="#4B5563" />
                        <ThemedText style={styles.imageActionText}>Xem</ThemedText>
                      </Pressable>

                      <Pressable
                        style={styles.imageActionButton}
                        onPress={() => handleRemoveImage(index)}
                        disabled={isSubmitting}
                      >
                        <Ionicons name="trash-outline" size={14} color="#EF4444" />
                        <ThemedText style={styles.imageDeleteText}>Xóa</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Nút thêm minh chứng */}
            <Pressable
              style={styles.addProofButton}
              onPress={() => setPickerModalVisible(true)}
              disabled={isSubmitting}
            >
              <Ionicons name="add-circle-outline" size={20} color="#00B5B8" />
              <ThemedText style={styles.addProofText}>
                {licenseImages.length === 0 ? 'Tải lên ảnh minh chứng *' : '➕ Thêm minh chứng khác'}
              </ThemedText>
            </Pressable>

            <ThemedText style={styles.proofHelperText}>
              💡 Định dạng: JPG, PNG. Có thể tải lên nhiều hình ảnh minh chứng rõ nét (GPKD, giấy VSATTP, ảnh mặt bằng cửa hàng).
            </ThemedText>
          </View>

          {/* Phần 3: Địa chỉ & Vị trí cửa hàng tại Hà Nội */}
          <View style={styles.sectionDivider}>
            <View style={styles.sectionHeaderContainer}>
              <ThemedText style={styles.sectionHeading}>3. Địa chỉ & Vị trí cửa hàng (Hà Nội)</ThemedText>
              <ThemedText style={styles.sectionSubHeading}>
                Nhập địa chỉ và xác định vị trí của quán trên bản đồ Hà Nội
              </ThemedText>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Địa chỉ hiển thị: *</ThemedText>
              <TextInput
                style={styles.textInput}
                placeholder="Địa chỉ sẽ tự động hiển thị khi bạn chọn trên bản đồ"
                placeholderTextColor="#9CA3AF"
                value={restaurantAddress}
                onChangeText={setRestaurantAddress}
                editable={!isSubmitting}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Vị trí quán trên bản đồ Hà Nội: *</ThemedText>
              
              {/* Bản đồ nhúng Leaflet Google Tiles Hà Nội với kích thước to, Fullscreen & Zoom +/- */}
              <HanoiMapPicker
                ref={mapRef}
                onLocationChange={handleLocationChange}
                onAddressResolved={handleAddressResolved}
                initialCoords={locationCoords}
                currentAddress={restaurantAddress}
              />

              <View style={styles.mapStatusBadge}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <ThemedText style={styles.mapStatusText}>
                  Đã xác định vị trí cửa hàng tại Hà Nội
                </ThemedText>
              </View>
            </View>
          </View>

          {/* Nút gửi hồ sơ đăng ký */}
          <Pressable
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={submitRegistration}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.submitButtonText}>GỬI HỒ SƠ ĐĂNG KÝ</ThemedText>
            )}
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal chọn nguồn ảnh (Camera hoặc Thư viện) */}
      <ImageSourceModal
        visible={isPickerModalVisible}
        title="Thêm ảnh minh chứng kinh doanh"
        onSelectImage={handleSelectNewImage}
        onClose={() => setPickerModalVisible(false)}
      />

      {/* Modal xem ảnh phóng to */}
      <ZoomableImageModal
        visible={Boolean(zoomImage)}
        imageUri={zoomImage?.uri}
        title={zoomImage?.title || 'Ảnh minh chứng'}
        onClose={() => setZoomImage(null)}
      />
    </ThemedView>
  );
}
