import { StyleSheet } from 'react-native';

export const businessProfileStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },

  // Banner trạng thái
  statusBanner: {
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
  },
  statusBannerPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusBannerAccepted: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusBannerRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusIconContainer: {
    marginTop: 2,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusTitlePending: {
    color: '#D97706',
  },
  statusTitleAccepted: {
    color: '#059669',
  },
  statusTitleRejected: {
    color: '#DC2626',
  },
  statusDesc: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
  },

  // Card thông tin Nhà hàng (Tên & Địa chỉ)
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  restaurantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconBoxTeal: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E6F8F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantHeaderInfo: {
    flex: 1,
  },
  restaurantLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00B5B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  restaurantName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 4,
  },
  addressIcon: {
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },

  // Card Header
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  // Mục Giấy tờ minh chứng (Phong cách Hồ sơ Tài xế)
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
  },
  documentItem: {
    marginBottom: 14,
  },
  documentLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  documentLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  documentImageBox: {
    width: '100%',
    height: 150,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  documentImage: {
    width: '100%',
    height: '100%',
  },
  documentPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  documentPlaceholderText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  zoomIndicatorIcon: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyDocumentsBox: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyDocumentsText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  // Legacy full width support (nếu cần tương thích)
  documentCardFullWidth: {
    width: '100%',
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 14,
    position: 'relative',
  },
  documentImageFull: {
    width: '100%',
    height: '100%',
  },
  documentIndexBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 181, 184, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 5,
  },
  documentIndexText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  zoomFloatingBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 5,
  },
  zoomFloatingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // Nút hành động
  reRegisterButton: {
    backgroundColor: '#00B5B8',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#00B5B8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  reRegisterText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  supportButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  supportText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});
