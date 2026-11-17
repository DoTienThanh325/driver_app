import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Table, Tabs, Typography } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { businessApi } from '../../api/businessApi';
import { StatusTag } from '../../components/StatusTag';
import { formatDateTime } from '../../utils/format';
import type { BusinessRegistrationStatus, BusinessRegistrationSummary } from '../../types';

const STATUS_TABS: { key: BusinessRegistrationStatus; label: string }[] = [
  { key: 'PENDING', label: 'Chờ duyệt' },
  { key: 'ACCEPTED', label: 'Đã chấp nhận' },
  { key: 'REJECTED', label: 'Đã từ chối' },
  { key: 'BANNED', label: 'Đã khoá' },
];

export const BusinessListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawStatus = searchParams.get('status') as BusinessRegistrationStatus | null;
  const status: BusinessRegistrationStatus = STATUS_TABS.some((t) => t.key === rawStatus)
    ? (rawStatus as BusinessRegistrationStatus)
    : 'PENDING';

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['businesses', status],
    queryFn: () => businessApi.getBusinessList(status),
  });

  const columns: ColumnsType<BusinessRegistrationSummary> = [
    {
      title: 'Tên nhà hàng / quán ăn',
      dataIndex: 'restaurantName',
      key: 'restaurantName',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: 'Ngày đăng ký',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/businesses/${record.userId}?fromStatus=${status}`)}
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
          Danh sách đăng ký kinh doanh
        </Typography.Title>
      }
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching}>
          Làm mới
        </Button>
      }
    >
      <Tabs
        activeKey={status}
        onChange={(key) => setSearchParams({ status: key })}
        items={STATUS_TABS.map((t) => ({ key: t.key, label: t.label }))}
      />

      <Table<BusinessRegistrationSummary>
        rowKey="id"
        columns={columns}
        dataSource={data ?? []}
        loading={isLoading}
        pagination={{ pageSize: 10, showSizeChanger: false }}
      />
    </Card>
  );
};
