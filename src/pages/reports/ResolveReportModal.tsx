import React, { useEffect } from 'react';
import { Checkbox, Form, Input, Modal, Radio, Space, Typography, message } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { complaintApi } from '../../api/complaintApi';
import { userAdminApi } from '../../api/userAdminApi';
import { extractErrorMessage } from '../../utils/format';
import type { ComplaintDetail } from '../../types';

interface ResolveReportModalProps {
  open: boolean;
  complaint: ComplaintDetail;
  onCancel: () => void;
  onSuccess: () => void;
}

interface ResolveFormValues {
  status: 'ACCEPTED' | 'REJECTED';
  adminNote?: string;
  shouldBan: boolean;
  banTarget: 'DRIVER' | 'CUSTOMER';
  banReason?: string;
}

export const ResolveReportModal: React.FC<ResolveReportModalProps> = ({
  open,
  complaint,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm<ResolveFormValues>();
  const status = Form.useWatch('status', form);
  const shouldBan = Form.useWatch('shouldBan', form);

  useEffect(() => {
    if (open) {
      const defaultTarget =
        complaint.reportType === 'CUSTOMER_NO_SHOW' ? 'CUSTOMER' : 'DRIVER';
      form.setFieldsValue({
        status: 'ACCEPTED',
        adminNote: '',
        shouldBan: false,
        banTarget: defaultTarget,
        banReason: '',
      });
    }
  }, [open, complaint, form]);

  const mutation = useMutation({
    mutationFn: async (values: ResolveFormValues) => {
      if (values.status === 'ACCEPTED' && values.shouldBan) {
        const targetUserId =
          values.banTarget === 'CUSTOMER' ? complaint.customer.id : complaint.driver.id;
        await userAdminApi.banUser(targetUserId, {
          reason: (values.banReason || '').trim(),
        });
      }

      await complaintApi.updateStatus(complaint.id, {
        status: values.status,
        adminNote: values.adminNote?.trim() || undefined,
      });
    },
    onSuccess: () => {
      message.success('Đã xử lý báo cáo thành công');
      onSuccess();
    },
    onError: (err) => {
      message.error(extractErrorMessage(err, 'Xử lý báo cáo thất bại'));
    },
  });

  const handleOk = async () => {
    const values = await form.validateFields();
    mutation.mutate(values);
  };

  return (
    <Modal
      open={open}
      title="Xử lý báo cáo vi phạm"
      okText="Xác nhận xử lý"
      cancelText="Huỷ"
      okButtonProps={{ loading: mutation.isPending }}
      onCancel={onCancel}
      onOk={handleOk}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="status" label="Kết quả xử lý" rules={[{ required: true }]}>
          <Radio.Group>
            <Radio value="ACCEPTED">Chấp nhận báo cáo</Radio>
            <Radio value="REJECTED">Từ chối báo cáo</Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="adminNote"
          label="Ghi chú xử lý"
          rules={
            status === 'REJECTED'
              ? [
                  { required: true, message: 'Vui lòng nhập lý do từ chối' },
                  { whitespace: true, message: 'Ghi chú không được để trống' },
                ]
              : []
          }
        >
          <Input.TextArea
            rows={3}
            placeholder={
              status === 'REJECTED'
                ? 'Bắt buộc nhập lý do từ chối báo cáo...'
                : 'Ghi chú thêm (không bắt buộc)...'
            }
            maxLength={500}
            showCount
          />
        </Form.Item>

        {status === 'ACCEPTED' && (
          <>
            <Form.Item name="shouldBan" valuePropName="checked" style={{ marginBottom: 12 }}>
              <Checkbox>Khoá tài khoản vi phạm</Checkbox>
            </Form.Item>

            {shouldBan && (
              <Space
                direction="vertical"
                style={{
                  width: '100%',
                  padding: 12,
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: 8,
                }}
              >
                <Form.Item
                  name="banTarget"
                  label="Đối tượng bị khoá"
                  rules={[{ required: true }]}
                  style={{ marginBottom: 8 }}
                >
                  <Radio.Group>
                    <Radio value="DRIVER">
                      Tài xế ({complaint.driver.username || complaint.driver.id})
                    </Radio>
                    <Radio value="CUSTOMER">
                      Khách hàng ({complaint.customer.username || complaint.customer.id})
                    </Radio>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  name="banReason"
                  label="Lý do khoá tài khoản"
                  rules={[
                    { required: true, message: 'Vui lòng nhập lý do khoá tài khoản' },
                    { whitespace: true, message: 'Lý do không được để trống' },
                  ]}
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea
                    rows={2}
                    placeholder="Nhập lý do khoá tài khoản..."
                    maxLength={500}
                  />
                </Form.Item>

                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Hệ thống sẽ khoá tài khoản trước, sau đó mới cập nhật trạng thái báo cáo.
                </Typography.Text>
              </Space>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
};
