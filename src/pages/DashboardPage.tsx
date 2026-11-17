import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, Col, Row, Statistic, Typography } from 'antd';
import { CarOutlined, ShopOutlined, WarningOutlined } from '@ant-design/icons';
import { driverApi } from '../api/driverApi';
import { businessApi } from '../api/businessApi';
import { complaintApi } from '../api/complaintApi';
import { MOBILE_COLORS } from '../theme/themeConfig';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const driversQuery = useQuery({
    queryKey: ['drivers', 'candidates'],
    queryFn: () => driverApi.getDriverList(),
  });

  const businessesQuery = useQuery({
    queryKey: ['businesses', 'PENDING'],
    queryFn: () => businessApi.getBusinessList('PENDING'),
  });

  const complaintsQuery = useQuery({
    queryKey: ['complaints', 'PENDING', '', 0, 1],
    queryFn: () => complaintApi.getComplaintList({ status: 'PENDING', page: 0, size: 1 }),
  });

  return (
    <div>
      <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 20 }}>
        Tổng quan hệ thống
      </Typography.Title>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card
            hoverable
            onClick={() => navigate('/drivers')}
            style={{ borderTop: `3px solid ${MOBILE_COLORS.primary}` }}
          >
            <Statistic
              title="Hồ sơ tài xế chờ duyệt"
              value={driversQuery.data?.length ?? 0}
              loading={driversQuery.isLoading}
              prefix={<CarOutlined style={{ color: MOBILE_COLORS.primary }} />}
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            hoverable
            onClick={() => navigate('/businesses')}
            style={{ borderTop: `3px solid ${MOBILE_COLORS.warning}` }}
          >
            <Statistic
              title="Đăng ký kinh doanh chờ duyệt"
              value={businessesQuery.data?.length ?? 0}
              loading={businessesQuery.isLoading}
              prefix={<ShopOutlined style={{ color: MOBILE_COLORS.warning }} />}
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card
            hoverable
            onClick={() => navigate('/reports')}
            style={{ borderTop: `3px solid ${MOBILE_COLORS.error}` }}
          >
            <Statistic
              title="Báo cáo vi phạm chờ xử lý"
              value={complaintsQuery.data?.totalElements ?? 0}
              loading={complaintsQuery.isLoading}
              prefix={<WarningOutlined style={{ color: MOBILE_COLORS.error }} />}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
