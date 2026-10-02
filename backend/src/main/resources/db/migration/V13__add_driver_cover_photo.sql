-- Migration V13: Add driver cover_photo column
ALTER TABLE drivers ADD COLUMN cover_photo VARCHAR(500) NULL AFTER profile_photo;
