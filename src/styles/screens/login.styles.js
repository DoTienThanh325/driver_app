import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const loginStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 36,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  mainContent: {
    width: '100%',
  },

  // Brand Logo (T&M Transit&Meal)
  brandHeader: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    backgroundColor: '#00B5B8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadgeText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
    letterSpacing: 0.5,
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  brandAmpersand: {
    color: '#00B5B8',
    fontWeight: '700',
  },

  // Header Title & Subtitle (Centered as in mockup)
  headerSection: {
    marginBottom: 28,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },

  // Error alert box
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDECEE',
    borderWidth: 1,
    borderColor: '#F8B4B9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorText: {
    color: '#EE2737',
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
  },

  // Form Inputs
  formContainer: {
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    height: '100%',
  },
  iconAction: {
    padding: 6,
    marginLeft: 6,
  },

  // Buttons
  actionsContainer: {
    marginTop: 8,
  },
  primaryButton: {
    height: 50,
    backgroundColor: '#00B5B8',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    height: 50,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#00B5B8',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: '#00B5B8',
    fontSize: 16,
    fontWeight: '700',
  },

  // Footer section
  footerContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 20,
  },
  forgotPasswordText: {
    color: '#00B5B8',
    fontSize: 14,
    fontWeight: '600',
  },
  demoAccountButton: {
    marginTop: 14,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  demoAccountText: {
    fontSize: 12,
    color: '#8E95A5',
    textDecorationLine: 'underline',
  },

  // OTP Screen styles
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 24,
  },
  otpBox: {
    width: Math.min((width - 48 - 40) / 6, 52),
    height: 54,
    borderWidth: 1.5,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
  resendSection: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  resendTextActive: {
    color: '#00B5B8',
    fontWeight: '700',
    fontSize: 15,
  },
  resendTextDisabled: {
    fontSize: 14,
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
