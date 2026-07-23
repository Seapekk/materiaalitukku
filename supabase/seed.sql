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
  ('muu',       null, '{"fi": "Muut tuotteet",       "en": "Other",             "et": "Muud tooted"}', 99)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- DEMO DATA (2026-07-23). Safe to re-run: every row uses a fixed UUID + a
-- conflict guard. References only base + applied-migration columns; the columns
-- from migrations 004/007/011 (supplier/offer lifecycle, offer.source,
-- supplier.address/social) fall to their DB defaults, so this loads whether or
-- not those three migrations have been applied yet.
-- ---------------------------------------------------------------------------

-- Suppliers (nimet + maat: FI/EE building-materials merchants) --------------
insert into public.suppliers (id, name, country, email, phone, website, lead_time, description) values
  ('a0000000-0000-0000-0000-000000000001', 'Rakennus-Aitta Oy',           'fi', 'myynti@rakennusaitta.fi',  '+358 20 123 4567', 'https://rakennusaitta.fi',  '2–4 arkipäivää', 'Täyden palvelun rakennustarvikeliike Vantaalta.'),
  ('a0000000-0000-0000-0000-000000000002', 'Puukeskus Oy',                'fi', 'tilaus@puukeskus.fi',      '+358 20 765 4321', 'https://puukeskus.fi',      '1–3 arkipäivää', 'Sahatavara ja rakennepuu suoraan varastosta.'),
  ('a0000000-0000-0000-0000-000000000003', 'Betoni-Center Oy',            'fi', 'myynti@betonicenter.fi',   '+358 9 555 8080',  'https://betonicenter.fi',   'toimitus tilauksesta', 'Valmisbetoni, harkot ja raudoitteet.'),
  ('a0000000-0000-0000-0000-000000000004', 'Eesti Ehitusmaterjalid AS',   'ee', 'müük@ehitus.ee',           '+372 600 1234',    'https://ehitus.ee',         '3–5 tööpäeva',   'Ehitusmaterjalide hulgimüük Tallinnas.'),
  ('a0000000-0000-0000-0000-000000000005', 'Nordic Build Supply Oy',      'fi', 'sales@nordicbuild.fi',     '+358 40 111 2222', 'https://nordicbuild.fi',    '2–5 arkipäivää', 'Eristeet, levyt ja pintamateriaalit.'),
  ('a0000000-0000-0000-0000-000000000006', 'Tallinn Timber OÜ',           'ee', 'info@tallinntimber.ee',    '+372 512 3456',    'https://tallinntimber.ee',  '3–6 tööpäeva',   'Puitmaterjalide tootja ja eksportija.')
on conflict (id) do nothing;

