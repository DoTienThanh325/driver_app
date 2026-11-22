-- Bảng đánh giá Nhà hàng
CREATE TABLE IF NOT EXISTS restaurant_feedbacks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    restaurant_id VARCHAR(255) NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    rating DOUBLE PRECISION NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    tags TEXT,
    comment TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_restaurant_feedback_order UNIQUE (user_id, order_id, restaurant_id)
);

CREATE INDEX IF NOT EXISTS idx_restaurant_feedbacks_restaurant_id ON restaurant_feedbacks (restaurant_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_feedbacks_order_id ON restaurant_feedbacks (order_id);

-- Bảng đánh giá Món ăn
CREATE TABLE IF NOT EXISTS food_feedbacks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    food_id VARCHAR(255) NOT NULL,
    order_id VARCHAR(255) NOT NULL,
    rating DOUBLE PRECISION NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    tags TEXT,
    comment TEXT,
    created_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_food_feedback_order UNIQUE (user_id, order_id, food_id)
);

CREATE INDEX IF NOT EXISTS idx_food_feedbacks_food_id ON food_feedbacks (food_id);
CREATE INDEX IF NOT EXISTS idx_food_feedbacks_order_id ON food_feedbacks (order_id);

-- Bổ sung cột tags và constraint unique cho bảng user_feedbacks (Tài xế)
ALTER TABLE user_feedbacks ADD COLUMN IF NOT EXISTS tags TEXT;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_feedbacks_trip') THEN
        ALTER TABLE user_feedbacks ADD CONSTRAINT uq_user_feedbacks_trip UNIQUE (user_id, trip_id);
    END IF;
END $$;
