import { httpClient } from './httpClient';
import type {
  BusinessRegistrationDetail,
  BusinessRegistrationStatus,
  BusinessRegistrationSummary,
  ReviewBusinessRequest,
} from '../types';

export const businessApi = {
  async getBusinessList(
    status: BusinessRegistrationStatus
  ): Promise<BusinessRegistrationSummary[]> {
    const { data } = await httpClient.get<BusinessRegistrationSummary[]>('/api/businesses', {
      params: { status },
    });
    return data;
  },

  async getBusinessDetailByUser(userId: string): Promise<BusinessRegistrationDetail> {
    const { data } = await httpClient.get<BusinessRegistrationDetail>(
      `/api/businesses/registration/user/${userId}`
    );
    return data;
  },

  async updateStatus(id: string, payload: ReviewBusinessRequest): Promise<void> {
    await httpClient.patch(`/api/businesses/${id}/status`, payload);
  },
};
