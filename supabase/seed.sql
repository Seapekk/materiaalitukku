-- Starter categories (same domains the old app served).
insert into public.categories (slug, name, category_group, sort_order) values
  ('construction',  '{"en": "Construction",      "et": "Ehitus",           "fi": "Rakentaminen"}',   'services', 1),
  ('renovation',    '{"en": "Renovation",        "et": "Renoveerimine",    "fi": "Remontointi"}',    'services', 2),
  ('plumbing',      '{"en": "Plumbing",          "et": "Torutööd",         "fi": "Putkityöt"}',      'services', 3),
  ('electrical',    '{"en": "Electrical",        "et": "Elektritööd",      "fi": "Sähkötyöt"}',      'services', 4),
  ('carpentry',     '{"en": "Carpentry",         "et": "Puusepatööd",      "fi": "Puusepäntyöt"}',   'services', 5),
  ('painting',      '{"en": "Painting",          "et": "Maalritööd",       "fi": "Maalaustyöt"}',    'services', 6),
  ('roofing',       '{"en": "Roofing",           "et": "Katusetööd",       "fi": "Kattotyöt"}',      'services', 7),
  ('landscaping',   '{"en": "Landscaping",       "et": "Haljastus",        "fi": "Pihatyöt"}',       'services', 8),
  ('cleaning',      '{"en": "Cleaning",          "et": "Koristus",         "fi": "Siivous"}',        'services', 9),
  ('transport',     '{"en": "Transport",         "et": "Transport",        "fi": "Kuljetus"}',       'services', 10),
  ('materials',     '{"en": "Building materials","et": "Ehitusmaterjalid", "fi": "Rakennustarvikkeet"}', 'goods', 11),
  ('other',         '{"en": "Other",             "et": "Muu",              "fi": "Muu"}',            'services', 99);
