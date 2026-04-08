/*
  # Create collection items table

  1. New Tables
    - `collection_items`
      - `id` (uuid, primary key)
      - `type` (text: stamp, coin, banknote, card, other)
      - `name` (text: item name)
      - `description` (text: detailed description)
      - `estimated_value_min` (numeric: minimum estimated value)
      - `estimated_value_max` (numeric: maximum estimated value)
      - `estimated_value_currency` (text: currency code like EUR, USD)
      - `confidence_score` (numeric 0-1: AI confidence)
      - `historical_info` (text: historical context)
      - `origin_country` (text: country of origin)
      - `origin_year` (text: year or period)
      - `image_url` (text: public image URL)
      - `ai_analysis` (jsonb: condition, rarity, keyFacts)
      - `user_id` (uuid: owner, FK to auth.users)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `collection_items` table
    - Users can view/edit/delete only their own items
    - Unauthenticated users cannot access any items
*/

CREATE TABLE IF NOT EXISTS collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('stamp', 'coin', 'banknote', 'card', 'other')),
  name text NOT NULL,
  description text DEFAULT '',
  estimated_value_min numeric DEFAULT 0,
  estimated_value_max numeric DEFAULT 0,
  estimated_value_currency text DEFAULT 'EUR',
  confidence_score numeric DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
  historical_info text DEFAULT '',
  origin_country text DEFAULT '',
  origin_year text DEFAULT '',
  image_url text DEFAULT '',
  ai_analysis jsonb DEFAULT '{}',
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE collection_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own items"
  ON collection_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own items"
  ON collection_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON collection_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON collection_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_collection_items_user_id ON collection_items(user_id);
CREATE INDEX idx_collection_items_created_at ON collection_items(created_at DESC);
