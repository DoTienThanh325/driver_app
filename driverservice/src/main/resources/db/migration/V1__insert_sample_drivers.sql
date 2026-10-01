-- V1__insert_sample_drivers.sql
-- Thêm dữ liệu tài xế, giấy tờ, phương tiện và trạng thái sẵn sàng (availability)

-- 1. Insert bảng drivers (liên kết với user_id bên userservice)
INSERT INTO drivers (id, user_id, verification_status, rejection_reason, created_at, approved_at) VALUES
-- Tài xế 1
(
    'a0000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'APPROVED',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Tài xế 2
(
    'a0000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'APPROVED',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Tài xế 3
(
    'a0000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    'APPROVED',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert bảng driver_vehicles (Phương tiện của tài xế)
INSERT INTO driver_vehicles (id, driver_id, registration_front_img_url, plate_img_url, vehicle_type, created_at, updated_at) VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'https://example.com/reg_1.jpg',
    'https://example.com/plate_29A12345.jpg',
    'MOTORBIKE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    'https://example.com/reg_2.jpg',
    'https://example.com/plate_59B67890.jpg',
    'MOTORBIKE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000003',
    'https://example.com/reg_3.jpg',
    'https://example.com/plate_30H99999.jpg',
    'CAR',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- 3. Insert bảng driver_documents (Giấy tờ của tài xế)
INSERT INTO driver_documents (id, driver_id, document_type, front_img_url, back_img_url, created_at, updated_at) VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'ID_CARD',
    'https://example.com/cccd_front_1.jpg',
    'https://example.com/cccd_back_1.jpg',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'c0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    'ID_CARD',
    'https://example.com/cccd_front_2.jpg',
    'https://example.com/cccd_back_2.jpg',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- 4. Insert bảng driver_availability (Trạng thái sẵn sàng)
-- Tài xế 1 & 2: AVAILABLE (để test nhận chuyến và tranh chấp race condition)
-- Tài xế 3: OFFLINE (để test trường hợp từ chối nhận chuyến khi chưa online)
INSERT INTO driver_availability (id, driver_id, status) VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'AVAILABLE'
),
(
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000002',
    'AVAILABLE'
),
(
    'd0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000003',
    'OFFLINE'
)
ON CONFLICT (id) DO NOTHING;
