-- V2: Thêm cột trip_id và bổ sung CUSTOMER_NO_SHOW vào report_type check constraint trong bảng user_complainations

ALTER TABLE user_complainations
    ADD COLUMN trip_id VARCHAR(255) NOT NULL DEFAULT '';

-- Gỡ bỏ DEFAULT sau khi đã thêm cột cho các record cũ (nếu có)
ALTER TABLE user_complainations
    ALTER COLUMN trip_id DROP DEFAULT;

-- Cập nhật CHECK constraint cho cột report_type
ALTER TABLE user_complainations
    DROP CONSTRAINT IF EXISTS user_complainations_report_type_check;

ALTER TABLE user_complainations
    ADD CONSTRAINT user_complainations_report_type_check
    CHECK (report_type IN (
        'DRIVER_LATE',
        'RECKLESS_DRIVING',
        'WRONG_ROUTE',
        'UNPROFESSIONAL_BEHAVIOR',
        'VEHICLE_MISMATCH',
        'OVERCHARGING',
        'DRIVER_NO_SHOW',
        'CUSTOMER_NO_SHOW'
    ));
