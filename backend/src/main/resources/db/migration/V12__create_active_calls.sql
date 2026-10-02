-- Migration V12: Add active_calls table for real-time online voice call signaling
CREATE TABLE IF NOT EXISTS active_calls (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    caller_type VARCHAR(20) NOT NULL,
    caller_name VARCHAR(255) NULL,
    receiver_type VARCHAR(20) NOT NULL,
    receiver_name VARCHAR(255) NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'RINGING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    INDEX idx_active_calls_order_id (order_id),
    INDEX idx_active_calls_status (status)
);
