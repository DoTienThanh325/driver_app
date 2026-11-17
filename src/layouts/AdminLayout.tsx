import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Layout, Menu, Space, Typography } from 'antd';
import {
  CarOutlined,
  DashboardOutlined,
  LogoutOutlined,
  ShopOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth/AuthContext';
import { MOBILE_COLORS } from '../theme/themeConfig';

const { Header, Sider, Content } = Layout;

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const selectedKey = React.useMemo(() => {
    if (location.pathname.startsWith('/drivers')) return '/drivers';
    if (location.pathname.startsWith('/businesses')) return '/businesses';
    if (location.pathname.startsWith('/reports')) return '/reports';
    return '/';
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        width={240}
        style={{
          background: MOBILE_COLORS.surface,
          borderRight: `1px solid ${MOBILE_COLORS.border}`,
        }}
      >
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '0 20px',
            borderBottom: `1px solid ${MOBILE_COLORS.border}`,
          }}
        >
          <div
            style={{
              background: MOBILE_COLORS.primary,
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 14,
              padding: '5px 9px',
              borderRadius: 8,
              letterSpacing: 0.4,
            }}
          >
            T&amp;M
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: MOBILE_COLORS.text }}>
              Transit<span style={{ color: MOBILE_COLORS.primary }}>&amp;</span>Meal
            </div>
            <div style={{ fontSize: 11, color: MOBILE_COLORS.textSecondary }}>Admin Portal</div>
          </div>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ borderRight: 0, paddingTop: 12 }}
          onClick={({ key }) => navigate(key)}
          items={[
            {
              key: '/',
              icon: <DashboardOutlined />,
              label: 'Tổng quan',
            },
            {
              key: '/drivers',
              icon: <CarOutlined />,
              label: 'Đăng ký tài xế',
            },
            {
              key: '/businesses',
              icon: <ShopOutlined />,
              label: 'Đăng ký kinh doanh',
            },
            {
              key: '/reports',
              icon: <WarningOutlined />,
              label: 'Xử lý báo cáo',
            },
          ]}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: MOBILE_COLORS.surface,
            borderBottom: `1px solid ${MOBILE_COLORS.border}`,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <Space size="middle">
            <Space size="small">
              <Avatar
                size="small"
                icon={<UserOutlined />}
                style={{ backgroundColor: MOBILE_COLORS.primary }}
              />
              <Typography.Text strong>{user?.username ?? 'Admin'}</Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                ({user?.phoneNumber})
              </Typography.Text>
            </Space>
            <Button icon={<LogoutOutlined />} onClick={handleLogout}>
              Đăng xuất
            </Button>
          </Space>
        </Header>

        <Content style={{ padding: 24, background: MOBILE_COLORS.background }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
