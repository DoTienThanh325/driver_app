import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const homeStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // 1. Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
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
  greetingSmall: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  greetingName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 2. Search Input Bar
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 48,
    marginBottom: 24,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchText: {
    fontSize: 14,
    color: '#9CA3AF',
  },

  // 3. Quick Services Grid
  servicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  serviceCard: {
    width: (width - 40 - 14) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceIconBoxTeal: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E6F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  serviceIconBoxOrange: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF2E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  serviceTitleTeal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00B5B8',
    marginBottom: 4,
  },
  serviceTitleOrange: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF7A00',
    marginBottom: 4,
  },
  serviceSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },

  // 4. Section Ưu đãi
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 14,
  },
  promotionsScroll: {
    flexDirection: 'row',
  },
  promotionCardTeal: {
    width: width * 0.65,
    backgroundColor: '#008E9B',
    borderRadius: 16,
    padding: 18,
    marginRight: 14,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  promotionCardOrange: {
    width: width * 0.65,
    backgroundColor: '#FF7A00',
    borderRadius: 16,
    padding: 18,
    marginRight: 14,
    minHeight: 130,
    justifyContent: 'space-between',
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 22,
    marginBottom: 8,
  },
  promoSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    lineHeight: 16,
  },
});
