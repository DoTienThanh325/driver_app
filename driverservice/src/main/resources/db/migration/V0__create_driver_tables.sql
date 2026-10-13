CREATE TABLE drivers (
     user_id UUID PRIMARY KEY,
     verification_status VARCHAR(20) NOT NULL
         CHECK (verification_status IN ('PENDING', 'APPROVED', 'REJECTED')),
     rejection_reason VARCHAR(255),
     created_at TIMESTAMP NOT NULL,
     approved_at TIMESTAMP
);

CREATE TABLE driver_documents (
      id UUID PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES drivers(user_id) ON DELETE CASCADE,
      document_type VARCHAR(30) NOT NULL
          CHECK (document_type IN ('ID_CARD', 'DRIVER_LICENSE')),
      front_img_url VARCHAR(255),
      back_img_url VARCHAR(255),
      created_at TIMESTAMP NOT NULL,
      updated_at TIMESTAMP NOT NULL
);

CREATE TABLE driver_vehicles (
     id UUID PRIMARY KEY,
     user_id UUID NOT NULL REFERENCES drivers(user_id) ON DELETE CASCADE,
     registration_front_img_url VARCHAR(255),
     plate_img_url VARCHAR(255),
     vehicle_type VARCHAR(20) NOT NULL
         CHECK (vehicle_type IN ('CAR', 'MOTORBIKE')),
     created_at TIMESTAMP NOT NULL,
     updated_at TIMESTAMP NOT NULL
);

CREATE TABLE driver_availability (
     id UUID PRIMARY KEY,
     user_id UUID NOT NULL REFERENCES drivers(user_id) ON DELETE CASCADE,
     status VARCHAR(20) NOT NULL
         CHECK (status IN ('OFFLINE', 'AVAILABLE', 'ON_TRIP', 'SUSPENDED'))
);

CREATE INDEX idx_driver_documents_user_id ON driver_documents(user_id);
CREATE INDEX idx_driver_vehicles_user_id ON driver_vehicles(user_id);
CREATE INDEX idx_driver_availability_user_id ON driver_availability(user_id);