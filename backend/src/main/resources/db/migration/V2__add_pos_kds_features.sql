-- ==============================================================================
-- Flame & Crust V2 Schema Migration
-- ==============================================================================
-- This file contains all the missing columns and tables requested to fully 
-- support POS, Kitchen Display System (KDS), Dine-in, Drivers, and Inventory.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 3. Dine-in Tables (Create first since orders will reference it)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tables (
    id BIGINT NOT NULL AUTO_INCREMENT,
    branch_id BIGINT NOT NULL,
    table_no VARCHAR(20) NOT NULL,
    capacity INT NOT NULL DEFAULT 2,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    PRIMARY KEY (id),
    CONSTRAINT fk_tables_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    UNIQUE KEY uk_tables_branch_no (branch_id, table_no)
);

-- ------------------------------------------------------------------------------
-- 1. POS / orders Updates
-- ------------------------------------------------------------------------------
-- Make customer_id nullable for guest checkouts
ALTER TABLE orders MODIFY COLUMN customer_id BIGINT NULL;

-- Add order type (DINE_IN, TAKEAWAY, DELIVERY)
ALTER TABLE orders ADD COLUMN order_type VARCHAR(30) NOT NULL DEFAULT 'DELIVERY';

-- Add staff_id for POS orders placed by staff
ALTER TABLE orders ADD COLUMN staff_id BIGINT NULL;
ALTER TABLE orders ADD CONSTRAINT fk_orders_staff FOREIGN KEY (staff_id) REFERENCES users(id);

-- Add table_id for Dine-in orders
ALTER TABLE orders ADD COLUMN table_id BIGINT NULL;
ALTER TABLE orders ADD CONSTRAINT fk_orders_table FOREIGN KEY (table_id) REFERENCES tables(id);

-- Add driver commission
ALTER TABLE orders ADD COLUMN driver_commission DECIMAL(10, 2) NOT NULL DEFAULT 0.00;


-- ------------------------------------------------------------------------------
-- 2. Cash Register Sessions
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_register_sessions (
    id BIGINT NOT NULL AUTO_INCREMENT,
    branch_id BIGINT NOT NULL,
    opened_by BIGINT NOT NULL,
    closed_by BIGINT NULL,
    opening_amount DECIMAL(10, 2) NOT NULL,
    closing_amount DECIMAL(10, 2) NULL,
    opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_crs_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_crs_opened FOREIGN KEY (opened_by) REFERENCES users(id),
    CONSTRAINT fk_crs_closed FOREIGN KEY (closed_by) REFERENCES users(id)
);

-- ------------------------------------------------------------------------------
-- 4. Kitchen Display System (order_items)
-- ------------------------------------------------------------------------------
ALTER TABLE order_items ADD COLUMN status VARCHAR(30) NOT NULL DEFAULT 'PENDING';
ALTER TABLE order_items ADD CONSTRAINT chk_order_items_status CHECK (status IN ('PENDING', 'COOKING', 'READY', 'CANCELLED'));
ALTER TABLE order_items ADD COLUMN item_notes VARCHAR(255) NULL;

-- ------------------------------------------------------------------------------
-- 5. Ingredients & Recipes
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ingredients (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_ingredients_name (name)
);

CREATE TABLE IF NOT EXISTS ingredient_stock (
    id BIGINT NOT NULL AUTO_INCREMENT,
    branch_id BIGINT NOT NULL,
    ingredient_id BIGINT NOT NULL,
    stock_quantity DECIMAL(10,3) NOT NULL DEFAULT 0,
    low_stock_threshold DECIMAL(10,3) NOT NULL DEFAULT 5,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_ing_stock_branch FOREIGN KEY (branch_id) REFERENCES branches(id) ON DELETE CASCADE,
    CONSTRAINT fk_ing_stock_ing FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    UNIQUE KEY uk_ing_stock (branch_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS product_recipes (
    id BIGINT NOT NULL AUTO_INCREMENT,
    variant_id BIGINT NOT NULL,
    ingredient_id BIGINT NOT NULL,
    quantity_needed DECIMAL(10,3) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_recipe_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
    CONSTRAINT fk_recipe_ing FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    UNIQUE KEY uk_recipe (variant_id, ingredient_id)
);

-- ------------------------------------------------------------------------------
-- 6. Driver Locations & Branch
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS driver_locations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    driver_id BIGINT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_dloc_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE CASCADE,
    UNIQUE KEY uk_dloc_driver (driver_id)
);

ALTER TABLE drivers ADD COLUMN branch_id BIGINT NULL;
ALTER TABLE drivers ADD CONSTRAINT fk_drivers_branch FOREIGN KEY (branch_id) REFERENCES branches(id);

-- ------------------------------------------------------------------------------
-- 7. Customer App (Push Notifications & Loyalty)
-- ------------------------------------------------------------------------------
ALTER TABLE customers ADD COLUMN device_token VARCHAR(255) NULL;
ALTER TABLE customers ADD COLUMN reward_points INT NOT NULL DEFAULT 0;

ALTER TABLE drivers ADD COLUMN device_token VARCHAR(255) NULL;
ALTER TABLE kitchen_staff ADD COLUMN device_token VARCHAR(255) NULL;

-- ------------------------------------------------------------------------------
-- 8. Address & Location Coordinates
-- ------------------------------------------------------------------------------
ALTER TABLE addresses ADD COLUMN latitude DECIMAL(10,8) NULL;
ALTER TABLE addresses ADD COLUMN longitude DECIMAL(11,8) NULL;

ALTER TABLE branches ADD COLUMN latitude DECIMAL(10,8) NULL;
ALTER TABLE branches ADD COLUMN longitude DECIMAL(11,8) NULL;

-- ------------------------------------------------------------------------------
-- 9. Accountability
-- ------------------------------------------------------------------------------
ALTER TABLE order_status_history ADD COLUMN changed_by BIGINT NULL;
ALTER TABLE order_status_history ADD CONSTRAINT fk_osh_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE kitchen_staff ADD COLUMN branch_id BIGINT NULL;
ALTER TABLE kitchen_staff ADD CONSTRAINT fk_ks_branch FOREIGN KEY (branch_id) REFERENCES branches(id);

-- ------------------------------------------------------------------------------
-- 10. Coupons & Security
-- ------------------------------------------------------------------------------
ALTER TABLE coupons ADD COLUMN usage_limit INT NULL;
ALTER TABLE coupons ADD COLUMN used_count INT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS coupon_usages (
    id BIGINT NOT NULL AUTO_INCREMENT,
    coupon_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    order_id BIGINT NOT NULL,
    used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_cu_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    CONSTRAINT fk_cu_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT fk_cu_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    UNIQUE KEY uk_cu_unique (coupon_id, customer_id, order_id)
);

ALTER TABLE otps ADD COLUMN purpose VARCHAR(30) NOT NULL DEFAULT 'LOGIN';

-- ------------------------------------------------------------------------------
-- 11. Product Options & Reviews
-- ------------------------------------------------------------------------------
ALTER TABLE product_options ADD COLUMN max_selections INT NOT NULL DEFAULT 1;

ALTER TABLE reviews ADD COLUMN is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE;

-- ------------------------------------------------------------------------------
-- 12. Products (Data Redundancy Cleanup)
-- ------------------------------------------------------------------------------
-- PENDING: We cannot drop `category` or `price` yet because the Java backend 
-- (Product.java) is still actively mapped to these columns. 
-- Dropping them now would crash the application. 
-- Action: Skip deletion until the Backend API is fully migrated to use `category_id` and `base_price`.
