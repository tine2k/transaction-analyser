-- The migration seeds `Default`, so these inserts are idempotent: a test that
-- resets the tables without resetting people can apply this fixture again.
INSERT INTO people (name)
SELECT 'Default'
WHERE NOT EXISTS (SELECT 1 FROM people WHERE lower(name) = 'default');

-- A second person for the person-scoped tests. It starts with no transaction, so
-- the tests that need one insert it themselves.
INSERT INTO people (name)
SELECT 'Anna'
WHERE NOT EXISTS (SELECT 1 FROM people WHERE lower(name) = 'anna');

INSERT INTO categories (name, patterns, hidden)
VALUES
  ('Groceries', ARRAY['rewe', 'market'], false),
  ('Transport', ARRAY['rail'], false),
  ('Internal', ARRAY['internal'], true);

INSERT INTO transactions (
  booking_date,
  value_date,
  amount,
  purpose,
  counterparty_name,
  counterparty_account,
  category_id,
  person_id
)
VALUES
  ('2026-02-03', '2026-02-03', -12.50, 'REWE Market', 'REWE', NULL,
    (SELECT id FROM categories WHERE name = 'Groceries'),
    (SELECT id FROM people WHERE name = 'Default')),
  ('2026-02-04', '2026-02-03', -4.80, 'Rail ticket', 'Transit', 'DE00000000000000000000',
    (SELECT id FROM categories WHERE name = 'Transport'),
    (SELECT id FROM people WHERE name = 'Default')),
  ('2026-02-05', '2026-02-05', -9.99, 'Internal transfer', 'Own account', NULL,
    (SELECT id FROM categories WHERE name = 'Internal'),
    (SELECT id FROM people WHERE name = 'Default')),
  ('2026-02-01', '2026-02-01', -8.20, 'Bookshop', 'Books', NULL, NULL,
    (SELECT id FROM people WHERE name = 'Default'));
