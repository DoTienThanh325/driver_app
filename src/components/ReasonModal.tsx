import React, { useEffect } from 'react';
import { Form, Input, Modal } from 'antd';

interface ReasonModalProps {
  open: boolean;
  title: string;
  label: string;
  placeholder: string;
  confirmText?: string;
  confirmDanger?: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void;
}

export const ReasonModal: React.FC<ReasonModalProps> = ({
  open,
  title,
  label,
  placeholder,
  confirmText = 'Xác nhận',
  confirmDanger = true,
  loading = false,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm<{ reason: string }>();

  useEffect(() => {
    if (open) {
      form.resetFields();
    }
  }, [open, form]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onSubmit(values.reason.trim());
  };

  return (
    <Modal
      open={open}
      title={title}
      okText={confirmText}
      cancelText="Huỷ"
      okButtonProps={{ danger: confirmDanger, loading }}
      onCancel={onCancel}
      onOk={handleOk}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="reason"
          label={label}
          rules={[
            { required: true, message: 'Vui lòng nhập lý do' },
            { whitespace: true, message: 'Lý do không được chỉ chứa khoảng trắng' },
          ]}
        >
          <Input.TextArea rows={3} placeholder={placeholder} maxLength={500} showCount />
        </Form.Item>
      </Form>
    </Modal>
  );
};
