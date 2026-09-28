CREATE TABLE user_feedbacks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    rating DOUBLE PRECISION NOT NULL,
    comment TEXT,
    created_at TIMESTAMP NOT NULL
);

CREATE TABLE user_complainations (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    driver_id UUID NOT NULL,
    report_type VARCHAR(255) NOT NULL
        CHECK (report_type IN ('DRIVER_LATE', 'RECKLESS_DRIVING', 'WRONG_ROUTE',
                               'UNPROFESSIONAL_BEHAVIOR', 'VEHICLE_MISMATCH', 'OVERCHARGING', 'DRIVER_NO_SHOW')),
    status VARCHAR(32) NOT NULL
        CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECT')),
    created_at TIMESTAMP NOT NULL ,
    updated_at TIMESTAMP
);