-- Migration V11: Add order_messages table for customer and driver chat
CREATE TABLE IF NOT EXISTS order_messages (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    sender_type VARCHAR(20) NOT NULL,
    sender_id BIGINT NULL,
    sender_name VARCHAR(100) NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_messages_order_id (order_id)
);
