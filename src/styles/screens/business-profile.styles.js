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

  // Card thông tin
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    maxWidth: '65%',
    textAlign: 'right',
  },

  // Danh sách ảnh
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  imageCard: {
    width: '48%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  thumbnail: {
    width: '100%',
    height: 110,
    backgroundColor: '#E5E7EB',
  },
  imageZoomHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  imageZoomText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },

  // Nút hành động
  reRegisterButton: {
    backgroundColor: '#00B5B8',
    borderRadius: 14,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
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
