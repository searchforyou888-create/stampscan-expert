-- Migration : table collection_items sur Supabase
-- A executer dans SQL Editor de ton projet Supabase

-- Type enum pour les categories
DO $$ BEGIN
  CREATE TYPE collectible_category AS ENUM ('stamp', 'coin', 'banknote', 'card', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Table principale de collection (objets scannes et sauvegardes par chaque utilisateur)
CREATE TABLE IF NOT EXISTS collection_items (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                     collectible_category NOT NULL,
  name                     text NOT NULL DEFAULT '',
  description              text NOT NULL DEFAULT '',
  estimated_value_min      numeric NOT NULL DEFAULT 0,
  estimated_value_max      numeric NOT NULL DEFAULT 0,
  estimated_value_currency text NOT NULL DEFAULT 'EUR',
  confidence_score         numeric NOT NULL DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  historical_info          text NOT NULL DEFAULT '',
  origin_country           text NOT NULL DEFAULT '',
  origin_year              text NOT NULL DEFAULT '',
  image_url                text NOT NULL DEFAULT '',
  ai_analysis              jsonb NOT NULL DEFAULT '{}',
  notes                    text DEFAULT NULL,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- Chaque utilisateur ne voit que ses propres objets
CREATE POLICY "Lecture propre" ON collection_items
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Insertion propre" ON collection_items
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Mise a jour propre" ON collection_items
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Suppression propre" ON collection_items
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_collection_items_user_id    ON collection_items(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_created_at ON collection_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_items_type       ON collection_items(type);

-- Mise a jour automatique de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_collection_items_updated_at ON collection_items;
CREATE TRIGGER trg_collection_items_updated_at
  BEFORE UPDATE ON collection_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
