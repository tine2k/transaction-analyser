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
  category_id
)
VALUES
  ('2026-02-03', '2026-02-03', -12.50, 'REWE Market', 'REWE', NULL,
    (SELECT id FROM categories WHERE name = 'Groceries')),
  ('2026-02-04', '2026-02-03', -4.80, 'Rail ticket', 'Transit', 'DE00000000000000000000',
    (SELECT id FROM categories WHERE name = 'Transport')),
  ('2026-02-05', '2026-02-05', -9.99, 'Internal transfer', 'Own account', NULL,
    (SELECT id FROM categories WHERE name = 'Internal')),
  ('2026-02-01', '2026-02-01', -8.20, 'Bookshop', 'Books', NULL, NULL);
