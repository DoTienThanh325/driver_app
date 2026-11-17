import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Divider,
  Space,
  Spin,
  Typography,
} from 'antd';
import { ArrowLeftOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { complaintApi } from '../../api/complaintApi';
import { StatusTag } from '../../components/StatusTag';
import { ResolveReportModal } from './ResolveReportModal';
import { extractErrorMessage, formatDateTime, getReportTypeLabel } from '../../utils/format';

export const ReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [resolveOpen, setResolveOpen] = useState(false);

  const queryStr = searchParams.toString();
  const backUrl = queryStr ? `/reports?${queryStr}` : '/reports';

  const { data, isLoading, error } = useQuery({
    queryKey: ['complaints', 'detail', id],
    queryFn: () => complaintApi.getComplaintDetail(id!),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <Alert
          type="error"
          message="Không tải được chi tiết báo cáo"
          description={extractErrorMessage(error)}
          showIcon
        />
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(backUrl)}
          style={{ marginTop: 16 }}
        >
          Quay lại danh sách
        </Button>
      </Card>
    );
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(backUrl)}>
          Quay lại danh sách
        </Button>
      </Space>

      <Card
        title={
          <Space>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Chi tiết báo cáo vi phạm
            </Typography.Title>
            <StatusTag status={data.status} />
          </Space>
        }
        extra={
          data.status === 'PENDING' && (
            <Button
              type="primary"
              icon={<SafetyCertificateOutlined />}
              onClick={() => setResolveOpen(true)}
            >
              Xử lý báo cáo
            </Button>
          )
        }
      >
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Mã báo cáo">{data.id}</Descriptions.Item>
          <Descriptions.Item label="Mã chuyến đi">{data.tripId}</Descriptions.Item>
          <Descriptions.Item label="Loại vi phạm">
            {getReportTypeLabel(data.reportType)}
          </Descriptions.Item>
          <Descriptions.Item label="Thời gian tạo">
            {formatDateTime(data.createdAt)}
          </Descriptions.Item>
        </Descriptions>

        <Divider titlePlacement="start">Các bên liên quan</Divider>
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Khách hàng">
            {data.customer.username ?? 'Không rõ'}
          </Descriptions.Item>
          <Descriptions.Item label="SĐT khách hàng">
            {data.customer.phoneNumber ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Mã khách hàng">{data.customer.id}</Descriptions.Item>
          <Descriptions.Item label="Tài xế">
            {data.driver.username ?? 'Không rõ'}
          </Descriptions.Item>
          <Descriptions.Item label="SĐT tài xế">
            {data.driver.phoneNumber ?? '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Mã tài xế">{data.driver.id}</Descriptions.Item>
        </Descriptions>

        {data.status !== 'PENDING' && (
          <>
            <Divider titlePlacement="start">Thông tin xử lý</Divider>
            <Descriptions bordered column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Người xử lý">
                {data.resolvedBy ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian xử lý">
                {formatDateTime(data.resolvedAt)}
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú admin" span={2}>
                {data.adminNote ?? '—'}
              </Descriptions.Item>
            </Descriptions>
          </>
        )}
      </Card>

      <ResolveReportModal
        open={resolveOpen}
        complaint={data}
        onCancel={() => setResolveOpen(false)}
        onSuccess={() => {
          setResolveOpen(false);
          queryClient.invalidateQueries({ queryKey: ['complaints'] });
          navigate(backUrl);
        }}
      />
    </div>
  );
};
