-- Seed promo coupons for Lucky Draw feature
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, active, used_count)
VALUES 
  ('PIZZA10', 'PERCENTAGE', 10.00, 15.00, 1, 0),
  ('FLAME20', 'PERCENTAGE', 20.00, 30.00, 1, 0),
  ('CRUST3', 'FIXED', 3.00, 12.00, 1, 0),
  ('FEAST5', 'FIXED', 5.00, 25.00, 1, 0),
  ('SNACK15', 'FIXED', 1.50, 10.00, 1, 0),
  ('WEEKEND15', 'PERCENTAGE', 15.00, 20.00, 1, 0)
ON DUPLICATE KEY UPDATE 
  discount_type = VALUES(discount_type),
  discount_value = VALUES(discount_value),
  min_order_amount = VALUES(min_order_amount),
  active = 1;
