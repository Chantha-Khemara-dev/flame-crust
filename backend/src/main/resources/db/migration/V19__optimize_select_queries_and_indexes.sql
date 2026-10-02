-- Migration V19: High-performance composite indexes for lightning-fast SELECT queries
-- Speeds up order tracking, driver assignments, chat message polling, reviews, and product catalogue

CREATE INDEX idx_orders_driver_status ON orders (driver_id, status);
CREATE INDEX idx_order_messages_order_created ON order_messages (order_id, created_at);
CREATE INDEX idx_reviews_product_created ON reviews (product_id, created_at);
CREATE INDEX idx_products_active_id ON products (active, id);
CREATE INDEX idx_categories_active_sort ON categories (active, sort_order);
CREATE INDEX idx_active_calls_order_status ON active_calls (order_id, status, created_at);
