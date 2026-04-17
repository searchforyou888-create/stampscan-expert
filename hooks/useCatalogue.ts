import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CatalogueItemRow } from '@/types/supabase';
import { CollectibleCategory } from '@/types/supabase';

export function useCatalogue(category?: CollectibleCategory, searchQuery?: string) {
  const [items, setItems] = useState<CatalogueItemRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCatalogue = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('catalogue_items')
        .select('*')
        .order('name', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      if (searchQuery && searchQuery.trim().length > 1) {
        query = query.or(
          `name.ilike.%${searchQuery.trim()}%,description.ilike.%${searchQuery.trim()}%,country.ilike.%${searchQuery.trim()}%`
        );
      }

      const { data, error: sbError } = await query;
      if (sbError) throw sbError;
      setItems(data || []);
    } catch (err: any) {
      console.error('[Supabase] fetchCatalogue error:', err?.message);
      setError(err?.message || 'Impossible de charger le catalogue');
    } finally {
      setIsLoading(false);
    }
  }, [category, searchQuery]);

  useEffect(() => {
    fetchCatalogue();
  }, [fetchCatalogue]);

  const clearError = useCallback(() => setError(null), []);

  return { items, isLoading, error, refresh: fetchCatalogue, clearError };
}
