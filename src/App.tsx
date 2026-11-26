import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import viVN from 'antd/locale/vi_VN';
import { adminTheme } from './theme/themeConfig';
import { AuthProvider } from './auth/AuthContext';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { AdminLayout } from './layouts/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DriverListPage } from './pages/drivers/DriverListPage';
import { DriverDetailPage } from './pages/drivers/DriverDetailPage';
import { BusinessListPage } from './pages/businesses/BusinessListPage';
import { BusinessDetailPage } from './pages/businesses/BusinessDetailPage';
import { ReportListPage } from './pages/reports/ReportListPage';
import { ReportDetailPage } from './pages/reports/ReportDetailPage';
import { VoucherCreatePage } from './pages/vouchers/VoucherCreatePage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const App: React.FC = () => {
  return (
    <ConfigProvider theme={adminTheme} locale={viVN}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                element={
                  <ProtectedRoute>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/drivers" element={<DriverListPage />} />
                <Route path="/drivers/:driverId" element={<DriverDetailPage />} />
                <Route path="/businesses" element={<BusinessListPage />} />
                <Route path="/businesses/:userId" element={<BusinessDetailPage />} />
                <Route path="/reports" element={<ReportListPage />} />
                <Route path="/reports/:id" element={<ReportDetailPage />} />
                <Route path="/vouchers" element={<VoucherCreatePage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ConfigProvider>
  );
};

export default App;
