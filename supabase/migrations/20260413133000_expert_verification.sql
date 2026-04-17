-- Ajout du suivi de verification humaine sur les objets de collection

ALTER TABLE collection_items
  ADD COLUMN IF NOT EXISTS expert_verification_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS expert_verification_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS expert_verification_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS expert_verification_report text NOT NULL DEFAULT '';

ALTER TABLE collection_items
  DROP CONSTRAINT IF EXISTS collection_items_expert_verification_status_check;

ALTER TABLE collection_items
  ADD CONSTRAINT collection_items_expert_verification_status_check
  CHECK (expert_verification_status IN ('none', 'pending', 'verified'));

CREATE INDEX IF NOT EXISTS idx_collection_items_expert_verification_status
  ON collection_items(expert_verification_status);