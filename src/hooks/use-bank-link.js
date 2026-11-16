import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';

import { VIETNAM_BANKS } from '../constants/vietnam-banks';
import { paymentService } from '../services/payment.service';
import { userStorage } from '../services/storage/user.storage';
import { offlineCacheStorage } from '../services/storage/offline-cache.storage';
import { offlineSyncService, SYNC_TASK_TYPE } from '../services/offline-sync.service';

/**
 * Chuẩn hóa họ tên thành chữ in hoa không dấu theo chuẩn ngân hàng
 * Ví dụ: "Đỗ Thành Tiến" -> "DO THANH TIEN"
 */
export const formatAccountName = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z\s]/g, '')
    .toUpperCase();
};

/**
 * Trích xuất số tài khoản ngân hàng từ văn bản sao chép
 */
export const extractAccountNumber = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return null;
  const trimmed = rawText.trim();

  // 1. Tìm dãy số liên tục có từ 6 đến 19 chữ số
  const directMatch = trimmed.match(/\b\d{6,19}\b/);
  if (directMatch) return directMatch[0];

  // 2. Nếu dãy số có khoảng trắng hoặc dấu gạch nối (VD: "0868 377 913")
  const withSpaces = trimmed.match(/(?:\d[\s.-]*){6,19}\d/);
  if (withSpaces) {
    const cleaned = withSpaces[0].replace(/[\s.-]/g, '');
    if (cleaned.length >= 6 && cleaned.length <= 19) {
      return cleaned;
    }
  }

  // 3. Fallback: Lấy chuỗi số dài nhất
  const chunks = trimmed.replace(/[^0-9]/g, ' ').trim().split(/\s+/);
  const found = chunks.find((c) => c.length >= 6 && c.length <= 19);
  return found || null;
};

