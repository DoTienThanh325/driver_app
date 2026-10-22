-- V3__insert_sample_drivers_and_customers.sql
-- Mật khẩu mặc định cho tất cả tài khoản bên dưới: admin123
-- Hash BCrypt: $2a$10$7V9OJfv3XMySW5JndD3Iy.RRBvwliOylAMLiV88Yn76BTwOTbP9PS

-- 1. Tạo các tài khoản Driver & Customer
INSERT INTO users (id, username, password, phone_number, status, created_at, updated_at) VALUES
-- Tài xế 1 (AVAILABLE - để test nhận chuyến)
(
    '20000000-0000-0000-0000-000000000001',
    'driver1',
    '$2a$10$7V9OJfv3XMySW5JndD3Iy.RRBvwliOylAMLiV88Yn76BTwOTbP9PS',
    '0911000001',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Tài xế 2 (AVAILABLE - để test 2 tài xế tranh cuốc xe)
(
    '20000000-0000-0000-0000-000000000002',
    'driver2',
    '$2a$10$7V9OJfv3XMySW5JndD3Iy.RRBvwliOylAMLiV88Yn76BTwOTbP9PS',
    '0911000002',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Tài xế 3 (OFFLINE - để test bắt lỗi tài xế chưa sẵn sàng)
(
    '20000000-0000-0000-0000-000000000003',
    'driver3',
    '$2a$10$7V9OJfv3XMySW5JndD3Iy.RRBvwliOylAMLiV88Yn76BTwOTbP9PS',
    '0911000003',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
-- Khách hàng mẫu (Customer - dùng để đặt chuyến)
(
    '30000000-0000-0000-0000-000000000001',
    'customer1',
    '$2a$10$7V9OJfv3XMySW5JndD3Iy.RRBvwliOylAMLiV88Yn76BTwOTbP9PS',
    '0922000001',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- 2. Gán Role
-- DRIVER role: 00000000-0000-0000-0000-000000000002
-- CUSTOMER role: 00000000-0000-0000-0000-000000000001
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, '00000000-0000-0000-0000-000000000002'::uuid
FROM users u WHERE u.username IN ('driver1', 'driver2', 'driver3')
ON CONFLICT (user_id, role_id) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, '00000000-0000-0000-0000-000000000001'::uuid
FROM users u WHERE u.username = 'customer1'
ON CONFLICT (user_id, role_id) DO NOTHING;
