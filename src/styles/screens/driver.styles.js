import { StyleSheet } from 'react-native';

export const driverStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },

  // Khối thẻ chứa Profile và Switch phía trên
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#00B5B8',
    backgroundColor: '#E6F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#00B5B8',
  },
  nameBlock: {
    justifyContent: 'center',
  },
  driverRoleLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  driverFullName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  bellButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Thẻ công tắc nhận chuyến
  switchCard: {
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
  },
  switchSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },

  // Trạng thái tạm nghỉ (Offline)
  offlineStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 64,
    paddingHorizontal: 24,
  },
  exclamationCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  exclamationText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
  },
  offlineMainNotice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  offlineSubNotice: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Trạng thái trực tuyến (Online)
  onlineStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 64,
    paddingHorizontal: 24,
  },
  radarPulse: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E6F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  onlineTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00B5B8',
    marginBottom: 6,
    textAlign: 'center',
  },
  onlineSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});
