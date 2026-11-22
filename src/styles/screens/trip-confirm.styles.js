import { StyleSheet } from 'react-native';

export const tripConfirmStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  // Nửa trên hiển thị bản đồ
  mapContainer: {
    flex: 1.1,
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  mapWebView: {
    flex: 1,
  },
  headerFloatingBar: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  routeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00B5B8',
    marginLeft: 4,
  },

  // Nửa dưới hiển thị chọn xe, voucher, thanh toán & giá xe
  bottomSheet: {
    flex: 1.3,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 10,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  peakHourBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  peakHourBadgePeak: {
    backgroundColor: '#FFEDD5',
  },
  peakHourBadgeNormal: {
    backgroundColor: '#DCFCE7',
  },
  peakHourTextPeak: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EA580C',
    marginLeft: 3,
  },
  peakHourTextNormal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
    marginLeft: 3,
  },

  // Danh sách xe & giá (Vuốt ngang hoặc grid nhỏ vừa vặn)
  vehicleListRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  vehicleCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  vehicleCardActive: {
    borderColor: '#00B5B8',
    backgroundColor: '#E6F8F8',
  },
  vehicleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  vehicleInfoCol: {
    flex: 1,
  },
  vehicleNameText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  vehiclePriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00B5B8',
    marginTop: 1,
  },

  // Dòng lộ trình tóm tắt
  summaryRouteBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryRouteText: {
    fontSize: 12,
    color: '#4B5563',
    flex: 1,
    marginLeft: 6,
  },

  paymentSection: {
    marginBottom: 12,
  },
  paymentHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  paymentOptions: {
    gap: 8,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  paymentOptionSelected: {
    borderColor: '#00B5B8',
    backgroundColor: '#E6F8F8',
  },
  paymentOptionLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },

  // Nút Xác nhận đặt xe
  bookBtn: {
    backgroundColor: '#00B5B8',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00B5B8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  bookBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },

  // Food delivery styles
  foodOrderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 12,
    marginBottom: 12,
  },
  restaurantBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  restaurantBadgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    marginLeft: 6,
    flex: 1,
  },
  foodItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  foodThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginRight: 10,
  },
  foodItemInfo: {
    flex: 1,
  },
  foodItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  foodItemOption: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  foodItemPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00B5B8',
  },
  priceBreakdownBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  priceRowLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  priceRowValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  priceRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  priceTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  priceTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#00B5B8',
  },
});
