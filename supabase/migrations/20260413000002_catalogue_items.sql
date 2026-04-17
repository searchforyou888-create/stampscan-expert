-- Migration : table catalogue_items — bibliotheque de reference (timbres, pieces, billets, cartes)
-- Cette table est publique en lecture, seuls les admins peuvent ecrire

CREATE TABLE IF NOT EXISTS catalogue_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category            collectible_category NOT NULL,
  name                text NOT NULL,
  description         text NOT NULL DEFAULT '',
  country             text NOT NULL DEFAULT '',
  period_start        integer DEFAULT NULL,
  period_end          integer DEFAULT NULL,
  estimated_value_min numeric NOT NULL DEFAULT 0,
  estimated_value_max numeric NOT NULL DEFAULT 0,
  currency            text NOT NULL DEFAULT 'EUR',
  rarity              text NOT NULL DEFAULT 'Commun'
                        CHECK (rarity IN ('Commun','Peu commun','Rare','Tres rare','Exceptionnel')),
  condition_reference text NOT NULL DEFAULT 'TTB',
  catalogue_ref       text DEFAULT NULL,  -- ex: Yvert 1234, NGC MS-65, PMG 65
  image_url           text DEFAULT NULL,
  tags                text[] NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalogue_items ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour tous les utilisateurs authentifies
CREATE POLICY "Lecture catalogue" ON catalogue_items
  FOR SELECT TO authenticated USING (true);

-- Ecriture reservee aux admins (role service_role uniquement)
-- Les insertions depuis l'app se font via le backend avec la service key

CREATE INDEX IF NOT EXISTS idx_catalogue_category ON catalogue_items(category);
CREATE INDEX IF NOT EXISTS idx_catalogue_country   ON catalogue_items(country);
CREATE INDEX IF NOT EXISTS idx_catalogue_name      ON catalogue_items USING gin(to_tsvector('french', name || ' ' || description));

DROP TRIGGER IF EXISTS trg_catalogue_items_updated_at ON catalogue_items;
CREATE TRIGGER trg_catalogue_items_updated_at
  BEFORE UPDATE ON catalogue_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Donnees de demonstration : quelques entrees par categorie

