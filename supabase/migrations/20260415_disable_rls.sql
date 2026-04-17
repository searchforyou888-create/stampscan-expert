-- Migration: Désactiver Row Level Security (RLS)
-- Date: 2026-04-15

-- Désactiver RLS sur la table collection_items
ALTER TABLE IF EXISTS collection_items DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur la table catalogue_items
ALTER TABLE IF EXISTS catalogue_items DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes (optionnel, mais recommandé pour la clarté)
DROP POLICY IF EXISTS "Lecture propre" ON collection_items;
DROP POLICY IF EXISTS "Insertion propre" ON collection_items;
DROP POLICY IF EXISTS "Mise a jour propre" ON collection_items;
DROP POLICY IF EXISTS "Suppression propre" ON collection_items;

DROP POLICY IF EXISTS "Lecture catalogue" ON catalogue_items;
