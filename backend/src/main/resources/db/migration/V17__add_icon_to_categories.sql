ALTER TABLE categories ADD COLUMN icon VARCHAR(100) DEFAULT NULL AFTER name;

UPDATE categories SET icon = '🍕' WHERE slug = 'pizza';
UPDATE categories SET icon = '🥯' WHERE slug = 'pizza-bagels';
UPDATE categories SET icon = '🍔' WHERE slug = 'burgers';
UPDATE categories SET icon = '🍟' WHERE slug = 'sides';
UPDATE categories SET icon = '🥤' WHERE slug = 'Drink' OR slug = 'drinks';
