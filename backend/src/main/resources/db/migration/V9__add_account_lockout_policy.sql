-- Migration V9: Add Account Lockout Policy Columns to prevent Brute-Force attacks
-- Failed attempts counter and lock expiration timestamp for all authenticable entities

ALTER TABLE customers 
    ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN locked_until TIMESTAMP NULL;

ALTER TABLE users 
    ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN locked_until TIMESTAMP NULL;

ALTER TABLE drivers 
    ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN locked_until TIMESTAMP NULL;

ALTER TABLE kitchen_staff 
    ADD COLUMN failed_attempts INT NOT NULL DEFAULT 0,
    ADD COLUMN locked_until TIMESTAMP NULL;
