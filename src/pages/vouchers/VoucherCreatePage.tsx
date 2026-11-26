import React from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import { GiftOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { voucherApi } from '../../api/voucherApi';
import { MOBILE_COLORS } from '../../theme/themeConfig';
import type { CreateVoucherRequest, VoucherType } from '../../types';

const { Title, Text } = Typography;

interface VoucherFormValues {
  type: VoucherType;
  discount: number;
  maxDiscount: number;
  minValue: number;
  expiredAt: Dayjs;
}

interface CreatedVoucherRecord extends CreateVoucherRequest {
  key: string;
  providerType: 'APP';
  createdAt: string;
}

function formatVnd(value?: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '0 đ';
  return `${value.toLocaleString('vi-VN')} đ`;
}

export const VoucherCreatePage: React.FC = () => {
  const [form] = Form.useForm<VoucherFormValues>();
  const [createdList, setCreatedList] = React.useState<CreatedVoucherRecord[]>([]);

  const watchedValues = Form.useWatch([], form);

  const createMutation = useMutation({
    mutationFn: (payload: CreateVoucherRequest) => voucherApi.createAppVoucher(payload),
    onSuccess: (res, payload) => {
      message.success(res.message || 'Tạo voucher thành công');
      setCreatedList((prev) => [
        {
          ...payload,
          key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          providerType: 'APP',
          createdAt: dayjs().format('DD/MM/YYYY HH:mm:ss'),
        },
        ...prev,
      ]);
      form.resetFields();
    },
    onError: (err: unknown) => {
      const apiMsg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Không thể tạo voucher. Vui lòng kiểm tra lại thông tin.';
      message.error(apiMsg);
    },
  });

  const handleFinish = (values: VoucherFormValues) => {
    if (!values.expiredAt || !values.expiredAt.isAfter(dayjs())) {
      message.warning('Thời gian hết hạn phải ở trong tương lai');
      return;
    }

    createMutation.mutate({
      type: values.type,
      discount: values.discount,
      maxDiscount: values.maxDiscount,
      minValue: values.minValue,
      expiredAt: values.expiredAt.format('YYYY-MM-DDTHH:mm:ss'),
    });
  };

  const previewType: VoucherType = watchedValues?.type || 'TRANSIT';
  const previewDiscount = watchedValues?.discount ?? 15;
  const previewMaxDiscount = watchedValues?.maxDiscount ?? 30000;
  const previewMinValue = watchedValues?.minValue ?? 0;
  const previewExpiredAt = watchedValues?.expiredAt;

  return (
    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
      <div>
        <Space align="center" size="small">
          <Title level={3} style={{ margin: 0 }}>
            Phát hành Voucher hệ thống
          </Title>
          <Tag color="cyan" style={{ fontWeight: 600 }}>
            providerType: APP
          </Tag>
        </Space>
        <Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
          Tạo mã giảm giá toàn sàn áp dụng cho dịch vụ đặt xe (TRANSIT) hoặc giao đồ ăn (FOOD).
        </Text>
      </div>

      <Alert
        type="info"
        showIcon
        title="Quy tắc phát hành Voucher hệ thống (APP)"
        description={
          <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
            <li>
              Hệ thống tự động gán <strong>voucherProviderType = APP</strong> dựa trên quyền{' '}
              <Tag>ADMIN</Tag>.
            </li>
            <li>
              Nếu <strong>Đơn tối thiểu = 0 đ</strong>, mọi khách hàng mới đều có thể nhận tối thiểu 1 voucher.
            </li>
            <li>
              Nếu <strong>Đơn tối thiểu &gt; 0 đ</strong>, số lượt nhận phụ thuộc vào số chuyến đi đã hoàn thành của khách hàng.
            </li>
          </ul>
        }
      />

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={14}>
          <Card title="Thông tin Voucher mới" styles={{ body: { paddingTop: 20 } }}>
            <Form<VoucherFormValues>
              form={form}
              layout="vertical"
              initialValues={{
                type: 'TRANSIT',
                discount: 15,
                maxDiscount: 30000,
                minValue: 0,
                expiredAt: dayjs().add(7, 'day').hour(23).minute(59).second(0),
              }}
              onFinish={handleFinish}
            >
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Loại dịch vụ áp dụng"
                    name="type"
                    rules={[{ required: true, message: 'Vui lòng chọn loại dịch vụ' }]}
                  >
                    <Select
                      options={[
                        { value: 'TRANSIT', label: 'Chuyến xe (TRANSIT)' },
                        { value: 'FOOD', label: 'Giao đồ ăn (FOOD)' },
                      ]}
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Phần trăm giảm giá (%)"
                    name="discount"
                    rules={[
                      { required: true, message: 'Vui lòng nhập phần trăm giảm giá' },
                      {
                        type: 'number',
                        min: 0.01,
                        max: 100,
                        message: 'Giảm giá phải từ 0.01% đến 100%',
                      },
                    ]}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0.01}
                      max={100}
                      step={1}
                      suffix="%"
                      placeholder="VD: 15"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Giảm tối đa (VNĐ)"
                    name="maxDiscount"
                    rules={[
                      { required: true, message: 'Vui lòng nhập mức giảm tối đa' },
                      { type: 'number', min: 1, message: 'Giảm tối đa phải lớn hơn 0' },
                    ]}
                  >
                    <InputNumber<number>
                      style={{ width: '100%' }}
                      min={1}
                      step={1000}
                      formatter={(val) =>
                        val ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
                      }
                      parser={(val) => Number((val || '').replace(/\./g, ''))}
                      suffix="đ"
                      placeholder="VD: 30.000"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Giá trị đơn tối thiểu (VNĐ)"
                    name="minValue"
                    rules={[
                      { required: true, message: 'Vui lòng nhập giá trị đơn tối thiểu' },
                      { type: 'number', min: 0, message: 'Giá trị đơn tối thiểu >= 0' },
                    ]}
                  >
                    <InputNumber<number>
                      style={{ width: '100%' }}
                      min={0}
                      step={5000}
                      formatter={(val) =>
                        val !== undefined && val !== null
                          ? `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
                          : ''
                      }
                      parser={(val) => Number((val || '').replace(/\./g, ''))}
                      suffix="đ"
                      placeholder="VD: 50.000"
                    />
                  </Form.Item>
                </Col>

                <Col xs={24}>
                  <Form.Item
                    label="Thời gian hết hạn"
                    name="expiredAt"
                    rules={[{ required: true, message: 'Vui lòng chọn thời gian hết hạn' }]}
                  >
                    <DatePicker
                      showTime
                      style={{ width: '100%' }}
                      format="DD/MM/YYYY HH:mm:ss"
                      disabledDate={(current) =>
                        Boolean(current && current.isBefore(dayjs().startOf('day')))
                      }
                      placeholder="Chọn ngày giờ hết hạn"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<PlusOutlined />}
                  loading={createMutation.isPending}
                >
                  Phát hành Voucher APP
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => form.resetFields()}
                  disabled={createMutation.isPending}
                >
                  Đặt lại
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Xem trước hiển thị (Preview)">
            <div
              style={{
                border: `1.5px dashed ${MOBILE_COLORS.primary}`,
                borderRadius: 12,
                padding: 18,
                background: '#F0FDFA',
              }}
            >
              <Space orientation="vertical" size={8} style={{ width: '100%' }}>
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Space size={6}>
                    <GiftOutlined style={{ color: MOBILE_COLORS.primary, fontSize: 18 }} />
                    <Text strong style={{ color: MOBILE_COLORS.primary }}>
                      VOUCHER HỆ THỐNG (APP)
                    </Text>
                  </Space>
                  <Tag color={previewType === 'FOOD' ? 'orange' : 'blue'}>
                    {previewType === 'FOOD' ? 'Đồ ăn (FOOD)' : 'Chuyến xe (TRANSIT)'}
                  </Tag>
                </Space>

                <Title level={2} style={{ margin: '4px 0', color: MOBILE_COLORS.text }}>
                  Giảm {previewDiscount}%
                </Title>

                <Text>
                  Giảm tối đa <strong>{formatVnd(previewMaxDiscount)}</strong>
                </Text>
                <Text type="secondary">
                  Áp dụng cho đơn từ <strong>{formatVnd(previewMinValue)}</strong>
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Hết hạn:{' '}
                  {previewExpiredAt
                    ? previewExpiredAt.format('DD/MM/YYYY HH:mm')
                    : 'Chưa chọn'}
                </Text>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title={`Voucher APP vừa phát hành trong phiên (${createdList.length})`}>
        <Table<CreatedVoucherRecord>
          dataSource={createdList}
          pagination={{ pageSize: 5 }}
          locale={{ emptyText: 'Chưa có voucher nào được phát hành trong phiên này' }}
          columns={[
            {
              title: 'Nhà phát hành',
              dataIndex: 'providerType',
              render: (val: string) => <Tag color="cyan">{val}</Tag>,
            },
            {
              title: 'Dịch vụ',
              dataIndex: 'type',
              render: (val: VoucherType) => (
                <Tag color={val === 'FOOD' ? 'orange' : 'blue'}>
                  {val === 'FOOD' ? 'Đồ ăn (FOOD)' : 'Chuyến xe (TRANSIT)'}
                </Tag>
              ),
            },
            {
              title: 'Giảm giá',
              dataIndex: 'discount',
              render: (val: number) => <Text strong>{val}%</Text>,
            },
            {
              title: 'Giảm tối đa',
              dataIndex: 'maxDiscount',
              render: (val: number) => formatVnd(val),
            },
            {
              title: 'Đơn tối thiểu',
              dataIndex: 'minValue',
              render: (val: number) => formatVnd(val),
            },
            {
              title: 'Hết hạn',
              dataIndex: 'expiredAt',
              render: (val: string) => dayjs(val).format('DD/MM/YYYY HH:mm'),
            },
            {
              title: 'Thời điểm tạo',
              dataIndex: 'createdAt',
            },
          ]}
        />
      </Card>
    </Space>
  );
};
