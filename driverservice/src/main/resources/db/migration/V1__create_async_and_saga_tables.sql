-- Bảng chống xử lý lặp lại event (Idempotent Consumer)
CREATE TABLE IF NOT EXISTS processed_events (
    event_id        VARCHAR(255) PRIMARY KEY,
    event_type      VARCHAR(100) NOT NULL,
    consumer_name   VARCHAR(100) NOT NULL,
    processed_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_processed_events_time ON processed_events (processed_at DESC);

-- Bảng lưu lịch sử rollback giao dịch bù trừ (SAGA Compensation Log)
CREATE TABLE IF NOT EXISTS saga_compensation_log (
    id              BIGSERIAL PRIMARY KEY,
    saga_id         VARCHAR(255)   NOT NULL,
    saga_type       VARCHAR(100)   NOT NULL,
    entity_id       VARCHAR(255)   NOT NULL,
    before_state    VARCHAR(100),
    after_state     VARCHAR(100),
    trigger_event   VARCHAR(255)   NOT NULL,
    result          VARCHAR(20)    NOT NULL DEFAULT 'SUCCESS',
    notes           TEXT,
    created_at      TIMESTAMP      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_saga_log_entity ON saga_compensation_log (entity_id);

-- Bổ sung cột average_rating vào drivers nếu chưa có
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS average_rating NUMERIC(2, 1) DEFAULT 5.0;
