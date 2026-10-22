-- V2__insert_admin_users.sql
-- Password cho các tài khoản Admin bên dưới mặc định là: admin123
-- Được mã hóa bằng BCryptPasswordEncoder

INSERT INTO users (id, username, password, phone_number, status, created_at, updated_at) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    'admin1',
    '$2a$10$7V9OJfv3XMySW5JndD3Iy.RRBvwliOylAMLiV88Yn76BTwOTbP9PS',
    '0900000001',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    '10000000-0000-0000-0000-000000000002',
    'admin2',
    '$2a$10$7V9OJfv3XMySW5JndD3Iy.RRBvwliOylAMLiV88Yn76BTwOTbP9PS',
    '0900000002',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT DO NOTHING;

-- Gán quyền ADMIN (Role ID: 00000000-0000-0000-0000-000000000003 trong V1) cho các tài khoản Admin vừa tạo
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, '00000000-0000-0000-0000-000000000003'::uuid
FROM users u WHERE u.username IN ('admin1', 'admin2')
ON CONFLICT (user_id, role_id) DO NOTHING;
