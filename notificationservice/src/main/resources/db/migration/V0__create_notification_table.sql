CREATE TABLE notifications (
       id UUID PRIMARY KEY,
       title VARCHAR(255) NOT NULL,
       content TEXT NOT NULL,
       user_id UUID NOT NULL,
       expired_at TIMESTAMP NOT NULL,
       created_at TIMESTAMP NOT NULL
);