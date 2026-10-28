import { StyleSheet } from 'react-native';

export const businessRegisterStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  instructionText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  sectionDivider: {
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  sectionHeaderContainer: {
    marginBottom: 12,
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  sectionSubHeading: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  textInputFocused: {
    borderColor: '#00B5B8',
    backgroundColor: '#FFFFFF',
  },
  addressInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addressTextInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  addressActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E6F8F8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#9CEBF9',
  },
  addressActionBtnActive: {
    backgroundColor: '#CCF2F4',
  },

  // Phần ảnh minh chứng nhiều ảnh
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  imageCard: {
    width: '47%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  imageThumbnail: {
    width: '100%',
    height: 110,
    backgroundColor: '#E5E7EB',
  },
  imageToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  imageActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  imageActionText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '500',
  },
  imageDeleteText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },

  // Nút thêm minh chứng
  addProofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#00B5B8',
    borderStyle: 'dashed',
    backgroundColor: '#E6F8F8',
    gap: 8,
    marginTop: 4,
  },
  addProofText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#00B5B8',
  },
  proofHelperText: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
    lineHeight: 16,
  },

  // Trạng thái vị trí bản đồ
  mapStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
    gap: 6,
  },
  mapStatusText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },

  // Nút nộp hồ sơ
  submitButton: {
    backgroundColor: '#00B5B8',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#00B5B8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
