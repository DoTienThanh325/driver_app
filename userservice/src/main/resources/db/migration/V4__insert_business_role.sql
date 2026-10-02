-- V4__insert_business_role.sql

-- 1. Bỏ check constraint cũ chỉ cho phép ('CUSTOMER', 'DRIVER', 'ADMIN')
ALTER TABLE roles DROP CONSTRAINT IF EXISTS roles_role_code_check;

-- 2. Thêm check constraint mới cho phép thêm giá trị 'BUSINESS'
ALTER TABLE roles ADD CONSTRAINT roles_role_code_check 
    CHECK (role_code IN ('CUSTOMER', 'DRIVER', 'ADMIN', 'BUSINESS'));

-- 3. Chèn role BUSINESS vào bảng roles
INSERT INTO roles (id, role_code) VALUES
('00000000-0000-0000-0000-000000000004', 'BUSINESS')
ON CONFLICT (role_code) DO NOTHING;
