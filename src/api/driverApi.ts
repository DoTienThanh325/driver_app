import { httpClient } from './httpClient';
import type {
  DriverCandidateSummary,
  DriverDetail,
  UpdateDriverVerificationRequest,
} from '../types';

export const driverApi = {
  async getDriverList(): Promise<DriverCandidateSummary[]> {
    const { data } = await httpClient.get<DriverCandidateSummary[]>('/api/drivers/candidates');
    return data;
  },

  async getDriverDetail(driverId: string): Promise<DriverDetail> {
    const { data } = await httpClient.get<DriverDetail>(`/api/drivers/${driverId}`);
    return data;
  },

  async updateVerification(
    driverId: string,
    payload: UpdateDriverVerificationRequest
  ): Promise<void> {
    await httpClient.patch(`/api/drivers/${driverId}/verification-status`, payload);
  },
};
