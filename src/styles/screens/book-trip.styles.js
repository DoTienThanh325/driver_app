import { StyleSheet } from 'react-native';

export const bookTripStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Thẻ lộ trình (Điểm đón & Điểm đến)
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dotLineBox: {
    alignItems: 'center',
    marginRight: 12,
    marginTop: 6,
    width: 20,
  },
  greenDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#D1FAE5',
  },
  dottedLine: {
    width: 2,
    height: 30,
    backgroundColor: '#D1D5DB',
    marginVertical: 4,
  },
  redDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FEE2E2',
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  addressInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addressInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    padding: 0,
  },
  mapSelectBtn: {
    paddingLeft: 8,
    paddingVertical: 4,
  },

  // Địa điểm gợi ý nhanh
  quickLocationsBox: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  quickLocTitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  quickLocChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 12,
    color: '#4F46E5',
    fontWeight: '500',
  },

  // Thẻ chọn loại phương tiện
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  vehicleGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  vehicleCardActive: {
    borderColor: '#00B5B8',
    backgroundColor: '#E6F8F8',
  },
  vehicleName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
    marginBottom: 4,
  },
  vehiclePrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00B5B8',
  },

  // Thẻ tổng tiền & Đặt xe
  bottomActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#00B5B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  fareLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  fareAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: '#00B5B8',
  },
  bookButton: {
    backgroundColor: '#00B5B8',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Chế độ đang tìm tài xế (Searching State)
  trackingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    marginTop: 10,
  },
  radarBox: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#E6F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#B2EBF2',
  },
  trackingTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  trackingSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },

  // Banner hiển thị vòng quét & bán kính lũy tiến (Expanding Ring)
  roundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  roundBannerText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
    marginLeft: 6,
  },

  // Thanh tiến trình 3 bước mở rộng bán kính (3km -> 5km -> 8km)
  progressStepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 18,
    paddingHorizontal: 12,
  },
  stepItem: {
    alignItems: 'center',
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepBadgeActive: {
    backgroundColor: '#00B5B8',
  },
  stepBadgeDone: {
    backgroundColor: '#10B981',
  },
  stepText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  stepTextActive: {
    color: '#FFFFFF',
  },
  stepSubLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  stepSubLabelActive: {
    color: '#00B5B8',
    fontWeight: '700',
  },
  stepConnector: {
    flex: 1,
    height: 3,
    backgroundColor: '#E5E7EB',
    marginBottom: 16,
    marginHorizontal: 4,
  },
  stepConnectorActive: {
    backgroundColor: '#00B5B8',
  },

  // Đồng hồ đếm ngược
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 14,
  },
  timerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 4,
  },

  // Tóm tắt thông tin cuốc xe
  tripSummaryBox: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  cancelBtn: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },

  // Trạng thái Tài xế đã nhận
  driverAssignedBox: {
    width: '100%',
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  driverTitleBadge: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 6,
  },
  driverStatusNotice: {
    fontSize: 12,
    color: '#047857',
    textAlign: 'center',
  },

  // Thẻ thông báo cuốc gối đầu cho khách
  backToBackNoticeBox: {
    width: '100%',
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#0D9488',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backToBackNoticeText: {
    fontSize: 12,
    color: '#0F766E',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});
