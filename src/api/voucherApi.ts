import { httpClient } from './httpClient';
import type { CreateVoucherRequest, CreateVoucherResponse } from '../types';

export const voucherApi = {
  async createAppVoucher(payload: CreateVoucherRequest): Promise<CreateVoucherResponse> {
    const { data } = await httpClient.post<CreateVoucherResponse>('/api/vouchers', payload);
    return data;
  },
};