INSERT INTO catalogue_items (category, name, description, country, period_start, period_end, estimated_value_min, estimated_value_max, currency, rarity, condition_reference, catalogue_ref, tags)
VALUES
  -- Timbres
  ('stamp', 'Ceres 20c bleu 1849', 'Premier timbre francais emis sous la Republique. Couleur bleu vif, dentelure rare.', 'France', 1849, 1850, 80, 400, 'EUR', 'Rare', 'TTB', 'Yvert n°4', ARRAY['france','1849','ceres','classique']),
  ('stamp', 'Marianne de Dulac 1944', 'Timbre emis a la Liberation. Dessin de Edmond Dulac.', 'France', 1944, 1945, 0.50, 5, 'EUR', 'Commun', 'TTB', 'Yvert n°681', ARRAY['marianne','liberation','ww2']),
  ('stamp', 'Penny Black 1840', 'Premier timbre-poste au monde. Portrait de la Reine Victoria.', 'Royaume-Uni', 1840, 1841, 200, 1200, 'EUR', 'Tres rare', 'TB', 'SG 1', ARRAY['penny black','royaume-uni','premier timbre','victoria']),
  ('stamp', 'Triptyque Semeuse 25c 1903', 'Timbre Semeuse de Roty, tirage en bande de 3 non separee.', 'France', 1903, 1930, 10, 60, 'EUR', 'Peu commun', 'TB', 'Yvert n°129', ARRAY['semeuse','roty','france','classique']),

  -- Pieces
  ('coin', 'Napoleon 20 Francs Or 1811', 'Napoleon Bonaparte portrait. Piece en or 900 millièmes, 6.45g.', 'France', 1811, 1815, 280, 450, 'EUR', 'Peu commun', 'TTB', 'Gadoury 1025', ARRAY['napoleon','or','20 francs','empire']),
  ('coin', '5 Francs Hercule Argent 1873', 'Hercule debout entre la Liberte et l Egalite. Argent 900 millièmes.', 'France', 1873, 1879, 25, 120, 'EUR', 'Commun', 'TTB', 'Gadoury 745a', ARRAY['hercule','argent','5 francs','troisieme republique']),
  ('coin', '1 Euro Premiere Frappe 2002', 'Premiere circulation de l euro en France. Coin neuf.', 'France', 2002, 2002, 1, 8, 'EUR', 'Commun', 'Neuf', NULL, ARRAY['euro','2002','premiere frappe']),
  ('coin', 'Louis d Or 1726', 'Piece d or Louis XV. Double louis d or rare.', 'France', 1726, 1726, 600, 2000, 'EUR', 'Rare', 'TB', 'Ciani 2104', ARRAY['louis or','louis xv','xviiie','royaute']),

  -- Billets
  ('banknote', '500 Francs Molière 1966', 'Billet serie 1966, portrait de Moliere. Billet tres recherche en etat SUP.', 'France', 1966, 1979, 50, 350, 'EUR', 'Peu commun', 'TTB', 'Pick 156', ARRAY['moliere','500 francs','billets anciens']),
  ('banknote', '100 Francs Bonaparte 1796', 'Billet assignat de la periode revolutionnaire.', 'France', 1796, 1797, 15, 80, 'EUR', 'Peu commun', 'TB', NULL, ARRAY['assignat','revolution','billet ancien','1796']),
  ('banknote', '50 Euros Serie EA 2002', 'Premiere serie euro. Coupure 50€ en etat parfait.', 'Zone Euro', 2002, 2002, 50, 150, 'EUR', 'Commun', 'Neuf', NULL, ARRAY['euro','50 euros','premiere serie']),
  ('banknote', '200 Francs Montesquieu 1981', 'Portrait de Montesquieu sur fond de château de la Brede.', 'France', 1981, 1994, 25, 120, 'EUR', 'Commun', 'TTB', 'Pick 155', ARRAY['montesquieu','200 francs','billets anciens']),

  -- Cartes
  ('card', 'Pikachu Base Set Holographique 1999', 'Pikachu holo rare de la première édition Base Set Pokemon. Etat Mint très recherché.', 'Japon/USA', 1999, 1999, 80, 800, 'EUR', 'Rare', 'Neuf', 'PSA 10', ARRAY['pokemon','pikachu','base set','1999','holo']),
  ('card', 'Charizard Base Set 1999', 'Charizard holo rare Base Set premiere edition. Carte emblematique Pokemon.', 'Japon/USA', 1999, 1999, 300, 5000, 'EUR', 'Tres rare', 'Neuf', 'BGS 9.5', ARRAY['pokemon','charizard','base set','1999','holo rare']),
  ('card', 'Zidane Panini WC98 Gold', 'Zinedine Zidane Coupe du Monde 1998. Edition or Panini.', 'France', 1998, 1998, 20, 200, 'EUR', 'Peu commun', 'TTB', NULL, ARRAY['zidane','foot','panini','1998','france']),
  ('card', 'Michael Jordan Upper Deck 1991', 'Michael Jordan Upper Deck Rookie Card. Carte fondatrice du basket.', 'USA', 1991, 1991, 80, 600, 'EUR', 'Rare', 'TTB', 'PSA 8', ARRAY['jordan','nba','upper deck','rookie','1991']),

  -- Autres
  ('other', 'Médaille militaire Verdun 1916', 'Médaille commémorative de la bataille de Verdun. Cuivre et ruban tricolore.', 'France', 1916, 1916, 30, 120, 'EUR', 'Peu commun', 'TB', NULL, ARRAY['medaille','verdun','ww1','militaria']),
  ('other', 'Insigne Légion d Honneur XIXe', 'Decoration Légion d Honneur Second Empire. Email rouge, argent et or.', 'France', 1860, 1890, 150, 600, 'EUR', 'Rare', 'TB', NULL, ARRAY['legion honneur','decoration','second empire','insigne'])
ON CONFLICT DO NOTHING;
