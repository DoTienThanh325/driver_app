import React from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRegister } from '@/hooks/use-register';
import { registerStyles as styles } from '@/styles/screens/register.styles';

const ICON_COLOR = '#9CA3AF';

export default function RegisterScreen() {
  const {
    username,
    handleUsernameChange,
    phoneNumber,
    setPhoneNumber,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    isLoading,
    errorMessage,
    handleRegister,
  } = useRegister();

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
                {/* Nút quay lại */}
                <View style={styles.topBar}>
                  <Pressable
                    style={styles.backNavButton}
                    onPress={() => router.back()}
                    hitSlop={10}
                  >
                    <Ionicons name="arrow-back" size={22} color="#111827" />
                  </Pressable>
                </View>

                {/* 1. Logo T&M trung tâm */}
                <View style={styles.brandHeader}>
                  <View style={styles.logoBadge}>
                    <ThemedText style={styles.logoBadgeText}>T&M</ThemedText>
                  </View>
                </View>

                {/* 2. Tiêu đề căn giữa */}
                <View style={styles.headerSection}>
                  <ThemedText style={styles.title}>Tạo tài khoản mới</ThemedText>
                  <ThemedText style={styles.subtitle}>
                    Đăng ký để bắt đầu trải nghiệm
                  </ThemedText>
                </View>

                {/* 3. Thông báo lỗi nếu có */}
                {errorMessage ? (
                  <View style={styles.errorBox}>
                    <Ionicons name="alert-circle" size={18} color="#EE2737" />
                    <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
                  </View>
                ) : null}

                {/* 4. Form 4 trường nhập liệu */}
                <View style={styles.formContainer}>
                  {/* Ô 1: Tên đăng nhập */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={20} color={ICON_COLOR} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="Tên đăng nhập (VD: ThanhTienDo)"
                      placeholderTextColor={ICON_COLOR}
                      value={username}
                      onChangeText={handleUsernameChange}
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Ô 2: Số điện thoại */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="call-outline" size={20} color={ICON_COLOR} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="Số điện thoại"
                      placeholderTextColor={ICON_COLOR}
                      keyboardType="phone-pad"
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      autoCapitalize="none"
                    />
                  </View>

                  {/* Ô 3: Mật khẩu */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color={ICON_COLOR} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="Mật khẩu"
                      placeholderTextColor={ICON_COLOR}
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
                        color={ICON_COLOR}
                      />
                    </Pressable>
                  </View>

                  {/* Ô 4: Xác nhận mật khẩu */}
                  <View style={styles.inputContainer}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={ICON_COLOR} style={styles.inputIcon} />
                    <TextInput
                      style={styles.inputField}
                      placeholder="Xác nhận mật khẩu"
                      placeholderTextColor={ICON_COLOR}
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      autoCapitalize="none"
                    />
                    <Pressable
                      style={styles.iconAction}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={ICON_COLOR}
                      />
                    </Pressable>
                  </View>

                  {/* Nút Đăng ký */}
                  <Pressable
                    style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
                    onPress={handleRegister}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <ThemedText style={styles.registerButtonText}>Đăng ký</ThemedText>
                    )}
                  </Pressable>
                </View>
              </View>

              {/* 5. Chân trang: Đã có tài khoản? Đăng nhập ngay */}
              <View style={styles.footerContainer}>
                <ThemedText style={styles.footerText}>Đã có tài khoản? </ThemedText>
                <Pressable onPress={() => router.push('/login')} hitSlop={8}>
                  <ThemedText style={styles.loginLinkText}>Đăng nhập ngay</ThemedText>
                </Pressable>
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}
