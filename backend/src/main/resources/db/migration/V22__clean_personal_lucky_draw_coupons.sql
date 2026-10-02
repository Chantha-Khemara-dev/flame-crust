-- Remove personal lucky draw generated codes from global public coupons table
DELETE FROM coupons WHERE code LIKE '%-%';
