import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { authApi } from '../api/authApi';
import { tokenStorage } from './tokenStorage';
import type { UserResponse } from '../types';

interface JwtPayload {
  sub?: string;
  roles?: string[];
  username?: string;
  exp?: number;
}

interface AuthContextValue {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (phoneNumber: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function hasAdminRole(roles?: string[] | null): boolean {
  return Array.isArray(roles) && roles.includes('ADMIN');
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const clearSession = useCallback(() => {
    tokenStorage.clearTokens();
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;

    const restoreSession = async () => {
      const accessToken = tokenStorage.getAccessToken();
      if (!accessToken) {
        if (active) setIsInitializing(false);
        return;
      }

      try {
        const me = await authApi.me();
        if (!hasAdminRole(me.roles)) {
          clearSession();
          return;
        }
        if (active) setUser(me);
      } catch {
        clearSession();
      } finally {
        if (active) setIsInitializing(false);
      }
    };

    restoreSession();

    const handleAuthExpired = () => {
      clearSession();
    };

    const handleStorage = (event: StorageEvent) => {
      if (tokenStorage.isTokenKey(event.key) && !tokenStorage.getAccessToken()) {
        setUser(null);
      }
    };

    window.addEventListener('admin-auth-expired', handleAuthExpired);
    window.addEventListener('storage', handleStorage);

    return () => {
      active = false;
      window.removeEventListener('admin-auth-expired', handleAuthExpired);
      window.removeEventListener('storage', handleStorage);
    };
  }, [clearSession]);

  const login = useCallback(async (phoneNumber: string, password: string) => {
    const loginRes = await authApi.login({ phoneNumber, password });

    if (!loginRes.otp) {
      throw new Error(
        'Hệ thống chưa cấu hình đăng nhập quản trị (thiếu OTP từ server)'
      );
    }

    const tokens = await authApi.verifyOtp({
      challengeToken: loginRes.challengeToken,
      otp: loginRes.otp,
    });

    const decoded = jwtDecode<JwtPayload>(tokens.accessToken);
    if (!hasAdminRole(decoded.roles)) {
      try {
        await authApi.logout(tokens.refreshToken);
      } catch {
        // Bỏ qua lỗi logout khi từ chối quyền truy cập
      }
      throw new Error('Tài khoản không có quyền quản trị (ADMIN)');
    }

    tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken);

    try {
      const me = await authApi.me();
      if (!hasAdminRole(me.roles)) {
        tokenStorage.clearTokens();
        throw new Error('Tài khoản không có quyền quản trị (ADMIN)');
      }
      setUser(me);
    } catch (err) {
      tokenStorage.clearTokens();
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = tokenStorage.getRefreshToken();
    clearSession();
    if (refreshToken) {
      try {
        await authApi.logout(refreshToken);
      } catch {
        // Token local đã xoá, bỏ qua lỗi mạng khi logout
      }
    }
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isInitializing,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth phải được dùng bên trong AuthProvider');
  }
  return ctx;
}
