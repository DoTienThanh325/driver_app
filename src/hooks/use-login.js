import { useState, useEffect } from 'react';
import { Keyboard, Alert } from 'react-native';
import { router } from 'expo-router';
import { authService } from '@/services/auth.service';

export function useLogin() {
  // Trạng thái bước: 'CREDENTIALS' (Bước 1) hoặc 'OTP' (Bước 2)
  const [step, setStep] = useState('CREDENTIALS');

  // Input states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // 6 ô OTP riêng biệt

  // Backend response states
  const [challengeToken, setChallengeToken] = useState(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Trạng thái chung
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Đếm ngược gửi lại OTP
  useEffect(() => {
    let timer;
    if (step === 'OTP' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  /**
   * Xử lý Bước 1: Gửi SĐT + Mật khẩu
   */
  const handleRequestLogin = async () => {
    Keyboard.dismiss();
    setErrorMessage('');

    const formattedPhone = phoneNumber.trim();
    if (!formattedPhone) {
      setErrorMessage('Vui lòng nhập số điện thoại');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu tài khoản');
      return;
    }

    try {
      setIsLoading(true);
      const res = await authService.login({
        phoneNumber: formattedPhone,
        password,
      });

      // Lưu challengeToken và chuyển sang bước OTP
      setChallengeToken(res.challengeToken);
      setStep('OTP');
      setCountdown(res.expiresInSeconds ? Math.min(res.expiresInSeconds, 60) : 60);
      setCanResend(false);
    } catch (err) {
      setErrorMessage(err.message || 'Số điện thoại hoặc mật khẩu không chính xác');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Xử lý Bước 2: Xác nhận OTP
   */
  const handleVerifyOtp = async (inputOtp = otp.join('')) => {
    Keyboard.dismiss();
    setErrorMessage('');

    if (inputOtp.length !== 6) {
      setErrorMessage('Vui lòng nhập đầy đủ 6 chữ số mã OTP');
      return;
    }

    try {
      setIsLoading(true);
      const tokenData = await authService.verifyOtp({
        challengeToken,
        otp: inputOtp,
      });

      // Lấy thông tin tài khoản người dùng và lưu vào userStorage
      await authService.getCurrentUser(tokenData.accessToken);

      // Đăng nhập thành công -> Điều hướng thẳng về Trang chủ
      router.replace('/');
    } catch (err) {
      setErrorMessage(err.message || 'Mã OTP không đúng hoặc đã hết hạn.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Gửi lại mã OTP
   */
  const handleResendOtp = async () => {
    if (!canResend) return;

    try {
      setIsLoading(true);
      setErrorMessage('');
      const res = await authService.resendOtp({
        phoneNumber: phoneNumber.trim(),
        challengeToken,
      });

      if (res.challengeToken) {
        setChallengeToken(res.challengeToken);
      }
      setCountdown(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setErrorMessage(err.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Quay lại màn hình nhập mật khẩu
   */
  const handleBackToCredentials = () => {
    setStep('CREDENTIALS');
    setErrorMessage('');
    setOtp(['', '', '', '', '', '']);
  };

  // Hỗ trợ điền tài khoản demo
  const fillDemoAccount = () => {
    setPhoneNumber('0901234567');
    setPassword('driver123456');
    setErrorMessage('');
  };

  return {
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
  };
}
