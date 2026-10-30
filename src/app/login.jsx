import React, { useRef } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useTheme } from '@/hooks/use-theme';
import { useLogin } from '@/hooks/use-login';
import { loginStyles as styles } from '@/styles/screens/login.styles';

const THEME_TEAL = '#00B5B8';

export default function LoginScreen() {
  const theme = useTheme();
  const otpInputsRef = useRef([]);

  const {
    step,
    phoneNumber,
    setPhoneNumber,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    otp,
    setOtp,
    countdown,
    canResend,
    isLoading,
    errorMessage,
    handleRequestLogin,
    handleVerifyOtp,
    handleResendOtp,
    handleBackToCredentials,
    fillDemoAccount,
    handleAutofillOtp,
  } = useLogin();

  const isDark = theme.background === '#121212';
  const inputBg = isDark ? '#1E1E1E' : '#F3F4F6';
  const placeholderColor = isDark ? '#8E95A5' : '#9CA3AF';
  const borderColor = isDark ? '#2C2C2C' : '#E3E3E3';

  // Xử lý chuyển ô OTP tự động khi nhập hoặc nhận chuỗi autofill
  const handleOtpChange = (text, index) => {
    const cleanDigits = text.replace(/\D/g, '');

    // Nếu người dùng ấn gợi ý trên bàn phím (chuỗi trả về có từ 2 chữ số trở lên)
    if (cleanDigits.length > 1) {
      handleAutofillOtp(cleanDigits);
      return;
    }

    const updated = [...otp];
    updated[index] = cleanDigits;
    setOtp(updated);

    if (cleanDigits && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Nếu đã nhập đủ 6 số thì tự động gửi xác thực
    const fullOtp = updated.join('');
    if (fullOtp.length === 6) {
      handleVerifyOtp(fullOtp);
    }
  };

  const handleOtpKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleCreateAccount = () => {
    router.push('/register');
  };

  const handleForgotPassword = () => {
    Alert.alert(
      'Quên mật khẩu',
      'Vui lòng liên hệ hotline tổng đài hỗ trợ Transit&Meal để được cấp lại mật khẩu đăng nhập.',
      [{ text: 'Đã hiểu' }]
    );
  };

  return (
    <ThemedView style={styles.safeArea}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.mainContent}>
                {/* Brand Logo T&M Transit&Meal */}
                <View style={styles.brandHeader}>
                  <View style={styles.brandRow}>
                    <View style={styles.logoBadge}>
                      <ThemedText style={styles.logoBadgeText}>T&M</ThemedText>
                    </View>
                    <ThemedText style={[styles.brandName, { color: theme.text }]}>
                      Transit<ThemedText style={styles.brandAmpersand}>&</ThemedText>Meal
                    </ThemedText>
                  </View>
                </View>

                {/* Thông báo lỗi nếu có */}
                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color="#EE2737" />
                    <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                  </View>
                ) : null}

                {/* GIAO DIỆN BƯỚC 1: SỐ ĐIỆN THOẠI & MẬT KHẨU */}
                {step === 'CREDENTIALS' ? (
                  <View>
                    {/* Header Tiêu đề & Lời chào căn giữa theo mẫu */}
                    <View style={styles.headerSection}>
                      <ThemedText style={styles.title}>Chào mừng trở lại!</ThemedText>
                      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                        Đăng nhập để tiếp tục di chuyển cùng T&M
                      </ThemedText>
                    </View>

                    {/* Biểu mẫu nhập thông tin */}
                    <View style={styles.formContainer}>
                      {/* SĐT Input */}
                      <View style={[styles.inputContainer, { backgroundColor: inputBg }]}>
                        <Ionicons
                          name="call-outline"
                          size={20}
                          color={placeholderColor}
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={[styles.inputField, { color: theme.text }]}
                          placeholder="Số điện thoại"
                          placeholderTextColor={placeholderColor}
                          keyboardType="phone-pad"
                          value={phoneNumber}
                          onChangeText={setPhoneNumber}
                          autoCapitalize="none"
                        />
                      </View>

                      {/* Mật khẩu Input */}
                      <View style={[styles.inputContainer, { backgroundColor: inputBg }]}>
                        <Ionicons
                          name="lock-closed-outline"
                          size={20}
                          color={placeholderColor}
                          style={styles.inputIcon}
                        />
                        <TextInput
                          style={[styles.inputField, { color: theme.text }]}
                          placeholder="Mật khẩu"
                          placeholderTextColor={placeholderColor}
                          secureTextEntry={!showPassword}
                          value={password}
                          onChangeText={setPassword}
                          autoCapitalize="none"
                        />
                        <Pressable
                          style={styles.iconAction}
                          onPress={() => setShowPassword(!showPassword)}
                          hitSlop={8}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={placeholderColor}
                          />
                        </Pressable>
                      </View>

                      {/* Nút Đăng nhập & Tạo tài khoản mới */}
                      <View style={styles.actionsContainer}>
                        <Pressable
                          style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                          onPress={handleRequestLogin}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <ActivityIndicator color="#FFFFFF" />
                          ) : (
                            <ThemedText style={styles.primaryButtonText}>Đăng nhập</ThemedText>
                          )}
                        </Pressable>

                        <Pressable
                          style={styles.secondaryButton}
                          onPress={handleCreateAccount}
                          disabled={isLoading}
                        >
                          <ThemedText style={styles.secondaryButtonText}>Tạo tài khoản mới</ThemedText>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                ) : (
                  /* GIAO DIỆN BƯỚC 2: XÁC THỰC MÃ OTP 6 CHỮ SỐ */
                  <View>
                    <View style={styles.headerSection}>
                      <ThemedText style={styles.title}>Xác thực mã OTP</ThemedText>
                      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                        Mã xác thực 6 số vừa được gửi đến số điện thoại{' '}
                        <ThemedText style={{ fontWeight: '700' }}>{phoneNumber}</ThemedText>
                      </ThemedText>
                    </View>

                    {/* 6 Ô nhập OTP */}
                    <View style={styles.otpContainer}>
                      {otp.map((digit, idx) => (
                        <TextInput
                          key={idx}
                          ref={(ref) => (otpInputsRef.current[idx] = ref)}
                          style={[
                            styles.otpBox,
                            {
                              backgroundColor: inputBg,
                              borderColor: digit ? THEME_TEAL : borderColor,
                              color: theme.text,
                            },
                          ]}
                          keyboardType="number-pad"
                          maxLength={idx === 0 ? 6 : 1}
                          value={digit}
                          onChangeText={(txt) => handleOtpChange(txt, idx)}
                          onKeyPress={(e) => handleOtpKeyPress(e, idx)}
                          textContentType={idx === 0 ? 'oneTimeCode' : 'none'}
                          autoComplete={idx === 0 ? 'sms-otp' : 'off'}
                          importantForAutofill={idx === 0 ? 'yes' : 'no'}
                        />
                      ))}
                    </View>

                    {/* Nút Xác nhận OTP */}
                    <Pressable
                      style={[styles.primaryButton, isLoading && styles.primaryButtonDisabled]}
                      onPress={() => handleVerifyOtp()}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFFFFF" />
                      ) : (
                        <ThemedText style={styles.primaryButtonText}>Xác nhận & Đăng nhập</ThemedText>
                      )}
                    </Pressable>

                    {/* Đếm ngược gửi lại OTP */}
                    <View style={styles.resendSection}>
                      {canResend ? (
                        <Pressable onPress={handleResendOtp} disabled={isLoading}>
                          <ThemedText style={styles.resendTextActive}>Gửi lại mã OTP</ThemedText>
                        </Pressable>
                      ) : (
                        <ThemedText themeColor="textSecondary" style={styles.resendTextDisabled}>
                          Gửi lại mã sau {countdown}s
                        </ThemedText>
                      )}
                    </View>

                    {/* Quay lại Bước 1 */}
                    <Pressable style={styles.backButton} onPress={handleBackToCredentials}>
                      <ThemedText themeColor="textSecondary" style={styles.backButtonText}>
                        ← Đổi số điện thoại khác
                      </ThemedText>
                    </Pressable>
                  </View>
                )}
              </View>

              {/* Footer: Quên mật khẩu & Hỗ trợ demo */}
              <View style={styles.footerContainer}>
                <Pressable onPress={handleForgotPassword} hitSlop={10}>
                  <ThemedText style={styles.forgotPasswordText}>Quên mật khẩu?</ThemedText>
                </Pressable>

                <Pressable style={styles.demoAccountButton} onPress={fillDemoAccount} hitSlop={6}>
                  <ThemedText style={styles.demoAccountText}>Điền tài khoản thử nghiệm</ThemedText>
                </Pressable>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