-- Product catalogue (nimikkeet). `name` is Finnish; name_translations holds
-- en/sv/et so the /admin/products translation engine has demo content too. ---
insert into public.products (id, name, description, category_slug, unit, status, name_translations) values
  ('b0000000-0000-0000-0000-000000000001', 'Kerto-S kertopuu 51x200x6000', 'Kantava LVL-palkki ala- ja yläpohjiin.',            'runko',     'jm',  'active', '{"en":"Kerto-S LVL beam 51x200x6000","sv":"Kerto-S LVL-balk 51x200x6000","et":"Kerto-S LVL-tala 51x200x6000"}'),
  ('b0000000-0000-0000-0000-000000000002', 'Kuusi mitallistettu 48x98x3000', 'Höylätty ja mitallistettu runkopuu.',              'runko',     'jm',  'active', '{"en":"Planed spruce 48x98x3000","sv":"Hyvlad gran 48x98x3000","et":"Hööveldatud kuusk 48x98x3000"}'),
  ('b0000000-0000-0000-0000-000000000003', 'Kipsilevy EK 13x1200x2600', 'Erikoiskova seinäkipsilevy.',                           'kipsi',     'kpl', 'active', '{"en":"Plasterboard EK 13x1200x2600","sv":"Gipsskiva EK 13x1200x2600","et":"Kipsplaat EK 13x1200x2600"}'),
  ('b0000000-0000-0000-0000-000000000004', 'Havuvaneri 18x1200x2400', 'Pintakäsittelemätön havuvaneri.',                         'vaneri',    'kpl', 'active', '{"en":"Softwood plywood 18x1200x2400","sv":"Barrträplywood 18x1200x2400","et":"Okaspuu vineer 18x1200x2400"}'),
  ('b0000000-0000-0000-0000-000000000005', 'Mineraalivilla 100mm', 'Lämmöneriste seiniin ja yläpohjaan.',                        'villa',     'm2',  'active', '{"en":"Mineral wool 100mm","sv":"Mineralull 100mm","et":"Mineraalvill 100mm"}'),
  ('b0000000-0000-0000-0000-000000000006', 'EPS-eriste 100mm', 'Routaeriste ja alapohjan eriste.',                              'eps',       'm2',  'active', '{"en":"EPS insulation 100mm","sv":"EPS-isolering 100mm","et":"EPS-soojustus 100mm"}'),
  ('b0000000-0000-0000-0000-000000000007', 'Valmisbetoni C25/30', 'Yleisbetoni perustuksiin ja laattoihin.',                    'betoni',    'm3',  'active', '{"en":"Ready-mix concrete C25/30","sv":"Fabriksbetong C25/30","et":"Valmisbetoon C25/30"}'),
  ('b0000000-0000-0000-0000-000000000008', 'Kevytsoraharkko 200mm', 'Kantava ja eristävä muurausharkko.',                       'betoni',    'kpl', 'active', '{"en":"Lightweight block 200mm","sv":"Lättklinkerblock 200mm","et":"Keramsiitplokk 200mm"}'),
  ('b0000000-0000-0000-0000-000000000009', 'Betoniteräs A500HW 10mm', 'Harjateräs raudoituksiin.',                              'raudoitus', 'jm',  'active', '{"en":"Rebar A500HW 10mm","sv":"Armeringsjärn A500HW 10mm","et":"Sarrus A500HW 10mm"}'),
  ('b0000000-0000-0000-0000-000000000010', 'Sisäseinämaali valkoinen 9 L', 'Himmeä sisämaali seiniin ja kattoihin.',            'maali',     'kpl', 'active', '{"en":"Interior wall paint white 9 L","sv":"Väggfärg vit 9 L","et":"Seinavärv valge 9 L"}'),
  ('b0000000-0000-0000-0000-000000000011', 'Lattialaatta 60x60 harmaa', 'Pakkasenkestävä lasitettu lattialaatta.',              'laatta',    'm2',  'active', '{"en":"Floor tile 60x60 grey","sv":"Golvplatta 60x60 grå","et":"Põrandaplaat 60x60 hall"}'),
  ('b0000000-0000-0000-0000-000000000012', 'Laminaatti 8mm tammi', 'Napsautettava lattialaminaatti, tammikuvio.',               'lattia',    'm2',  'active', '{"en":"Laminate 8mm oak","sv":"Laminat 8mm ek","et":"Laminaat 8mm tamm"}'),
  ('b0000000-0000-0000-0000-000000000013', 'NR-kattotuoli 10m', 'Naulalevyristikko harjakattoon.',                              'runko',     'kpl', 'active', '{"en":"Roof truss 10m","sv":"Takstol 10m","et":"Katusefarm 10m"}'),
  ('b0000000-0000-0000-0000-000000000014', 'Höyrynsulkumuovi 0,2mm', 'Ilman- ja höyrynsulku sisäpuolelle.',                     'eriste',    'm2',  'active', '{"en":"Vapour barrier 0.2mm","sv":"Ångspärr 0,2mm","et":"Aurutõke 0,2mm"}'),
  ('b0000000-0000-0000-0000-000000000015', 'Kipsilevyruuvi 3,9x25 (1000 kpl)', 'Ruuvi kipsilevyn kiinnitykseen puuhun.',        'muu',       'kpl', 'hidden', '{"en":"Drywall screw 3.9x25 (1000 pcs)","sv":"Gipsskruv 3,9x25 (1000 st)","et":"Kipsikruvi 3,9x25 (1000 tk)"}')
on conflict (id) do nothing;

