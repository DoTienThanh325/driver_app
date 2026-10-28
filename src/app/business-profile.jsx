import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SubHeader } from '@/components/ui/sub-header';
import { ZoomableImageModal } from '@/components/ui/zoomable-image-modal';
import { businessService } from '@/services/business.service';
import { userStorage } from '@/services/storage/user.storage';
import { normalizeImageUrl } from '@/utils/image-url';
import { businessProfileStyles as styles } from '@/styles/screens/business-profile.styles';

export default function BusinessProfileScreen() {
  const [businessDetail, setBusinessDetail] = useState(null);
  const [savedInfo, setSavedInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomImage, setZoomImage] = useState(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const [backendData, localInfo] = await Promise.all([
        businessService.getBusinessRegistration(),
        userStorage.getBusinessInfo(),
      ]);
      setBusinessDetail(backendData);
      setSavedInfo(localInfo);
    } catch (error) {
      console.warn('Lỗi khi tải thông tin hồ sơ kinh doanh:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const status = businessDetail?.status || 'PENDING';
  const isPending = status === 'PENDING';
  const isAccepted = status === 'ACCEPTED';
  const isRejected = status === 'REJECTED';

  const restaurantName =
    businessDetail?.restaurantName || savedInfo?.restaurantName || 'Nhà hàng T&M';
  const restaurantAddress =
    businessDetail?.restaurantAddress || savedInfo?.restaurantAddress || 'Đang cập nhật địa chỉ';

  const licenses = Array.isArray(businessDetail?.businessLicenseUrls) && businessDetail.businessLicenseUrls.length > 0
    ? businessDetail.businessLicenseUrls
    : Array.isArray(businessDetail?.businessLicense)
    ? businessDetail.businessLicense
    : [];

  /**
   * Render hộp tài liệu theo chuẩn giao diện Hồ sơ Tài xế (driver-profile.jsx):
   * - documentLabelRow kèm title
   * - documentImageBox có viền bo góc 14px, nền #F3F4F6
   * - zoomIndicatorIcon (icon expand) ở góc dưới phải
   * - Chạm vào mở ZoomableImageModal phóng to đa điểm
   */
  const renderDocumentBox = (fieldKey, originalUrl, title) => {
    const displayUri = normalizeImageUrl(originalUrl);

    return (
      <View style={styles.documentItem} key={fieldKey}>
        <View style={styles.documentLabelRow}>
          <ThemedText style={styles.documentLabel}>{title}:</ThemedText>
        </View>

        <Pressable
          style={styles.documentImageBox}
          onPress={() => setZoomImage({ uri: displayUri, title })}
        >
          {displayUri ? (
            <Image
              source={{ uri: displayUri }}
              style={styles.documentImage}
              contentFit="cover"
              transition={200}
              onError={(e) => console.warn('Lỗi hiển thị ảnh minh chứng:', displayUri, e?.error)}
            />
          ) : (
            <View style={styles.documentPlaceholder}>
              <Ionicons name="image-outline" size={32} color="#9CA3AF" />
              <ThemedText style={styles.documentPlaceholderText}>
                Chưa có ảnh
              </ThemedText>
            </View>
          )}

          {/* Icon gợi ý xem phóng to góc dưới phải */}
          {displayUri ? (
            <View style={styles.zoomIndicatorIcon}>
              <Ionicons name="expand" size={16} color="#FFFFFF" />
            </View>
          ) : null}
        </Pressable>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SubHeader title="Hồ sơ Kinh doanh" />

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00B5B8" />
          <ThemedText style={styles.loadingText}>Đang tải thông tin hồ sơ...</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* 1. Banner trạng thái xét duyệt */}
          <View
            style={[
              styles.statusBanner,
              isPending && styles.statusBannerPending,
              isAccepted && styles.statusBannerAccepted,
              isRejected && styles.statusBannerRejected,
            ]}
          >
            <View style={styles.statusIconContainer}>
              {isPending && <Ionicons name="time-outline" size={24} color="#D97706" />}
              {isAccepted && <Ionicons name="checkmark-circle-outline" size={24} color="#059669" />}
              {isRejected && <Ionicons name="alert-circle-outline" size={24} color="#DC2626" />}
            </View>
            <View style={styles.statusTextContainer}>
              <ThemedText
                style={[
                  styles.statusTitle,
                  isPending && styles.statusTitlePending,
                  isAccepted && styles.statusTitleAccepted,
                  isRejected && styles.statusTitleRejected,
                ]}
              >
                {isPending && 'Đang chờ xét duyệt'}
                {isAccepted && 'Đang hoạt động'}
                {isRejected && 'Cần cập nhật hồ sơ'}
              </ThemedText>
              <ThemedText style={styles.statusDesc}>
                {isPending &&
                  'Hồ sơ của bạn đã được gửi thành công. Đội ngũ quản trị viên sẽ kiểm tra và phản hồi trong vòng 24 giờ làm việc.'}
                {isAccepted &&
                  'Hồ sơ kinh doanh của bạn đã được kích hoạt. Bạn có thể bắt đầu đăng món và quản lý cửa hàng.'}
                {isRejected &&
                  (businessDetail?.rejectReason
                    ? `Lý do: ${businessDetail.rejectReason}`
                    : 'Hồ sơ chưa đạt yêu cầu. Vui lòng kiểm tra lại hình ảnh và thông tin đăng ký.')}
              </ThemedText>
            </View>
          </View>

          {/* 2. Thông tin Nhà hàng (Tên nhà hàng & Địa chỉ nhà hàng) */}
          <View style={styles.card}>
            <View style={styles.restaurantHeader}>
              <View style={styles.iconBoxTeal}>
                <Ionicons name="storefront-outline" size={24} color="#00B5B8" />
              </View>
              <View style={styles.restaurantHeaderInfo}>
                <ThemedText style={styles.restaurantLabel}>Tên nhà hàng</ThemedText>
                <ThemedText style={styles.restaurantName}>{restaurantName}</ThemedText>
              </View>
            </View>

            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={18} color="#00B5B8" style={styles.addressIcon} />
              <ThemedText style={styles.addressText}>{restaurantAddress}</ThemedText>
            </View>
          </View>

          {/* 3. Giấy tờ minh chứng (Hiển thị chuẩn phong cách Hồ sơ tài xế) */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <ThemedText style={styles.cardHeaderTitle}>Giấy tờ minh chứng & Giấy phép</ThemedText>
            </View>
            <ThemedText style={styles.sectionSubtitle}>
              Chạm vào hình ảnh bất kỳ để xem và phóng to toàn màn hình
            </ThemedText>

            {licenses.length > 0 ? (
              licenses.map((licenseUrl, idx) =>
                renderDocumentBox(
                  `license_${idx}`,
                  licenseUrl,
                  `Giấy chứng nhận ĐKKD / Minh chứng #${idx + 1}`
                )
              )
            ) : (
              <View style={styles.emptyDocumentsBox}>
                <Ionicons name="document-text-outline" size={36} color="#9CA3AF" />
                <ThemedText style={styles.emptyDocumentsText}>
                  Ảnh giấy phép đang được hệ thống xử lý trên MinIO.
                </ThemedText>
              </View>
            )}
          </View>

          {/* 4. Nút hành động */}
          {isRejected && (
            <Pressable
              style={styles.reRegisterButton}
              onPress={() => router.push('/business-register')}
            >
              <ThemedText style={styles.reRegisterText}>CẬP NHẬT LẠI HỒ SƠ</ThemedText>
            </Pressable>
          )}

          <Pressable
            style={styles.supportButton}
            onPress={() =>
              Alert.alert('Trung tâm trợ giúp', 'Hotline hỗ trợ đối tác kinh doanh: 1900 6868\nEmail: partner@tm.vn')
            }
          >
            <ThemedText style={styles.supportText}>Liên hệ hỗ trợ đối tác</ThemedText>
          </Pressable>
        </ScrollView>
      )}

      {/* Modal xem ảnh chi tiết phóng to */}
      <ZoomableImageModal
        visible={Boolean(zoomImage)}
        imageUrl={zoomImage?.uri}
        imageUri={zoomImage?.uri}
        title={zoomImage?.title || 'Giấy phép kinh doanh'}
        onClose={() => setZoomImage(null)}
      />
    </ThemedView>
  );
}
