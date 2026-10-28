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
  const [isLoading, setIsLoading] = useState(true);
  const [zoomImage, setZoomImage] = useState(null);

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await businessService.getMyBusiness();
      setBusinessDetail(data);
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

  const licenses = Array.isArray(businessDetail?.businessLicense)
    ? businessDetail.businessLicense
    : [];

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

          {/* 2. Thông tin chung */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Thông tin đăng ký</ThemedText>

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Mã hồ sơ:</ThemedText>
              <ThemedText style={styles.infoValue} numberOfLines={1}>
                {businessDetail?.id || 'Đang cập nhật'}
              </ThemedText>
            </View>

            {businessDetail?.restaurantId && (
              <View style={styles.infoRow}>
                <ThemedText style={styles.infoLabel}>Mã nhà hàng:</ThemedText>
                <ThemedText style={styles.infoValue}>{businessDetail.restaurantId}</ThemedText>
              </View>
            )}

            <View style={styles.infoRow}>
              <ThemedText style={styles.infoLabel}>Thời gian nộp:</ThemedText>
              <ThemedText style={styles.infoValue}>
                {businessDetail?.createdAt
                  ? new Date(businessDetail.createdAt).toLocaleString('vi-VN')
                  : 'Vừa xong'}
              </ThemedText>
            </View>
          </View>

          {/* 3. Giấy phép kinh doanh & Minh chứng (MinIO) */}
          <View style={styles.card}>
            <ThemedText style={styles.cardTitle}>Giấy tờ & Minh chứng đã tải lên</ThemedText>

            {licenses.length > 0 ? (
              <View style={styles.imagesGrid}>
                {licenses.map((licenseUrl, idx) => {
                  const normalized = normalizeImageUrl(licenseUrl);
                  return (
                    <Pressable
                      key={`${licenseUrl}_${idx}`}
                      style={styles.imageCard}
                      onPress={() =>
                        setZoomImage({
                          uri: normalized,
                          title: `Giấy tờ minh chứng #${idx + 1}`,
                        })
                      }
                    >
                      <Image
                        source={{ uri: normalized }}
                        style={styles.thumbnail}
                        contentFit="cover"
                        transition={200}
                      />
                      <View style={styles.imageZoomHint}>
                        <Ionicons name="search-outline" size={13} color="#6B7280" />
                        <ThemedText style={styles.imageZoomText}>Xem phóng to</ThemedText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <ThemedText style={{ color: '#6B7280', fontSize: 13, fontStyle: 'italic' }}>
                Ảnh giấy phép đang được hệ thống xử lý trên MinIO.
              </ThemedText>
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

      {/* Modal xem ảnh chi tiết */}
      <ZoomableImageModal
        visible={Boolean(zoomImage)}
        imageUri={zoomImage?.uri}
        title={zoomImage?.title || 'Giấy phép kinh doanh'}
        onClose={() => setZoomImage(null)}
      />
    </ThemedView>
  );
}
