ALTER TABLE order_items
  ADD COLUMN status text NOT NULL DEFAULT 'new'
  CHECK (status IN ('new', 'packing', 'shipped'));

UPDATE order_items AS item
SET status = orders.status
FROM orders
WHERE orders.id = item.order_id;
