import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { ArrowLeftOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { driverApi } from '../../api/driverApi';
import { StatusTag } from '../../components/StatusTag';
import { ReasonModal } from '../../components/ReasonModal';
import { extractErrorMessage, formatDateTime } from '../../utils/format';
import type { DocumentImagePair, VehicleDetail } from '../../types';

const hasValidPair = (
  pair?: DocumentImagePair | null
): pair is DocumentImagePair => Boolean(pair && (pair.front || pair.back));

const DocumentPairSection: React.FC<{ title: string; pair?: DocumentImagePair | null }> = ({
  title,
  pair,
}) => {
  if (!hasValidPair(pair)) return null;
  return (
    <Card size="small" title={title} style={{ marginBottom: 16 }}>
      <Image.PreviewGroup>
        <Row gutter={16}>
          {pair.front && (
            <Col xs={24} sm={12}>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Mặt trước
              </Typography.Text>
              <Image
                src={pair.front}
                alt={`${title} mặt trước`}
                style={{ maxHeight: 220, objectFit: 'contain', borderRadius: 8 }}
              />
            </Col>
          )}
          {pair.back && (
            <Col xs={24} sm={12}>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                Mặt sau
              </Typography.Text>
              <Image
                src={pair.back}
                alt={`${title} mặt sau`}
                style={{ maxHeight: 220, objectFit: 'contain', borderRadius: 8 }}
              />
            </Col>
          )}
        </Row>
      </Image.PreviewGroup>
    </Card>
  );
};

export const DriverDetailPage: React.FC = () => {
  const { driverId } = useParams<{ driverId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['drivers', 'detail', driverId],
    queryFn: () => driverApi.getDriverDetail(driverId!),
    enabled: !!driverId,
  });

  const mutation = useMutation({
    mutationFn: (payload: { status: 'APPROVED' | 'REJECTED'; rejectionReason?: string }) =>
      driverApi.updateVerification(driverId!, payload),
    onSuccess: (_, variables) => {
      message.success(
        variables.status === 'APPROVED'
          ? 'Đã duyệt hồ sơ tài xế'
          : 'Đã từ chối hồ sơ tài xế'
      );
      setRejectOpen(false);
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      navigate('/drivers');
    },
    onError: (err) => {
      message.error(extractErrorMessage(err, 'Cập nhật trạng thái thất bại'));
    },
  });

  const handleApprove = () => {
    Modal.confirm({
      title: 'Xác nhận duyệt tài xế',
      content: `Bạn có chắc muốn duyệt hồ sơ của "${data?.username}"?`,
      okText: 'Duyệt',
      cancelText: 'Huỷ',
      onOk: () => mutation.mutateAsync({ status: 'APPROVED' }),
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
          message="Không tải được hồ sơ tài xế"
          description={extractErrorMessage(error)}
          showIcon
        />
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/drivers')}
          style={{ marginTop: 16 }}
        >
          Quay lại danh sách
        </Button>
      </Card>
    );
  }

  const vehicles: VehicleDetail[] =
    data.vehicles && data.vehicles.length > 0
      ? data.vehicles
      : data.vehicle
        ? [data.vehicle]
        : [];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/drivers')}>
          Quay lại danh sách
        </Button>
      </Space>

      <Card
        title={
          <Space>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Chi tiết hồ sơ tài xế
            </Typography.Title>
            <StatusTag status={data.verificationStatus} />
          </Space>
        }
        extra={
          data.verificationStatus === 'PENDING' && (
            <Space>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={() => setRejectOpen(true)}
                loading={mutation.isPending}
              >
                Từ chối
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleApprove}
                loading={mutation.isPending}
              >
                Duyệt hồ sơ
              </Button>
            </Space>
          )
        }
      >
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Mã tài xế">{data.driverId}</Descriptions.Item>
          <Descriptions.Item label="Tên tài khoản">{data.username}</Descriptions.Item>
          <Descriptions.Item label="Số điện thoại">{data.phoneNumber}</Descriptions.Item>
          <Descriptions.Item label="Ngày đăng ký">
            {formatDateTime(data.createdAt)}
          </Descriptions.Item>
        </Descriptions>

        <Divider titlePlacement="start">Giấy tờ tuỳ thân &amp; Bằng lái</Divider>
        <DocumentPairSection title="Căn cước công dân (CCCD)" pair={data.idCard} />
        <DocumentPairSection title="Bằng lái xe máy" pair={data.licenseMotorbike} />
        <DocumentPairSection title="Bằng lái ô tô" pair={data.licenseCar} />
        {!hasValidPair(data.licenseMotorbike) && !hasValidPair(data.licenseCar) && (
          <DocumentPairSection title="Bằng lái xe" pair={data.license} />
        )}

        <Divider titlePlacement="start">Phương tiện đăng ký</Divider>
        {vehicles.length === 0 ? (
          <Typography.Text type="secondary">Không có thông tin phương tiện</Typography.Text>
        ) : (
          vehicles.map((v, idx) => (
            <Card
              key={v.id || idx}
              size="small"
              title={
                <Space>
                  <span>
                    {v.vehicleType === 'CAR' ? 'Ô tô' : 'Xe máy'}
                  </span>
                  <StatusTag status={v.status} />
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Image.PreviewGroup>
                <Row gutter={16}>
                  {v.registrationFront && (
                    <Col xs={24} sm={12}>
                      <Typography.Text
                        type="secondary"
                        style={{ display: 'block', marginBottom: 8 }}
                      >
                        Cà vẹt xe (Đăng ký xe)
                      </Typography.Text>
                      <Image
                        src={v.registrationFront}
                        alt="Cà vẹt xe"
                        style={{ maxHeight: 220, objectFit: 'contain', borderRadius: 8 }}
                      />
                    </Col>
                  )}
                  {v.plate && (
                    <Col xs={24} sm={12}>
                      <Typography.Text
                        type="secondary"
                        style={{ display: 'block', marginBottom: 8 }}
                      >
                        Ảnh biển số xe
                      </Typography.Text>
                      <Image
                        src={v.plate}
                        alt="Biển số xe"
                        style={{ maxHeight: 220, objectFit: 'contain', borderRadius: 8 }}
                      />
                    </Col>
                  )}
                </Row>
              </Image.PreviewGroup>
            </Card>
          ))
        )}
      </Card>

      <ReasonModal
        open={rejectOpen}
        title="Từ chối hồ sơ tài xế"
        label="Lý do từ chối"
        placeholder="Nhập lý do để tài xế biết và cập nhật lại hồ sơ..."
        confirmText="Xác nhận từ chối"
        loading={mutation.isPending}
        onCancel={() => setRejectOpen(false)}
        onSubmit={(reason) =>
          mutation.mutate({ status: 'REJECTED', rejectionReason: reason })
        }
      />
    </div>
  );
};
