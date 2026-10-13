CREATE TABLE user_feedbacks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    trip_id VARCHAR(255) NOT NULL,
    rating DOUBLE PRECISION NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_user_feedbacks_trip_id ON user_feedbacks (trip_id);
CREATE INDEX idx_user_feedbacks_driver_id ON user_feedbacks (driver_id);

CREATE TABLE user_complainations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    trip_id VARCHAR(255) NOT NULL,
    report_type VARCHAR(255) NOT NULL
        CHECK (report_type IN (
            'DRIVER_LATE',
            'RECKLESS_DRIVING',
            'WRONG_ROUTE',
            'UNPROFESSIONAL_BEHAVIOR',
            'VEHICLE_MISMATCH',
            'OVERCHARGING',
            'DRIVER_NO_SHOW',
            'CUSTOMER_NO_SHOW'
        )),
    status VARCHAR(32) NOT NULL
        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECT', 'REJECTED')),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP
);

CREATE INDEX idx_user_complainations_trip_id ON user_complainations (trip_id);
CREATE INDEX idx_user_complainations_driver_id ON user_complainations (driver_id);
