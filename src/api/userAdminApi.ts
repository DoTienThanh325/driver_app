import { httpClient } from './httpClient';
import type { AdminUserStatusResponse, BanUserRequest } from '../types';

export const userAdminApi = {
  async banUser(userId: string, payload: BanUserRequest): Promise<AdminUserStatusResponse> {
    const { data } = await httpClient.patch<AdminUserStatusResponse>(
      `/api/admin/users/${userId}/ban`,
      payload
    );
    return data;
  },

  async unbanUser(userId: string): Promise<AdminUserStatusResponse> {
    const { data } = await httpClient.patch<AdminUserStatusResponse>(
      `/api/admin/users/${userId}/unban`
    );
    return data;
  },
};
