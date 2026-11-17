import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Alert, Button, Card, Form, Input, Typography } from 'antd';
import { LockOutlined, PhoneOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { MOBILE_COLORS } from '../theme/themeConfig';
import { extractErrorMessage } from '../utils/format';

interface LoginFormValues {
  phoneNumber: string;
  password: string;
}

export const LoginPage: React.FC = () => {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const onFinish = async (values: LoginFormValues) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await login(values.phoneNumber.trim(), values.password);
      navigate(from, { replace: true });
    } catch (err) {
      setErrorMsg(extractErrorMessage(err, 'Đăng nhập thất bại'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${MOBILE_COLORS.primaryLight} 0%, ${MOBILE_COLORS.background} 100%)`,
        padding: 16,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 14,
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
          borderColor: MOBILE_COLORS.border,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                background: MOBILE_COLORS.primary,
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 18,
                padding: '7px 12px',
                borderRadius: 10,
              }}
            >
              T&amp;M
            </div>
            <span style={{ fontSize: 22, fontWeight: 700, color: MOBILE_COLORS.text }}>
              Transit<span style={{ color: MOBILE_COLORS.primary }}>&amp;</span>Meal
            </span>
          </div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Đăng nhập Quản trị viên
          </Typography.Title>
          <Typography.Text type="secondary">
            Chỉ tài khoản có quyền ADMIN mới được phép truy cập
          </Typography.Text>
        </div>

        {errorMsg && (
          <Alert
            type="error"
            title={errorMsg}
            showIcon
            style={{ marginBottom: 20 }}
          />
        )}

        <Form<LoginFormValues> layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="phoneNumber"
            label="Số điện thoại"
            rules={[
              { required: true, message: 'Vui lòng nhập số điện thoại' },
              { whitespace: true, message: 'Số điện thoại không hợp lệ' },
            ]}
          >
            <Input prefix={<PhoneOutlined />} placeholder="Ví dụ: 0900000001" autoComplete="tel" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Button type="primary" htmlType="submit" block loading={loading}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};
