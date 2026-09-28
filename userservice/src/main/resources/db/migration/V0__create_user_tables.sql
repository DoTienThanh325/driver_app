CREATE TABLE users (
       id UUID PRIMARY KEY,
       username VARCHAR(100) NOT NULL UNIQUE,
       password VARCHAR(255) NOT NULL,
       phone_number VARCHAR(20) NOT NULL UNIQUE,
       status VARCHAR(20) NOT NULL
           CHECK (status IN ('ACTIVE', 'BANNED')),
       created_at TIMESTAMP NOT NULL,
       updated_at TIMESTAMP NOT NULL
);

CREATE TABLE roles (
       id UUID PRIMARY KEY,
       role_code VARCHAR(20) NOT NULL UNIQUE
           CHECK (role_code IN ('CUSTOMER', 'DRIVER', 'ADMIN'))
);

CREATE TABLE user_roles (
        user_id UUID NOT NULL REFERENCES users(id),
        role_id UUID NOT NULL REFERENCES roles(id),
        PRIMARY KEY (user_id, role_id)
);

CREATE TABLE refresh_tokens (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id),
        refresh_token VARCHAR(255) NOT NULL UNIQUE,
        expired_at TIMESTAMP NOT NULL,
        revoked_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL
);