-- Offers (per-supplier prices — this is what powers the comparison table). ---
-- A few carry wholesale price + quantity tiers to exercise the pricing logic.
insert into public.offers (id, product_id, supplier_id, unit_price, wholesale_price, min_wholesale_qty, price_tiers) values
  -- p01 Kerto
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 24.90, 21.50, 50, '[{"qty":50,"price":21.50},{"qty":200,"price":19.90}]'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000006', 22.80, null, null, '[]'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 25.40, null, null, '[]'),
  -- p02 spruce
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 3.20, 2.70, 100, '[{"qty":100,"price":2.85},{"qty":500,"price":2.60}]'),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000006', 2.95, null, null, '[]'),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 3.45, null, null, '[]'),
  -- p03 plasterboard
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 12.90, null, null, '[]'),
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 11.80, 10.50, 50, '[]'),
  ('c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 11.20, null, null, '[]'),
  -- p04 plywood
  ('c0000000-0000-0000-0000-000000000010', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 42.50, null, null, '[]'),
  ('c0000000-0000-0000-0000-000000000011', 'b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000006', 39.90, null, null, '[]'),
  -- p05 mineral wool
  ('c0000000-0000-0000-0000-000000000012', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 9.80, null, null, '[]'),
  ('c0000000-0000-0000-0000-000000000013', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 8.90, 8.20, 50, '[{"qty":50,"price":8.20},{"qty":200,"price":7.60}]'),
  ('c0000000-0000-0000-0000-000000000014', 'b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 8.40, null, null, '[]'),
  -- p06 eps
  ('c0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 6.80, null, null, '[]'),
  ('c0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000004', 6.50, null, null, '[]'),
  -- p07 concrete
  ('c0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000003', 138.00, null, null, '[]'),
  ('c0000000-0000-0000-0000-000000000018', 'b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000004', 129.00, null, null, '[]'),
  -- p08 block
  ('c0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000003', 2.85, 2.40, 200, '[{"qty":200,"price":2.40},{"qty":1000,"price":2.15}]'),
  ('c0000000-0000-0000-0000-000000000020', 'b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 3.10, null, null, '[]'),
  -- p09 rebar
  ('c0000000-0000-0000-0000-000000000021', 'b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000003', 1.65, null, null, '[]'),
  ('c0000000-0000-0000-0000-000000000022', 'b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000004', 1.55, null, null, '[]'),
  -- p10 paint
  ('c0000000-0000-0000-0000-000000000023', 'b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 79.90, null, null, '[]'),
  ('c0000000-0000-0000-0000-000000000024', 'b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000005', 74.50, null, null, '[]'),
  -- p11 tile
  ('c0000000-0000-0000-0000-000000000025', 'b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 24.90, null, null, '[]'),
  ('c0000000-0000-0000-0000-000000000026', 'b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000004', 19.90, 17.90, 20, '[{"qty":20,"price":18.50},{"qty":100,"price":16.90}]'),
  -- p12 laminate
  ('c0000000-0000-0000-0000-000000000027', 'b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000005', 12.90, 11.50, 100, '[]'),
  ('c0000000-0000-0000-0000-000000000028', 'b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000004', 11.90, null, null, '[]'),
  -- p13 truss
  ('c0000000-0000-0000-0000-000000000029', 'b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000002', 189.00, null, null, '[]'),
  ('c0000000-0000-0000-0000-000000000030', 'b0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000006', 175.00, null, null, '[]'),
  -- p14 vapour barrier
  ('c0000000-0000-0000-0000-000000000031', 'b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000005', 1.20, null, null, '[]'),
  ('c0000000-0000-0000-0000-000000000032', 'b0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000004', 1.10, null, null, '[]'),
  -- p15 screws (pending offer, to show a non-active state)
  ('c0000000-0000-0000-0000-000000000033', 'b0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 0.03, null, null, '[]')
on conflict (id) do nothing;

update public.offers set status = 'pending'
  where id = 'c0000000-0000-0000-0000-000000000033';

-- Transport companies (kuljetusliikkeet FI<->EE). -------------------------
insert into public.transport_companies (id, name, route, days, services, capacity, email, phone, website, description, featured) values
  ('d0000000-0000-0000-0000-000000000001', 'Kuljetus Virtanen Oy', 'Helsinki–Tallinna', 'Ma, Ke, Pe', '{"FTL","LTL"}',           '24 t',  'ajot@virtanenkuljetus.fi', '+358 44 200 3000', 'https://virtanenkuljetus.fi', 'Säännölliset lauttakuljetukset Suomenlahden yli.', false),
  ('d0000000-0000-0000-0000-000000000002', 'Baltic Cargo OÜ',      'Tallinna–Helsinki', 'Ti, To',     '{"LTL","Express"}',       '12 t',  'info@balticcargo.ee',      '+372 508 4000',    'https://balticcargo.ee',      'Kappaletavaraa ja pikakuljetuksia Baltiasta.',      false),
  ('d0000000-0000-0000-0000-000000000003', 'Pohjola Logistics Oy', 'Turku–Tukholma',    'Ma–Pe',      '{"FTL","LTL","Express"}', '40 t',  'myynti@pohjolalog.fi',     '+358 2 700 1200',  'https://pohjolalog.fi',       'Täysrekkakuljetukset Ruotsin-liikenteeseen.',       true),
  ('d0000000-0000-0000-0000-000000000004', 'Express Rahti Oy',     'Helsinki–Riika',    'Ke, La',     '{"Express"}',             '3,5 t', 'rahti@expressrahti.fi',    '+358 40 900 5000', 'https://expressrahti.fi',     'Nopeat pikatoimitukset Baltian pääkaupunkeihin.',   false)
on conflict (id) do nothing;

-- Pending supplier submissions (public "Add products" form → admin review). --
insert into public.submissions (id, supplier_name, supplier_email, supplier_country, raw_name, raw_description, raw_unit, raw_unit_price, category_slug, status) values
  ('e0000000-0000-0000-0000-000000000001', 'Lahden Puu Oy',      'myynti@lahdenpuu.fi',   'fi', 'Kuusilankku 50x150x4200', 'Painekyllästetty ulkokäyttöön.', 'jm',  4.10, 'runko', 'pending'),
  ('e0000000-0000-0000-0000-000000000002', 'Pärnu Ehitus OÜ',    'info@parnuehitus.ee',   'ee', 'Kipsilevy 13x900x2500',   'Standardne seinaplaat.',         'kpl', 10.90, 'kipsi', 'pending')
on conflict (id) do nothing;

-- Pending registrations (join requests shown on the Dashboard). --------------
insert into public.registrations (id, reg_type, company_name, email, phone, payload, status) values
  ('f0000000-0000-0000-0000-000000000001', 'supplier',  'Kotkan Rautakauppa Oy', 'kauppa@kotkanrauta.fi', '+358 5 220 1100', '{"note":"Haluamme mukaan hintavertailuun."}', 'pending'),
  ('f0000000-0000-0000-0000-000000000002', 'transport', 'Saaristo Kuljetus Oy',  'ajot@saaristokuljetus.fi', '+358 44 300 2200', '{"route":"Turku–Maarianhamina"}', 'pending')
on conflict (id) do nothing;

-- A couple of AI-scraped competitor prices awaiting admin review. -------------
insert into public.scraped_prices (id, product_id, source_url, supplier_name, product_title, price, unit, status) values
  ('a1000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'https://esimerkki-rauta.fi/kipsilevy-ek-13', 'Esimerkki-Rauta', 'Kipsilevy EK 13mm 1200x2600', 11.50, 'kpl', 'pending'),
  ('a1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000011', 'https://esimerkki-rauta.fi/lattialaatta-60', 'Esimerkki-Rauta', 'Lattialaatta 60x60 harmaa', 21.90, 'm2', 'pending')
on conflict (id) do nothing;

-- Inbound contact messages (admin Messages tab). ----------------------------
insert into public.messages (id, sender_email, message, read) values
  ('b1000000-0000-0000-0000-000000000001', 'rakentaja@example.com', 'Onko Kerto-palkkeja saatavilla 8 metrin pituisena?', false),
  ('b1000000-0000-0000-0000-000000000002', 'ostaja@example.fi',     'Voisitteko lisätä lisää eristetoimittajia vertailuun?', false),
  ('b1000000-0000-0000-0000-000000000003', 'info@urakoitsija.fi',   'Kiitos hyvästä palvelusta – hintavertailu säästi meiltä paljon aikaa!', true)
on conflict (id) do nothing;

-- Private admin notes (admin Notes tab). ------------------------------------
insert into public.admin_notes (id, title, content, category, color) values
  ('c1000000-0000-0000-0000-000000000001', 'Betonin hinnat', 'Tarkista Betoni-Centerin kausihinnat ennen kevättä.', 'PRICING',  'bg-blue-50'),
  ('c1000000-0000-0000-0000-000000000002', 'Uudet toimittajat', 'Kotkan Rautakauppa odottaa hyväksyntää – soita ma.',   'PURCHASING', 'bg-yellow-50')
on conflict (id) do nothing;
