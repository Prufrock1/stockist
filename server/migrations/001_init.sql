CREATE TABLE brands (
  id text PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  loc text NOT NULL,
  tagline text NOT NULL,
  position integer NOT NULL
);

CREATE TABLE products (
  id text PRIMARY KEY,
  brand_id text NOT NULL REFERENCES brands (id),
  name text NOT NULL,
  cat text NOT NULL,
  unit text NOT NULL,
  wp integer NOT NULL CHECK (wp >= 0),
  rrp integer NOT NULL CHECK (rrp >= 0),
  moq integer NOT NULL CHECK (moq > 0),
  stock integer NOT NULL CHECK (stock >= 0),
  tint text NOT NULL,
  marks text NOT NULL,
  blurb text NOT NULL,
  image_url text,
  position integer NOT NULL
);

CREATE TABLE orders (
  id text PRIMARY KEY,
  retailer text NOT NULL,
  status text NOT NULL CHECK (status IN ('new', 'packing', 'shipped')),
  placed_at timestamptz NOT NULL,
  note text NOT NULL DEFAULT ''
);

CREATE INDEX orders_retailer_placed ON orders (retailer, placed_at DESC);

CREATE TABLE order_items (
  order_id text NOT NULL REFERENCES orders (id),
  product_id text NOT NULL REFERENCES products (id),
  qty integer NOT NULL CHECK (qty > 0),
  PRIMARY KEY (order_id, product_id)
);

CREATE TABLE favorites (
  account text NOT NULL,
  brand_id text NOT NULL REFERENCES brands (id),
  PRIMARY KEY (account, brand_id)
);

CREATE TABLE accounts (
  name text PRIMARY KEY,
  role text NOT NULL CHECK (role IN ('retailer', 'brand')),
  password_hash text NOT NULL
);

CREATE TABLE login_attempts (
  ip text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX login_attempts_ip_at ON login_attempts (ip, at DESC);

CREATE SEQUENCE order_seq AS integer START 4472;
