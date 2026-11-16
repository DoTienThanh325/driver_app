import { StyleSheet, Platform } from 'react-native';

export const driverTripDetailStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerBar: {
    backgroundColor: '#00B5B8',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 36 : 14,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  headerBackBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerRightPlaceholder: {
    width: 38,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Section Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  // Status & Service Header Card
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: '#ECFDF5',
  },
  statusCompletedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  statusCancelled: {
    backgroundColor: '#FEF2F2',
  },
  statusCancelledText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  serviceTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  serviceTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  timeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  timeMetaText: {
    fontSize: 13,
    color: '#6B7280',
  },
  cancelReasonBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  cancelReasonTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 2,
  },
  cancelReasonContent: {
    fontSize: 13,
    color: '#7F1D1D',
  },

  // Route Block
  routeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 4,
  },
  dotPickup: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00B5B8',
    marginTop: 4,
  },
  dotDropoff: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EA580C',
    marginTop: 4,
  },
  routeItemContent: {
    flex: 1,
  },
  routeItemLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  routeItemAddress: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    lineHeight: 20,
    marginTop: 1,
  },
  routeLine: {
    width: 2,
    height: 18,
    backgroundColor: '#E5E7EB',
    marginLeft: 5,
    marginVertical: 2,
  },

  // Fare Details Block
  fareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  fareLabel: {
    fontSize: 14,
    color: '#4B5563',
  },
  fareValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  fareDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  fareTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  fareTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#00B5B8',
  },

  // Foods List
  foodItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  foodItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  foodItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  foodItemSize: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  foodItemPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  // Customer Block
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  customerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E6F8F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00B5B8',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  customerPhone: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F8F8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#99E6E8',
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00B5B8',
  },

  // Reviews Block
  reviewCardItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  reviewerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  ratingStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D97706',
    marginLeft: 4,
  },
  reviewContentText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  reviewTimeText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
    textAlign: 'right',
  },
  emptyReviewsBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  emptyReviewsText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 6,
  },
});
