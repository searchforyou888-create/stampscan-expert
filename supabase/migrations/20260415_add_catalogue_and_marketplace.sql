-- Migration: Ajouter catalogueRef et marketplaces à collection_items
-- Exécuter dans SQL Editor Supabase

ALTER TABLE collection_items 
ADD COLUMN IF NOT EXISTS catalogue_ref text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS marketplaces text DEFAULT NULL;

-- Mettre à jour les colonnes ai_analysis pour qu'elles contiennent aussi ces champs
-- Les anciennes lignes ne seront pas affectées (NULL par défaut)

-- Index pour recherche rapide par catalogue_ref
CREATE INDEX IF NOT EXISTS idx_collection_items_catalogue_ref ON collection_items(catalogue_ref);
