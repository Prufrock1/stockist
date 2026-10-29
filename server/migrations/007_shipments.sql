CREATE TABLE shipments (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders (id),
  brand_id text NOT NULL REFERENCES brands (id),
  status text NOT NULL CHECK (status IN ('new', 'packing', 'shipped')),
  UNIQUE (order_id, brand_id)
);

INSERT INTO shipments (id, order_id, brand_id, status)
SELECT item.order_id || '-' || row_number() OVER (PARTITION BY item.order_id ORDER BY product.brand_id),
       item.order_id,
       product.brand_id,
       CASE
         WHEN bool_and(item.status = 'shipped') THEN 'shipped'
         WHEN bool_or(item.status <> 'new') THEN 'packing'
         ELSE 'new'
       END
FROM order_items AS item
JOIN products AS product ON product.id = item.product_id
GROUP BY item.order_id, product.brand_id;

ALTER TABLE order_items ADD COLUMN shipment_id text REFERENCES shipments (id);

UPDATE order_items AS item
SET shipment_id = shipment.id
FROM products AS product, shipments AS shipment
WHERE product.id = item.product_id
  AND shipment.order_id = item.order_id
  AND shipment.brand_id = product.brand_id;

ALTER TABLE order_items ALTER COLUMN shipment_id SET NOT NULL;
ALTER TABLE order_items DROP COLUMN status;
