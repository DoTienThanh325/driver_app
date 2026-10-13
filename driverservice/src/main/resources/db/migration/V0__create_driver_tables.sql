CREATE TABLE drivers (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    verification_status VARCHAR(20) NOT NULL
        CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    rejection_reason VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    approved_at TIMESTAMP
);

CREATE TABLE driver_documents (
    id UUID PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers(user_id),
    document_type VARCHAR(30) NOT NULL
        CHECK (document_type IN ('ID_CARD', 'DRIVER_LICENSE')),
    front_img_url VARCHAR(255),
    back_img_url VARCHAR(255),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE driver_vehicles (
    id UUID PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers(user_id),
    registration_front_img_url VARCHAR(255),
    plate_img_url VARCHAR(255),
    vehicle_type VARCHAR(20) NOT NULL
        CHECK (vehicle_type IN ('CAR', 'MOTORBIKE')),
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE TABLE driver_availability (
    id UUID PRIMARY KEY,
    driver_id UUID NOT NULL UNIQUE REFERENCES drivers(user_id),
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('OFFLINE', 'AVAILABLE', 'ON_TRIP', 'SUSPENDED'))
);

-- Sample Data (chuẩn hóa driver_id = user_id)
INSERT INTO drivers (id, user_id, verification_status, rejection_reason, created_at, approved_at) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'APPROVED',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'a0000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'APPROVED',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'a0000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    'APPROVED',
    NULL,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO driver_vehicles (id, driver_id, registration_front_img_url, plate_img_url, vehicle_type, created_at, updated_at) VALUES
(
    'b0000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'https://example.com/reg_1.jpg',
    'https://example.com/plate_29A12345.jpg',
    'MOTORBIKE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'b0000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'https://example.com/reg_2.jpg',
    'https://example.com/plate_59B67890.jpg',
    'MOTORBIKE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'b0000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    'https://example.com/reg_3.jpg',
    'https://example.com/plate_30H99999.jpg',
    'CAR',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO driver_documents (id, driver_id, document_type, front_img_url, back_img_url, created_at, updated_at) VALUES
(
    'c0000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'ID_CARD',
    'https://example.com/cccd_front_1.jpg',
    'https://example.com/cccd_back_1.jpg',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'c0000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'ID_CARD',
    'https://example.com/cccd_front_2.jpg',
    'https://example.com/cccd_back_2.jpg',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO driver_availability (id, driver_id, status) VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'AVAILABLE'
),
(
    'd0000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'AVAILABLE'
),
(
    'd0000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    'OFFLINE'
)
ON CONFLICT (id) DO NOTHING;
