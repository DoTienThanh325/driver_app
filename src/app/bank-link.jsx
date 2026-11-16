import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SubHeader } from '@/components/ui/sub-header';
import { useBankLink } from '@/hooks/use-bank-link';
import { bankLinkStyles as styles } from '@/styles/screens/bank-link.styles';

export default function BankLinkScreen() {
  const {
    selectedBank,
    bankAccountNumber,
    bankAccountName,
    isSubmitting,
    isEditMode,
    currentPaymentInfo,
    searchQuery,
    isDropdownOpen,
    filteredBanks,
    hasPendingSync,
    setSearchQuery,
    toggleDropdown,
    handleSelectBank,
    handleAccountNumberChange,
    handleAccountNameChange,
    handlePasteFromClipboard,
    handleSubmit,
  } = useBankLink();

  return (
    <ThemedView style={styles.container}>
      <SubHeader title="Liên kết Ngân hàng" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* 1. Banner giới thiệu mục đích */}
          <View style={styles.bannerCard}>
            <View style={styles.bannerIconWrapper}>
              <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.bannerTextContainer}>
              <ThemedText style={styles.bannerTitle}>Tài khoản nhận tiền tài xế</ThemedText>
              <ThemedText style={styles.bannerDesc}>
                Thu nhập từ các chuyến đi thanh toán chuyển khoản sẽ được chuyển tự động vào tài khoản này.
              </ThemedText>
            </View>
          </View>

          {/* Banner thông báo trạng thái đồng bộ ngoại tuyến */}
          {hasPendingSync && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#EFF6FF',
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 10,
              marginBottom: 16,
              borderLeftWidth: 4,
              borderLeftColor: '#3B82F6',
              gap: 8,
            }}>
              <Ionicons name="cloud-offline-outline" size={18} color="#2563EB" />
              <ThemedText style={{ fontSize: 13, color: '#1E40AF', flex: 1, fontWeight: '500' }}>
                Tài khoản đang chờ hoàn tất liên kết khi có kết nối Internet.
              </ThemedText>
            </View>
          )}

          {/* 2. Thẻ hiển thị tài khoản đã liên kết trước đó (ĐÃ ẨN MÃ BIN) */}
          {currentPaymentInfo?.bankAccountNumber && (
            <View style={styles.linkedCard}>
              <View style={styles.linkedHeader}>
                <ThemedText style={styles.sectionTitle}>Tài khoản hiện tại</ThemedText>
                <View style={styles.linkedBadge}>
                  <ThemedText style={styles.linkedBadgeText}>Đang sử dụng</ThemedText>
                </View>
              </View>
              <View style={styles.linkedRow}>
                <ThemedText style={styles.linkedLabel}>Ngân hàng:</ThemedText>
                <ThemedText style={styles.linkedValue}>
                  {currentPaymentInfo.bankName || currentPaymentInfo.shortName}
                </ThemedText>
              </View>
              <View style={styles.linkedRow}>
                <ThemedText style={styles.linkedLabel}>Số tài khoản:</ThemedText>
                <ThemedText style={styles.linkedValue}>
                  {currentPaymentInfo.bankAccountNumber}
                </ThemedText>
              </View>
              <View style={styles.linkedRow}>
                <ThemedText style={styles.linkedLabel}>Chủ tài khoản:</ThemedText>
                <ThemedText style={styles.linkedValue}>
                  {currentPaymentInfo.bankAccountName}
                </ThemedText>
              </View>
            </View>
          )}

          {/* 3. Form nhập thông tin liên kết ngân hàng */}
          <View style={styles.sectionCard}>
            <ThemedText style={styles.sectionTitle}>1. Chọn ngân hàng</ThemedText>

            {/* Thanh chọn ngân hàng (Bấm vào để trượt dọc mở danh sách) */}
            <Pressable
              style={[
                styles.bankSelectorTrigger,
                isDropdownOpen && styles.bankSelectorTriggerActive,
              ]}
              onPress={toggleDropdown}
            >
              <View style={styles.bankSelectedInfo}>
                {selectedBank?.logo ? (
                  <Image
                    source={{ uri: selectedBank.logo }}
                    style={styles.selectedBankLogo}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                  />
                ) : null}
                <ThemedText style={styles.selectedBankNameSmall} numberOfLines={1}>
                  {selectedBank?.name || 'Chọn ngân hàng của bạn'}
                </ThemedText>
              </View>

              <View style={styles.triggerRightAction}>
                <ThemedText style={styles.triggerActionText}>
                  {isDropdownOpen ? 'Đóng' : 'Đổi'}
                </ThemedText>
                <Ionicons
                  name={isDropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#00B5B8"
                />
              </View>
            </Pressable>

            {/* Khung trượt dọc chứa thanh tìm kiếm và danh sách ngân hàng */}
            {isDropdownOpen && (
              <View style={styles.dropdownBox}>
                {/* Thanh tìm kiếm ngân hàng */}
                <View style={styles.searchBarContainer}>
                  <Ionicons name="search-outline" size={16} color="#64748B" />
                  <TextInput
                    style={styles.searchBarInput}
                    placeholder="Tìm kiếm ngân hàng (MB, VCB, ACB...)"
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoFocus={false}
                  />
                  {searchQuery.length > 0 && (
                    <Pressable
                      style={styles.clearSearchBtn}
                      onPress={() => setSearchQuery('')}
                    >
                      <Ionicons name="close-circle" size={16} color="#94A3B8" />
                    </Pressable>
                  )}
                </View>

                {/* Danh sách ngân hàng cuộn dọc - Mỗi ngân hàng 1 hàng (Logo là chính, tên nhỏ) */}
                <ScrollView
                  style={styles.bankVerticalList}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                >
                  {filteredBanks.length > 0 ? (
                    <View style={styles.bankRowList}>
                      {filteredBanks.map((bank) => {
                        const isSelected = selectedBank?.id === bank.id;
                        return (
                          <Pressable
                            key={bank.id}
                            style={[
                              styles.bankRowItem,
                              isSelected && styles.bankRowItemSelected,
                            ]}
                            onPress={() => handleSelectBank(bank)}
                          >
                            <View style={styles.bankRowLeft}>
                              {/* Logo ngân hàng là chính */}
                              <Image
                                source={{ uri: bank.logo }}
                                style={styles.bankRowLogo}
                                contentFit="contain"
                                cachePolicy="memory-disk"
                              />
                              {/* Tên ngân hàng để nhỏ thôi */}
                              <ThemedText
                                style={[
                                  styles.bankRowNameSmall,
                                  isSelected && styles.bankRowNameSmallSelected,
                                ]}
                                numberOfLines={2}
                              >
                                {bank.name} ({bank.shortName})
                              </ThemedText>
                            </View>

                            {/* Vòng tròn chỉ báo đã chọn */}
                            <View
                              style={[
                                styles.bankRowCheckCircle,
                                isSelected && styles.bankRowCheckCircleSelected,
                              ]}
                            >
                              {isSelected && (
                                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                              )}
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.emptyListContainer}>
                      <ThemedText style={styles.emptyListText}>
                        Không tìm thấy ngân hàng phù hợp
                      </ThemedText>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

            <ThemedText style={[styles.sectionTitle, { marginTop: 14 }]}>
              2. Thông tin tài khoản
            </ThemedText>

            {/* Số tài khoản kèm nút Dán nhanh */}
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.fieldLabel}>
                Số tài khoản: <ThemedText style={styles.requiredStar}>*</ThemedText>
              </ThemedText>
              <View style={styles.inputWithActionRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Nhập số tài khoản ngân hàng"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={bankAccountNumber}
                  onChangeText={handleAccountNumberChange}
                  maxLength={20}
                />
              </View>
              <ThemedText style={styles.inputHint}>
                Nhập chính xác số tài khoản ngân hàng của bạn
              </ThemedText>
            </View>

            {/* Tên chủ tài khoản */}
            <View style={styles.fieldGroup}>
              <ThemedText style={styles.fieldLabel}>
                Tên chủ tài khoản: <ThemedText style={styles.requiredStar}>*</ThemedText>
              </ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Ví dụ: NGUYEN VAN A"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
                value={bankAccountName}
                onChangeText={handleAccountNameChange}
              />
              <ThemedText style={styles.inputHint}>
                Tên in hoa không dấu khớp với tên đăng ký tài khoản tại ngân hàng.
              </ThemedText>
            </View>
          </View>

          {/* 4. Nút Xác nhận liên kết ngân hàng */}
          <Pressable
            style={[
              styles.submitButton,
              (isSubmitting || !bankAccountNumber || !bankAccountName) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || !bankAccountNumber || !bankAccountName}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <ThemedText style={styles.submitButtonText}>
                  {isEditMode ? 'Cập nhật tài khoản ngân hàng' : 'Xác nhận liên kết ngân hàng'}
                </ThemedText>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
