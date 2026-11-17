import { httpClient } from './httpClient';
import type {
  LoginRequest,
  LoginResponse,
  TokenResponse,
  UserResponse,
  VerifyOtpRequest,
} from '../types';

export const authApi = {
  async login(payload: LoginRequest): Promise<LoginResponse> {
    const { data } = await httpClient.post<LoginResponse>('/api/auth/login', payload);
    return data;
  },

  async verifyOtp(payload: VerifyOtpRequest): Promise<TokenResponse> {
    const { data } = await httpClient.post<TokenResponse>('/api/auth/verify-otp', payload);
    return data;
  },

  async logout(refreshToken: string): Promise<void> {
    await httpClient.post('/api/auth/logout', { refreshToken });
  },

  async me(): Promise<UserResponse> {
    const { data } = await httpClient.get<UserResponse>('/api/users/me');
    return data;
  },
};
