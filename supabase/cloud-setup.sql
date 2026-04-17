-- ============================================================
-- StampScan Expert — SQL complet pour Supabase Cloud
-- À exécuter dans : Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Type enum pour les catégories
DO $$ BEGIN
  CREATE TYPE collectible_category AS ENUM ('stamp', 'coin', 'banknote', 'card', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Fonction utilitaire updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Table principale : collection_items
CREATE TABLE IF NOT EXISTS collection_items (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    uuid REFERENCES auth.users(id) ON DELETE CASCADE,  -- nullable pour mode owner
  type                       collectible_category NOT NULL,
  name                       text NOT NULL DEFAULT '',
  description                text NOT NULL DEFAULT '',
  estimated_value_min        numeric NOT NULL DEFAULT 0,
  estimated_value_max        numeric NOT NULL DEFAULT 0,
  estimated_value_currency   text NOT NULL DEFAULT 'EUR',
  confidence_score           numeric NOT NULL DEFAULT 0.5
                               CHECK (confidence_score >= 0 AND confidence_score <= 1),
  historical_info            text NOT NULL DEFAULT '',
  origin_country             text NOT NULL DEFAULT '',
  origin_year                text NOT NULL DEFAULT '',
  image_url                  text NOT NULL DEFAULT '',
  ai_analysis                jsonb NOT NULL DEFAULT '{}',
  notes                      text DEFAULT NULL,
  -- Vérification expert
  expert_verification_status text NOT NULL DEFAULT 'none'
                               CHECK (expert_verification_status IN ('none', 'pending', 'verified')),
  expert_verification_requested_at timestamptz,
  expert_verification_completed_at timestamptz,
  expert_verification_report text NOT NULL DEFAULT '',
  -- Condition guidée
  guided_condition_grade     text NOT NULL DEFAULT 'auto'
                               CHECK (guided_condition_grade IN ('auto', 'mint', 'very_good', 'worn')),
  guided_condition_issues    text[] NOT NULL DEFAULT '{}',
  -- Timestamps
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

-- 4. Index
CREATE INDEX IF NOT EXISTS idx_collection_items_user_id    ON collection_items(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_created_at ON collection_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_items_type       ON collection_items(type);
CREATE INDEX IF NOT EXISTS idx_collection_items_expert_verification_status
  ON collection_items(expert_verification_status);

-- 5. Trigger updated_at
DROP TRIGGER IF EXISTS trg_collection_items_updated_at ON collection_items;
CREATE TRIGGER trg_collection_items_updated_at
  BEFORE UPDATE ON collection_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. RLS (Row Level Security)
ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

-- Policies pour utilisateurs authentifiés (leurs propres items)
CREATE POLICY "Users can view own items"
  ON collection_items FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
  ON collection_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON collection_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON collection_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Policies mode owner (user_id IS NULL) — visibles par tous
CREATE POLICY "Bypass owner can view"
  ON collection_items FOR SELECT
  USING (user_id IS NULL);

CREATE POLICY "Bypass owner can insert"
  ON collection_items FOR INSERT
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Bypass owner can update"
  ON collection_items FOR UPDATE
  USING (user_id IS NULL);

CREATE POLICY "Bypass owner can delete"
  ON collection_items FOR DELETE
  USING (user_id IS NULL);

-- ============================================================
-- 7. Storage bucket pour les images scannées
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('collectscan', 'collectscan', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Lecture publique
DO $$ BEGIN
  CREATE POLICY "Collectscan public read"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'collectscan');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Upload public (anon + authenticated)
DO $$ BEGIN
  CREATE POLICY "Collectscan public insert"
    ON storage.objects FOR INSERT TO public
    WITH CHECK (bucket_id = 'collectscan');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update public
DO $$ BEGIN
  CREATE POLICY "Collectscan public update"
    ON storage.objects FOR UPDATE TO public
    USING (bucket_id = 'collectscan')
    WITH CHECK (bucket_id = 'collectscan');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- 8. Table catalogue (bibliothèque de référence, optionnel)
-- ============================================================

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
  catalogue_ref       text DEFAULT NULL,
  image_url           text DEFAULT NULL,
  tags                text[] NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE catalogue_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture catalogue" ON catalogue_items
  FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_catalogue_category ON catalogue_items(category);
CREATE INDEX IF NOT EXISTS idx_catalogue_country   ON catalogue_items(country);

DROP TRIGGER IF EXISTS trg_catalogue_items_updated_at ON catalogue_items;
CREATE TRIGGER trg_catalogue_items_updated_at
  BEFORE UPDATE ON catalogue_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
