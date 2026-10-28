-- The fixture catalogue (brands b1–b8 and their products) is not part of the
-- product. Sellers create their own. Orders that only contained those lines go too.
DELETE FROM order_items
 WHERE product_id IN (SELECT id FROM products WHERE brand_id IN ('b1','b2','b3','b4','b5','b6','b7','b8'));

DELETE FROM orders
 WHERE id NOT IN (SELECT DISTINCT order_id FROM order_items);

DELETE FROM favorites
 WHERE brand_id IN ('b1','b2','b3','b4','b5','b6','b7','b8');

DELETE FROM products
 WHERE brand_id IN ('b1','b2','b3','b4','b5','b6','b7','b8');

DELETE FROM brands
 WHERE id IN ('b1','b2','b3','b4','b5','b6','b7','b8');
