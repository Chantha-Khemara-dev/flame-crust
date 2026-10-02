-- 1. Insert new Roles
INSERT IGNORE INTO roles (name, permissions) VALUES ('INVENTORY_STAFF', '["inventory_read", "inventory_write"]');
INSERT IGNORE INTO roles (name, permissions) VALUES ('CASHIER', '["pos_access", "orders_create"]');

-- 2. Insert Default Accounts (Password: password123)
-- We need to find the role IDs first.
SET @admin_role_id = (SELECT id FROM roles WHERE name = 'Admin' LIMIT 1);
SET @inv_role_id = (SELECT id FROM roles WHERE name = 'INVENTORY_STAFF' LIMIT 1);
SET @cashier_role_id = (SELECT id FROM roles WHERE name = 'CASHIER' LIMIT 1);

INSERT IGNORE INTO users (role_id, name, email, password_hash, status) 
VALUES (@admin_role_id, 'System Admin', 'admin@restaurant.com', '$2b$12$P3JsKKRULSV6cwMT.0gtG.LI.A8jWgnA9CIgTDBd/g.QJg7EU6/za', 'ACTIVE');

INSERT IGNORE INTO users (role_id, name, email, password_hash, status) 
VALUES (@inv_role_id, 'Inventory Staff', 'inventory@restaurant.com', '$2b$12$P3JsKKRULSV6cwMT.0gtG.LI.A8jWgnA9CIgTDBd/g.QJg7EU6/za', 'ACTIVE');

INSERT IGNORE INTO users (role_id, name, email, password_hash, status) 
VALUES (@cashier_role_id, 'Cashier Staff', 'cashier@restaurant.com', '$2b$12$P3JsKKRULSV6cwMT.0gtG.LI.A8jWgnA9CIgTDBd/g.QJg7EU6/za', 'ACTIVE');

-- 3. Create inventory_transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    ingredient_id BIGINT NOT NULL,
    branch_id BIGINT NOT NULL DEFAULT 1,
    transaction_type VARCHAR(50) NOT NULL, -- 'PURCHASE_IN', 'ORDER_USAGE', 'ADJUSTMENT', 'WASTE'
    quantity DECIMAL(10,3) NOT NULL,
    unit_price DECIMAL(10,2),
    reference_id VARCHAR(100),
    note TEXT,
    created_by BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_inv_tx_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE
);

-- Index for fast reporting
CREATE INDEX idx_inv_tx_type_date ON inventory_transactions(transaction_type, created_at);
CREATE INDEX idx_inv_tx_ingredient ON inventory_transactions(ingredient_id, created_at);
