import { httpClient } from './httpClient';
import type {
  ComplainationStatus,
  ComplaintDetail,
  ComplaintSummary,
  PageResponse,
  ReportType,
  UpdateComplaintStatusRequest,
} from '../types';

export interface ListComplaintsParams {
  status: ComplainationStatus;
  reportType?: ReportType;
  page?: number;
  size?: number;
}

export const complaintApi = {
  async getComplaintList(
    params: ListComplaintsParams
  ): Promise<PageResponse<ComplaintSummary>> {
    const { data } = await httpClient.get<PageResponse<ComplaintSummary>>('/api/complaints', {
      params: {
        status: params.status,
        reportType: params.reportType || undefined,
        page: params.page ?? 0,
        size: params.size ?? 10,
      },
    });
    return data;
  },

  async getComplaintDetail(id: string): Promise<ComplaintDetail> {
    const { data } = await httpClient.get<ComplaintDetail>(`/api/complaints/${id}`);
    return data;
  },

  async updateStatus(id: string, payload: UpdateComplaintStatusRequest): Promise<void> {
    await httpClient.patch(`/api/complaints/${id}/status`, payload);
  },
};
