ALTER TABLE user_feedbacks ADD COLUMN trip_id VARCHAR(255) NOT NULL;

CREATE INDEX idx_user_feedbacks_trip_id ON user_feedbacks (trip_id);
CREATE INDEX idx_user_feedbacks_driver_id ON user_feedbacks (driver_id);
