-- V21: Synchronize and backfill products.sales_count from order_items
UPDATE products p 
SET sales_count = (
    SELECT COALESCE(SUM(oi.quantity), 0) 
    FROM order_items oi 
    WHERE oi.product_id = p.id
);
