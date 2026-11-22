import { getUserErrorMessage } from '../../utils/error-message';
import React, { useState, useEffect } from 'react';
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
  StyleSheet,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { feedbackService } from '@/services/feedback.service';

const DEFAULT_TAGS = {
  DRIVER: ['Lái xe an toàn', 'Xe sạch sẽ', 'Thân thiện', 'Đúng giờ', 'Nhiệt tình', 'Chu đáo'],
  RESTAURANT: ['Đồ ăn ngon', 'Đóng gói cẩn thận', 'Chuẩn bị nhanh', 'Đúng món', 'Nóng hổi', 'Vệ sinh sạch sẽ'],
  FOOD: ['Hương vị tuyệt vời', 'Trình bày đẹp', 'Giá cả hợp lý', 'Phần ăn đầy đặn', 'Nguyên liệu tươi ngon'],
};

const RATING_LABELS = {
  1: 'Rất không hài lòng',
  2: 'Chưa hài lòng',
  3: 'Bình thường',
  4: 'Hài lòng',
  5: 'Rất tuyệt vời!',
};

export function RatingModal({
  visible,
  onClose,
  onSuccess,
  targetType = 'DRIVER',
  tripId,
  driverId,
  orderId,
  restaurantId,
  foodId,
  title,
  subtitle,
}) {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setRating(5);
      setSelectedTags([]);
      setComment('');
      setIsSubmitting(false);
    }
  }, [visible]);

  const tags = DEFAULT_TAGS[targetType] || DEFAULT_TAGS.DRIVER;

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const getHeaderTitle = () => {
    if (title) return title;
    switch (targetType) {
      case 'RESTAURANT':
        return 'Đánh giá nhà hàng';
      case 'FOOD':
        return 'Đánh giá món ăn';
      case 'DRIVER':
      default:
        return 'Đánh giá chuyến đi';
    }
  };

  const getHeaderSubtitle = () => {
    if (subtitle) return subtitle;
    switch (targetType) {
      case 'RESTAURANT':
        return 'Chất lượng món ăn và dịch vụ quán thế nào?';
      case 'FOOD':
        return 'Hương vị món ăn có đúng ý bạn không?';
      case 'DRIVER':
      default:
        return 'Trải nghiệm chuyến đi của bạn cùng tài xế thế nào?';
    }
  };

  const handleSubmit = async () => {
    if (!rating || rating < 1 || rating > 5) {
      Alert.alert('Thông báo', 'Vui lòng chọn số sao đánh giá (1 - 5 sao).');
      return;
    }

    setIsSubmitting(true);
    try {
      if (targetType === 'DRIVER') {
        if (!tripId || !driverId) {
          Alert.alert('Lỗi', 'Thiếu thông tin chuyến đi hoặc tài xế.');
          setIsSubmitting(false);
          return;
        }
        await feedbackService.submitDriverFeedback({
          tripId,
          driverId,
          rating,
          comment,
          tags: selectedTags,
        });
      } else if (targetType === 'RESTAURANT') {
        if (!orderId || !restaurantId) {
          Alert.alert('Lỗi', 'Thiếu thông tin đơn hàng hoặc nhà hàng.');
          setIsSubmitting(false);
          return;
        }
        await feedbackService.submitRestaurantFeedback({
          orderId,
          restaurantId,
          rating,
          comment,
          tags: selectedTags,
        });
      } else if (targetType === 'FOOD') {
        if (!orderId || !foodId) {
          Alert.alert('Lỗi', 'Thiếu thông tin đơn hàng hoặc món ăn.');
          setIsSubmitting(false);
          return;
        }
        await feedbackService.submitFoodFeedback({
          orderId,
          foodId,
          rating,
          comment,
          tags: selectedTags,
        });
      }

      Alert.alert('Thành công', 'Cảm ơn bạn đã gửi đánh giá và đóng góp ý kiến!', [
        {
          text: 'Đồng ý',
          onPress: () => {
            if (onSuccess) onSuccess({ rating, tags: selectedTags, comment });
            if (onClose) onClose();
          },
        },
      ]);
    } catch (err) {
      const status = err?.response?.status || err?.status;
      const message = err?.serverMessage || err?.response?.data?.message || err?.message || '';

      if (status === 409 || message.includes('đã được đánh giá')) {
        Alert.alert('Đã đánh giá', 'Bạn đã gửi đánh giá cho mục này trước đó rồi.', [
          {
            text: 'Đóng',
            onPress: () => {
              if (onClose) onClose();
            },
          },
        ]);
      } else {
        Alert.alert('Lỗi gửi đánh giá', getUserErrorMessage(err, 'Không thể gửi đánh giá vào lúc này. Vui lòng thử lại sau.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={modalStyles.overlay}
      >
        <View style={modalStyles.backdrop}>
          <TouchableOpacity style={modalStyles.backdropTouchable} activeOpacity={1} onPress={onClose} />
        </View>

        <View style={modalStyles.card}>
          {/* Header */}
          <View style={modalStyles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={modalStyles.headerTitle}>{getHeaderTitle()}</Text>
              <Text style={modalStyles.headerSubtitle}>{getHeaderSubtitle()}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={modalStyles.scrollContent}>
            {/* Star Rating Selector */}
            <View style={modalStyles.starsContainer}>
              <View style={modalStyles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity
                    key={star}
                    activeOpacity={0.7}
                    onPress={() => setRating(star)}
                    style={modalStyles.starTouchable}
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={42}
                      color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={modalStyles.ratingLabelText}>{RATING_LABELS[rating] || ''}</Text>
            </View>

            {/* Quick Tags Section */}
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>Điểm nổi bật bạn cảm nhận được</Text>
              <View style={modalStyles.tagWrap}>
                {tags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[modalStyles.tagChip, isSelected && modalStyles.tagChipSelected]}
                      onPress={() => toggleTag(tag)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'add-outline'}
                        size={16}
                        color={isSelected ? '#10B981' : '#6B7280'}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[modalStyles.tagText, isSelected && modalStyles.tagTextSelected]}>
                        {tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Free-form comment input */}
            <View style={modalStyles.section}>
              <Text style={modalStyles.sectionLabel}>Nhận xét chi tiết (tùy chọn)</Text>
              <TextInput
                style={modalStyles.commentInput}
                placeholder="Chia sẻ thêm cảm nhận và góp ý của bạn để giúp chúng tôi phục vụ tốt hơn..."
                placeholderTextColor="#9CA3AF"
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={modalStyles.charCount}>{comment.length}/500</Text>
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={modalStyles.footer}>
            <TouchableOpacity
              style={modalStyles.skipButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={modalStyles.skipButtonText}>Để sau</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[modalStyles.submitButton, isSubmitting && modalStyles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={modalStyles.submitButtonText}>Gửi đánh giá</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  backdropTouchable: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  starsContainer: {
    alignItems: 'center',
    marginVertical: 14,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starTouchable: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  ratingLabelText: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
    color: '#F59E0B',
  },
  section: {
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  tagChipSelected: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  tagText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  tagTextSelected: {
    color: '#065F46',
    fontWeight: '600',
  },
  commentInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 88,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  skipButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  submitButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#10B981',
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
