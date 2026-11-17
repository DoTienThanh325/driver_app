import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Space, Table, Typography } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { driverApi } from '../../api/driverApi';
import { StatusTag } from '../../components/StatusTag';
import { formatDateTime } from '../../utils/format';
import type { DriverCandidateSummary } from '../../types';

export const DriverListPage: React.FC = () => {
  const navigate = useNavigate();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['drivers', 'candidates'],
    queryFn: () => driverApi.getDriverList(),
  });

  const columns: ColumnsType<DriverCandidateSummary> = [
    {
      title: 'Tên tài khoản',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
    },
    {
      title: 'Ngày đăng ký',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value: string) => formatDateTime(value),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'verificationStatus',
      key: 'verificationStatus',
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/drivers/${record.driverId}`)}
        >
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <Card
      title={
        <Typography.Title level={4} style={{ margin: 0 }}>
          Danh sách đăng ký tài xế (Chờ duyệt)
        </Typography.Title>
      }
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching}>
          Làm mới
        </Button>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Table<DriverCandidateSummary>
          rowKey="driverId"
          columns={columns}
          dataSource={data ?? []}
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </Space>
    </Card>
  );
};
