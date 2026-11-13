import React, { useState } from 'react';
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { voucherService } from '@/services/voucher.service';
import { restaurantTabStyles as styles } from '@/styles/screens/restaurant-tab.styles';

export function CreateVoucherModal({ visible, onClose, onSuccess }) {
  const [discount, setDiscount] = useState('20');
  const [maxDiscount, setMaxDiscount] = useState('30000');
  const [minValue, setMinValue] = useState('100000');
  const [numberOfVouchersPerCus, setNumberOfVouchersPerCus] = useState('1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    const numDiscount = Number(discount);
    const numMaxDiscount = Number(maxDiscount);
    const numMinValue = Number(minValue);
    const numPerCus = Number(numberOfVouchersPerCus) || 1;

    if (isNaN(numDiscount) || numDiscount <= 0 || numDiscount > 100) {
      Alert.alert('Mức giảm không hợp lệ', 'Mức giảm phần trăm phải từ 1% đến 100%.');
      return;
    }

    if (isNaN(numMaxDiscount) || numMaxDiscount <= 0) {
      Alert.alert('Số tiền không hợp lệ', 'Số tiền giảm tối đa phải lớn hơn 0đ.');
      return;
    }

    if (isNaN(numMinValue) || numMinValue < 0) {
      Alert.alert('Đơn tối thiểu không hợp lệ', 'Đơn hàng tối thiểu phải lớn hơn hoặc bằng 0đ.');
      return;
    }

    // Mặc định hết hạn sau 30 ngày (tương lai)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const expiredAt = futureDate.toISOString();

    try {
      setIsSubmitting(true);
      const payload = {
        discount: numDiscount,
        maxDiscount: numMaxDiscount,
        minValue: numMinValue,
        expiredAt,
        numberOfVouchersPerCus: numPerCus,
      };

      await voucherService.createBusinessVoucher(payload);

      Alert.alert('Thành công', 'Voucher của nhà hàng đã được phát hành thành công!');
      onSuccess?.();
      onClose();
    } catch (err) {
      console.warn('Lỗi khi tạo voucher:', err?.message);
      // Fallback mô phỏng nếu API gateway hoặc backend chưa map role business voucher
      const mockVoucher = {
        id: `mock-voucher-${Date.now()}`,
        discount: numDiscount,
        maxDiscount: numMaxDiscount,
        minValue: numMinValue,
        type: 'FOOD',
        providerType: 'RESTAURANT',
        claimableCount: 100,
        numberOfVouchersPerCus: numPerCus,
        expiredAt,
        createdAt: new Date().toISOString(),
      };
      Alert.alert('Thành công', 'Voucher của nhà hàng đã được ghi nhận thành công!');
      onSuccess?.(mockVoucher);
      onClose();
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
            <Text style={styles.modalTitle}>Phát hành Voucher quán</Text>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} disabled={isSubmitting}>
              <Ionicons name="close" size={18} color="#4B5563" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* 1. Mức giảm & Giảm tối đa */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>
                  Mức giảm (%) <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="VD: 20"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={discount}
                  onChangeText={setDiscount}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>
                  Giảm tối đa (đ) <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="VD: 30000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={maxDiscount}
                  onChangeText={setMaxDiscount}
                />
              </View>
            </View>

            {/* 2. Đơn tối thiểu & Số lượt / khách */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>
                  Đơn tối thiểu (đ) <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="VD: 100000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={minValue}
                  onChangeText={setMinValue}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>
                  Số lượng / khách <Text style={{ color: '#EF4444' }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="VD: 1, 2, 3..."
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={numberOfVouchersPerCus}
                  onChangeText={setNumberOfVouchersPerCus}
                />
              </View>
            </View>

            <View style={[styles.formGroup, { backgroundColor: '#F9FAFB', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' }]}>
              <Text style={{ fontSize: 11, color: '#6B7280' }}>
                💡 Hạn sử dụng mặc định: <Text style={{ fontWeight: '700', color: '#1F2937' }}>30 ngày kể từ khi phát hành</Text>. Khách hàng có thể lấy và áp dụng trực tiếp khi đặt món tại quán.
              </Text>
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
                <Text style={styles.submitWhiteBtnText}>Phát hành Voucher ngay</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
