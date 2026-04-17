/*
  # Mode propriétaire (bypass) — user_id nullable + policies ouvertes

  En mode OWNER_BYPASS, l'app insère des items avec user_id = NULL.
  Ces migrations permettent :
  - user_id nullable
  - Lecture/écriture/suppression des items sans user_id (bypass)
  - Les policies existantes pour les vrais utilisateurs restent intactes

  IMPORTANT : exécuter ce SQL dans Supabase Dashboard → SQL Editor
*/

-- 1. Rendre user_id nullable (pour le mode bypass)
ALTER TABLE collection_items
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Policy SELECT : items bypass (sans user_id) visibles par tous
CREATE POLICY "Bypass owner can view"
  ON collection_items FOR SELECT
  USING (user_id IS NULL);

-- 3. Policy INSERT : autoriser l'insertion sans user_id
CREATE POLICY "Bypass owner can insert"
  ON collection_items FOR INSERT
  WITH CHECK (user_id IS NULL);

-- 4. Policy UPDATE : items bypass modifiables
CREATE POLICY "Bypass owner can update"
  ON collection_items FOR UPDATE
  USING (user_id IS NULL);

-- 5. Policy DELETE : items bypass supprimables
CREATE POLICY "Bypass owner can delete"
  ON collection_items FOR DELETE
  USING (user_id IS NULL);
