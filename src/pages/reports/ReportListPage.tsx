import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Select, Space, Table, Tabs, Typography } from 'antd';
import { EyeOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { complaintApi } from '../../api/complaintApi';
import { StatusTag } from '../../components/StatusTag';
import { formatDateTime, getReportTypeLabel, REPORT_TYPE_LABELS } from '../../utils/format';
import type { ComplainationStatus, ComplaintSummary, ReportType } from '../../types';

const STATUS_TABS: { key: ComplainationStatus; label: string }[] = [
  { key: 'PENDING', label: 'Chờ xử lý' },
  { key: 'ACCEPTED', label: 'Đã chấp nhận' },
  { key: 'REJECTED', label: 'Đã từ chối' },
];

const REPORT_TYPE_OPTIONS = (Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map((key) => ({
  value: key,
  label: REPORT_TYPE_LABELS[key],
}));

export const ReportListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawStatus = searchParams.get('status') as ComplainationStatus | null;
  const status: ComplainationStatus = STATUS_TABS.some((t) => t.key === rawStatus)
    ? (rawStatus as ComplainationStatus)
    : 'PENDING';

  const reportType = (searchParams.get('reportType') as ReportType | null) || undefined;
  const page = Math.max(0, Number(searchParams.get('page') ?? '0') || 0);
  const size = Math.max(1, Number(searchParams.get('size') ?? '10') || 10);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['complaints', status, reportType ?? '', page, size],
    queryFn: () => complaintApi.getComplaintList({ status, reportType, page, size }),
  });

  const updateParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined || v === '') next.delete(k);
      else next.set(k, v);
    });
    setSearchParams(next);
  };

  const columns: ColumnsType<ComplaintSummary> = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: 'Loại vi phạm',
      dataIndex: 'reportType',
      key: 'reportType',
      render: (type: ReportType) => getReportTypeLabel(type),
    },
    {
      title: 'Mã chuyến đi',
      dataIndex: 'tripId',
      key: 'tripId',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (value: string) => <StatusTag status={value} />,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 140,
      render: (_, record) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/reports/${record.id}?${searchParams.toString()}`)}
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
          Danh sách báo cáo vi phạm
        </Typography.Title>
      }
      extra={
        <Space>
          <Select
            allowClear
            placeholder="Lọc theo loại vi phạm"
            style={{ width: 230 }}
            value={reportType}
            options={REPORT_TYPE_OPTIONS}
            onChange={(val) => updateParams({ reportType: val, page: '0' })}
          />
          <Button icon={<ReloadOutlined />} onClick={() => refetch()} loading={isFetching}>
            Làm mới
          </Button>
        </Space>
      }
    >
      <Tabs
        activeKey={status}
        onChange={(key) => updateParams({ status: key, page: '0' })}
        items={STATUS_TABS.map((t) => ({ key: t.key, label: t.label }))}
      />

      <Table<ComplaintSummary>
        rowKey="id"
        columns={columns}
        dataSource={data?.content ?? []}
        loading={isLoading}
        pagination={{
          current: (data?.number ?? page) + 1,
          pageSize: data?.size ?? size,
          total: data?.totalElements ?? 0,
          showSizeChanger: false,
          onChange: (nextPage) => updateParams({ page: String(nextPage - 1) }),
        }}
      />
    </Card>
  );
};
