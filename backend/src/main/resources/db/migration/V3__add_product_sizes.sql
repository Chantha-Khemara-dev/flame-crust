-- Migration script to add 'Size' option to all existing products and populate 'Small', 'Medium', 'Large' variants.

-- Step 1: Insert 'Size' option for all existing products
INSERT INTO product_options (product_id, name, is_required, max_selections)
SELECT id, 'Size', TRUE, 1 FROM products;

-- Step 2: Insert 'Small' variant (negative price adjustment or $0 depending on logic, let's say base price is for Small so adjustment is $0)
INSERT INTO product_variants (option_id, name, price_adjustment, active)
SELECT po.id, 'Small', 0.00, TRUE
FROM product_options po
WHERE po.name = 'Size';

-- Step 3: Insert 'Medium' variant (+$2.00)
INSERT INTO product_variants (option_id, name, price_adjustment, active)
SELECT po.id, 'Medium', 2.00, TRUE
FROM product_options po
WHERE po.name = 'Size';

-- Step 4: Insert 'Large' variant (+$4.00)
INSERT INTO product_variants (option_id, name, price_adjustment, active)
SELECT po.id, 'Large', 4.00, TRUE
FROM product_options po
WHERE po.name = 'Size';
