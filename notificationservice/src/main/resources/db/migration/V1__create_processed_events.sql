CREATE TABLE IF NOT EXISTS processed_events (
    event_id        VARCHAR(255) PRIMARY KEY,
    event_type      VARCHAR(100) NOT NULL,
    consumer_name   VARCHAR(100) NOT NULL,
    processed_at    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificationservice_processed_events_time ON processed_events (processed_at DESC);
