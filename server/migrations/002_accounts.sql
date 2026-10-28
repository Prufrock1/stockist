ALTER TABLE accounts ADD COLUMN id text;
ALTER TABLE accounts ADD COLUMN email text;
ALTER TABLE accounts ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();

UPDATE accounts SET id = 'user-maison-bleu', email = 'maison@stockist.test' WHERE name = 'Maison Bleu';
UPDATE accounts SET id = 'user-verre-group', email = 'verre@stockist.test' WHERE name = 'Verre Group';
UPDATE accounts SET id = 'user-' || substr(md5(name || role), 1, 16) WHERE id IS NULL;
UPDATE accounts SET email = lower(replace(name, ' ', '.')) || '@stockist.test' WHERE email IS NULL;

ALTER TABLE accounts ALTER COLUMN id SET NOT NULL;
ALTER TABLE accounts ALTER COLUMN email SET NOT NULL;
ALTER TABLE accounts DROP CONSTRAINT accounts_pkey;
ALTER TABLE accounts ADD PRIMARY KEY (id);
CREATE UNIQUE INDEX accounts_email_lower ON accounts (lower(email));

ALTER TABLE orders ADD COLUMN user_id text REFERENCES accounts (id);
UPDATE orders o SET user_id = a.id
  FROM accounts a
  WHERE a.role = 'retailer' AND a.name = o.retailer;

ALTER TABLE favorites ADD COLUMN user_id text REFERENCES accounts (id);
UPDATE favorites f SET user_id = a.id FROM accounts a WHERE a.name = f.account;
DELETE FROM favorites WHERE user_id IS NULL;
ALTER TABLE favorites DROP CONSTRAINT favorites_pkey;
ALTER TABLE favorites DROP COLUMN account;
ALTER TABLE favorites ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE favorites ADD PRIMARY KEY (user_id, brand_id);
