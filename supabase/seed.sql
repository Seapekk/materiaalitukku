-- Category tree ported from the old app's CATEGORY_TREE (fi/en kept, et added).
insert into public.categories (slug, parent_slug, name, sort_order) values
  ('puutavara', null, '{"fi": "Puutavara",            "en": "Timber",            "et": "Puit"}', 1),
  ('runko',     'puutavara', '{"fi": "Runkopuut",     "en": "Framing",           "et": "Karkassipuit"}', 1),
  ('paneeli',   'puutavara', '{"fi": "Paneelit",      "en": "Panels",            "et": "Paneelid"}', 2),
  ('listat',    'puutavara', '{"fi": "Listat",        "en": "Mouldings",         "et": "Liistud"}', 3),

  ('levy',      null, '{"fi": "Levyt",               "en": "Boards",            "et": "Plaadid"}', 2),
  ('kipsi',     'levy', '{"fi": "Kipsilevyt",        "en": "Plasterboards",     "et": "Kipsplaadid"}', 1),
  ('vaneri',    'levy', '{"fi": "Vanerit",           "en": "Plywood",           "et": "Vineer"}', 2),

  ('eriste',    null, '{"fi": "Eristeet",            "en": "Insulation",        "et": "Soojustus"}', 3),
  ('villa',     'eriste', '{"fi": "Villat",          "en": "Wool",              "et": "Villad"}', 1),
  ('eps',       'eriste', '{"fi": "EPS/XPS",         "en": "EPS/XPS",           "et": "EPS/XPS"}', 2),

  ('valu',      null, '{"fi": "Maa- ja pohjarakennus", "en": "Groundworks",     "et": "Pinnase- ja vundamenditööd"}', 4),
  ('betoni',    'valu', '{"fi": "Betoni ja harkot",  "en": "Concrete & Blocks", "et": "Betoon ja plokid"}', 1),
  ('raudoitus', 'valu', '{"fi": "Raudoitus",         "en": "Reinforcement",     "et": "Sarrus"}', 2),

  ('pinta',     null, '{"fi": "Pintamateriaalit",    "en": "Surface Materials", "et": "Pinnamaterjalid"}', 5),
  ('maali',     'pinta', '{"fi": "Maalit ja tasoitteet", "en": "Paint & Plaster", "et": "Värvid ja pahtlid"}', 1),
  ('laatta',    'pinta', '{"fi": "Laatat",           "en": "Tiles",             "et": "Plaadid (keraamilised)"}', 2),
  ('lattia',    'pinta', '{"fi": "Lattianpäällysteet", "en": "Flooring",        "et": "Põrandakatted"}', 3),

  ('lvi',       null, '{"fi": "LVI",                 "en": "HVAC",              "et": "Küte ja ventilatsioon"}', 6),
  ('sahko',     null, '{"fi": "Sähkö",               "en": "Electrical",        "et": "Elekter"}', 7),
  ('muu',       null, '{"fi": "Muut tuotteet",       "en": "Other",             "et": "Muud tooted"}', 99);
