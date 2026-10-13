-- V2: Thêm cột trip_id vào bảng user_complainations và thêm indexes

ALTER TABLE user_complainations
    ADD COLUMN trip_id VARCHAR(255) NOT NULL DEFAULT '';

-- Gỡ bỏ DEFAULT sau khi đã thêm cột cho các record cũ (nếu có)
ALTER TABLE user_complainations
    ALTER COLUMN trip_id DROP DEFAULT;

CREATE INDEX idx_user_complainations_driver_user_id ON user_complainations (driver_user_id);
CREATE INDEX idx_user_complainations_trip_id ON user_complainations (trip_id);
