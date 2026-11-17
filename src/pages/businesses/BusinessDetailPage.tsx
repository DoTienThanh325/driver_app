import React, { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Image,
  Modal,
  Row,
  Space,
  Spin,
  Typography,
  message,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  EnvironmentOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { businessApi } from '../../api/businessApi';
import { StatusTag } from '../../components/StatusTag';
import { ReasonModal } from '../../components/ReasonModal';
import { extractErrorMessage, formatDateTime } from '../../utils/format';
import type { ReviewBusinessRequest } from '../../types';

export const BusinessDetailPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const fromStatus = searchParams.get('fromStatus') || 'PENDING';
  const backUrl = `/businesses?status=${fromStatus}`;

  const [reasonMode, setReasonMode] = useState<'REJECTED' | 'BANNED' | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['businesses', 'detail', userId],
    queryFn: () => businessApi.getBusinessDetailByUser(userId!),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: (payload: ReviewBusinessRequest) => businessApi.updateStatus(data!.id, payload),
    onSuccess: (_, variables) => {
      const msgMap = {
        ACCEPTED: 'Đã chấp nhận đơn đăng ký kinh doanh',
        REJECTED: 'Đã từ chối đơn đăng ký kinh doanh',
        BANNED: 'Đã khoá tài khoản kinh doanh',
      };
      message.success(msgMap[variables.status]);
      setReasonMode(null);
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      navigate(backUrl);
    },
    onError: (err) => {
      message.error(extractErrorMessage(err, 'Cập nhật trạng thái thất bại'));
    },
  });

  const handleAccept = () => {
    Modal.confirm({
      title: 'Xác nhận duyệt đăng ký kinh doanh',
      content: `Chấp nhận nhà hàng "${data?.restaurantName}"?`,
      okText: 'Chấp nhận',
      cancelText: 'Huỷ',
      onOk: () => mutation.mutateAsync({ status: 'ACCEPTED' }),
    });
  };

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
          message="Không tải được hồ sơ kinh doanh"
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

  const mapsUrl = `https://www.google.com/maps?q=${data.restaurantLatitude},${data.restaurantLongitude}`;

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
              Chi tiết đăng ký kinh doanh
            </Typography.Title>
            <StatusTag status={data.status} />
          </Space>
        }
        extra={
          <Space>
            {data.status === 'PENDING' && (
              <>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => setReasonMode('REJECTED')}
                  loading={mutation.isPending}
                >
                  Từ chối
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleAccept}
                  loading={mutation.isPending}
                >
                  Chấp nhận
                </Button>
              </>
            )}
            {data.status === 'ACCEPTED' && (
              <Button
                danger
                icon={<StopOutlined />}
                onClick={() => setReasonMode('BANNED')}
                loading={mutation.isPending}
              >
                Khoá kinh doanh
              </Button>
            )}
          </Space>
        }
      >
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Tên nhà hàng">{data.restaurantName}</Descriptions.Item>
          <Descriptions.Item label="Mã đơn">{data.id}</Descriptions.Item>
          <Descriptions.Item label="Địa chỉ">{data.restaurantAddress}</Descriptions.Item>
          <Descriptions.Item label="Toạ độ">
            <Space>
              <span>
                {data.restaurantLatitude}, {data.restaurantLongitude}
              </span>
              <Button
                type="link"
                size="small"
                icon={<EnvironmentOutlined />}
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Mở Google Maps
              </Button>
            </Space>
          </Descriptions.Item>
          <Descriptions.Item label="Mã người dùng">{data.userId}</Descriptions.Item>
          <Descriptions.Item label="Mã nhà hàng">{data.restaurantId ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Ngày đăng ký">
            {formatDateTime(data.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="Cập nhật lần cuối">
            {formatDateTime(data.updatedAt)}
          </Descriptions.Item>
          {data.rejectReason && (
            <Descriptions.Item label="Lý do từ chối" span={2}>
              <Typography.Text type="danger">{data.rejectReason}</Typography.Text>
            </Descriptions.Item>
          )}
          {data.banReason && (
            <Descriptions.Item label="Lý do khoá" span={2}>
              <Typography.Text type="danger">{data.banReason}</Typography.Text>
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider titlePlacement="start">Giấy phép kinh doanh / Minh chứng</Divider>
        {!data.businessLicenseUrls || data.businessLicenseUrls.length === 0 ? (
          <Typography.Text type="secondary">Không có ảnh giấy phép</Typography.Text>
        ) : (
          <Image.PreviewGroup>
            <Row gutter={[16, 16]}>
              {data.businessLicenseUrls.map((url, idx) => (
                <Col key={idx} xs={24} sm={12} md={8}>
                  <Image
                    src={url}
                    alt={`Giấy phép ${idx + 1}`}
                    style={{
                      width: '100%',
                      maxHeight: 240,
                      objectFit: 'contain',
                      borderRadius: 8,
                    }}
                  />
                </Col>
              ))}
            </Row>
          </Image.PreviewGroup>
        )}
      </Card>

      <ReasonModal
        open={reasonMode !== null}
        title={
          reasonMode === 'BANNED'
            ? 'Khoá đơn vị kinh doanh'
            : 'Từ chối đơn đăng ký kinh doanh'
        }
        label={reasonMode === 'BANNED' ? 'Lý do khoá' : 'Lý do từ chối'}
        placeholder={
          reasonMode === 'BANNED'
            ? 'Nhập lý do khoá tài khoản kinh doanh...'
            : 'Nhập lý do từ chối để chủ quán cập nhật lại...'
        }
        confirmText={reasonMode === 'BANNED' ? 'Xác nhận khoá' : 'Xác nhận từ chối'}
        loading={mutation.isPending}
        onCancel={() => setReasonMode(null)}
        onSubmit={(reason) => {
          if (reasonMode === 'REJECTED') {
            mutation.mutate({ status: 'REJECTED', rejectReason: reason });
          } else if (reasonMode === 'BANNED') {
            mutation.mutate({ status: 'BANNED', banReason: reason });
          }
        }}
      />
    </div>
  );
};
