import React from 'react';
import { Tag } from 'antd';

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  PENDING: { color: 'gold', label: 'Chờ duyệt' },
  APPROVED: { color: 'green', label: 'Đã duyệt' },
  ACCEPTED: { color: 'green', label: 'Chấp nhận' },
  REJECTED: { color: 'red', label: 'Từ chối' },
  BANNED: { color: 'magenta', label: 'Đã khoá' },
};

export const StatusTag: React.FC<{ status?: string | null }> = ({ status }) => {
  if (!status) return <Tag>—</Tag>;
  const config = STATUS_MAP[status] ?? { color: 'default', label: status };
  return <Tag color={config.color}>{config.label}</Tag>;
};