export const useBankLink = () => {
  const [selectedBank, setSelectedBank] = useState(VIETNAM_BANKS[0]);
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);
  const [currentPaymentInfo, setCurrentPaymentInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [hasPendingSync, setHasPendingSync] = useState(false);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  const filteredBanks = useMemo(() => {
    if (!searchQuery.trim()) return VIETNAM_BANKS;
    const query = searchQuery.trim().toLowerCase();
    return VIETNAM_BANKS.filter(
      (b) =>
        b.shortName.toLowerCase().includes(query) ||
        b.name.toLowerCase().includes(query) ||
        b.id.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // 1. Khởi tạo dữ liệu người dùng & thông tin tài khoản hiện có
  useEffect(() => {
    let isMounted = true;

    const applyPaymentInfo = (info) => {
      if (!info) return;
      setCurrentPaymentInfo(info);
      if (info.bankAccountNumber) {
        setBankAccountNumber(info.bankAccountNumber);
      }
      if (info.bankAccountName) {
        setBankAccountName(info.bankAccountName);
      }
      if (info.bankBin) {
        const matched = VIETNAM_BANKS.find((b) => b.bin === info.bankBin);
        if (matched) {
          setSelectedBank(matched);
        }
      }
    };

    const initData = async () => {
      try {
        // Đọc từ cache trước để hiển thị tức thì
        const cached = await offlineCacheStorage.getBankLink();
        if (cached && isMounted) {
          applyPaymentInfo(cached);
          setIsLoadingInfo(false);
        }

        const pending = await offlineSyncService.hasPendingTask(SYNC_TASK_TYPE.BANK_LINK_UPDATE);
        if (isMounted) setHasPendingSync(pending);

        // Lấy thông tin user để gợi ý tên tài khoản
        const profile = await userStorage.getUserProfile();
        if (profile?.fullName && isMounted && !cached?.bankAccountName) {
          setBankAccountName(formatAccountName(profile.fullName));
        }

        // Tải dữ liệu mới nhất từ server
        const info = await paymentService.getDriverPaymentInfo();
        if (info && isMounted) {
          applyPaymentInfo(info);
        }
      } catch (err) {
        console.warn('Lỗi khi tải thông tin thanh toán:', err);
      } finally {
        if (isMounted) setIsLoadingInfo(false);
      }
    };

    initData();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Chọn ngân hàng từ danh sách trượt dọc
  const handleSelectBank = useCallback((bank) => {
    setSelectedBank(bank);
    setIsDropdownOpen(false);
    setSearchQuery('');
  }, []);

  // 3. Cập nhật số tài khoản (chỉ nhận số)
  const handleAccountNumberChange = useCallback((text) => {
    const cleanNumber = text.replace(/[^0-9]/g, '');
    setBankAccountNumber(cleanNumber);
  }, []);

  // 4. Cập nhật tên chủ tài khoản (chuẩn hóa in hoa không dấu)
  const handleAccountNameChange = useCallback((text) => {
    setBankAccountName(formatAccountName(text));
  }, []);

  // 5. Dán nhanh số tài khoản từ bộ nhớ tạm
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || !text.trim()) {
        Alert.alert(
          'Chưa có dữ liệu',
          'Bộ nhớ tạm đang trống. Bạn vui lòng sao chép số tài khoản trước khi dán.'
        );
        return;
      }
      const detected = extractAccountNumber(text);
      if (detected) {
        setBankAccountNumber(detected);
      } else {
        const cleanDigits = text.replace(/[^0-9]/g, '');
        if (cleanDigits.length >= 6) {
          setBankAccountNumber(cleanDigits);
        } else {
          Alert.alert(
            'Thông báo',
            'Không tìm thấy số tài khoản hợp lệ (từ 6 đến 19 chữ số) trong bộ nhớ tạm.'
          );
        }
      }
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể đọc bộ nhớ tạm: ' + e.message);
    }
  }, []);

  // 6. Gửi thông tin liên kết ngân hàng
  const handleSubmit = useCallback(async () => {
    if (!selectedBank) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn ngân hàng');
      return;
    }

    if (!bankAccountNumber || bankAccountNumber.length < 6) {
      Alert.alert('Số tài khoản không hợp lệ', 'Số tài khoản ngân hàng phải có từ 6 đến 19 chữ số');
      return;
    }

    if (!bankAccountName || bankAccountName.trim().length < 3) {
      Alert.alert('Tên chủ tài khoản không hợp lệ', 'Vui lòng nhập họ và tên chủ tài khoản');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        bankName: selectedBank.name,
        bankBin: selectedBank.bin,
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim().toUpperCase(),
      };

      const isEditing = Boolean(currentPaymentInfo?.bankAccountNumber);
      let isOfflineSaved = false;

      try {
        const res = isEditing
          ? await paymentService.updateDriverPaymentInfo(payload)
          : await paymentService.registerDriverPaymentInfo(payload);
        await offlineSyncService.removeTask(SYNC_TASK_TYPE.BANK_LINK_UPDATE);
        setHasPendingSync(false);
      } catch (callErr) {
        console.warn('Lỗi kết nối khi cập nhật tài khoản ngân hàng, lưu vào offline sync queue:', callErr?.message);
        await offlineSyncService.enqueueTask(SYNC_TASK_TYPE.BANK_LINK_UPDATE, {
          isEditing,
          payload,
        });
        isOfflineSaved = true;
        setHasPendingSync(true);
      }

      const updatedInfo = {
        ...payload,
        shortName: selectedBank.shortName,
      };
      setCurrentPaymentInfo(updatedInfo);
      await offlineCacheStorage.saveBankLink(updatedInfo);

      if (isOfflineSaved) {
        Alert.alert(
          'Đã lưu thông tin tài khoản',
          'Tài khoản ngân hàng của bạn đã được ghi nhận. Hệ thống sẽ tự động liên kết ngay khi kết nối mạng ổn định.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert(
          'Thành công',
          isEditing ? 'Cập nhật thông tin ngân hàng thành công!' : 'Đăng ký thông tin ngân hàng thành công!',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      }
    } catch (err) {
      Alert.alert(
        'Chưa thể liên kết tài khoản',
        err?.message || 'Kết nối bị gián đoạn hoặc thông tin tài khoản chưa khớp. Vui lòng kiểm tra lại số tài khoản và thử lại.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedBank, bankAccountNumber, bankAccountName, currentPaymentInfo]);

  return {
    selectedBank,
    bankAccountNumber,
    bankAccountName,
    isSubmitting,
    isLoadingInfo,
    isEditMode: Boolean(currentPaymentInfo?.bankAccountNumber),
    currentPaymentInfo,
    searchQuery,
    isDropdownOpen,
    filteredBanks,
    hasPendingSync,
    setSearchQuery,
    setIsDropdownOpen,
    toggleDropdown,
    handleSelectBank,
    handleAccountNumberChange,
    handleAccountNameChange,
    handlePasteFromClipboard,
    handleSubmit,
  };
};
