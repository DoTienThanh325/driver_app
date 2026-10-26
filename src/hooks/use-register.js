import { useState } from 'react';
import { Keyboard, Alert } from 'react-native';
import { router } from 'expo-router';
import { authService } from '@/services/auth.service';

export function useRegister() {
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Tự động loại bỏ khoảng trắng khi người dùng nhập tên đăng nhập
  const handleUsernameChange = (text) => {
    setUsername(text.replace(/\s/g, ''));
  };

  const handleRegister = async () => {
    Keyboard.dismiss();
    setErrorMessage('');

    const trimmedUsername = username.trim();
    const trimmedPhone = phoneNumber.trim();

    // 1. Kiểm tra trường rỗng
    if (!trimmedUsername) {
      setErrorMessage('Vui lòng nhập tên đăng nhập');
      return;
    }
    // 2. Kiểm tra tên đăng nhập viết liền (không chứa khoảng trắng)
    if (/\s/.test(trimmedUsername)) {
      setErrorMessage('Tên đăng nhập phải viết liền, không được chứa khoảng trắng');
      return;
    }
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(trimmedUsername)) {
      setErrorMessage('Tên đăng nhập phải viết liền không dấu (VD: ThanhTienDo)');
      return;
    }

    if (!trimmedPhone) {
      setErrorMessage('Vui lòng nhập số điện thoại');
      return;
    }
    // 3. Kiểm tra định dạng số điện thoại theo regex backend ^\+?[0-9]{9,15}$
    const phoneRegex = /^\+?[0-9]{9,15}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      setErrorMessage('Số điện thoại không hợp lệ (từ 9 đến 15 số)');
      return;
    }

    // 4. Kiểm tra độ dài mật khẩu (backend yêu cầu tối thiểu 8 ký tự)
    if (!password || password.length < 8) {
      setErrorMessage('Mật khẩu phải có độ dài tối thiểu 8 ký tự');
      return;
    }

    // 5. Kiểm tra mật khẩu xác nhận
    if (password !== confirmPassword) {
      setErrorMessage('Xác nhận mật khẩu không trùng khớp');
      return;
    }

    try {
      setIsLoading(true);
      await authService.register({
        username: trimmedUsername,
        phoneNumber: trimmedPhone,
        password,
      });

      // Đăng ký thành công -> Thông báo và điều hướng về trang đăng nhập
      Alert.alert(
        'Đăng ký thành công',
        'Tài khoản của bạn đã được tạo thành công. Vui lòng đăng nhập để tiếp tục.',
        [
          {
            text: 'Đăng nhập ngay',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch (err) {
      setErrorMessage(err.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    username,
    setUsername,
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
  };
}
