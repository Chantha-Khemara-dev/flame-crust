-- Migration V10: Add customer cover_photo column
ALTER TABLE customers ADD COLUMN cover_photo VARCHAR(500) NULL AFTER avatar;
