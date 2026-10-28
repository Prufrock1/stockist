ALTER TABLE accounts ADD COLUMN brand_id text REFERENCES brands (id);
