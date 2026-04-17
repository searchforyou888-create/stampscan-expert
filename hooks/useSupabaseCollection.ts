import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { CollectionItemRow } from '@/types/supabase';
import { useAuth } from '@/hooks/useAuth';
import { resolveStoredImageUrl } from '@/lib/storage';

export function useSupabaseCollection() {
  const { user, isAuthenticated, isOwnerModeActive } = useAuth();
  const [items, setItems] = useState<CollectionItemRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!isAuthenticated || (!user?.id && !isOwnerModeActive)) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: sbError } = await supabase
        .from('collection_items')
        .select('*')
        [isOwnerModeActive ? 'is' : 'eq']('user_id', isOwnerModeActive ? null : user!.id)
        .order('created_at', { ascending: false });

      if (sbError) throw sbError;
      const itemsWithSignedUrls = await Promise.all(
        (data || []).map(async (item) => ({
          ...item,
          image_url: await resolveStoredImageUrl(item.image_url),
        }))
      );
      setItems(itemsWithSignedUrls);
    } catch (err: any) {
      console.error('[Supabase] fetchItems error:', err?.message);
      setError(err?.message || 'Impossible de charger la collection');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, isOwnerModeActive, user?.id]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const saveItem = useCallback(async (
    itemData: Omit<CollectionItemRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<CollectionItemRow | null> => {
    if (!user?.id && !isOwnerModeActive) {
      setError('Connectez-vous pour sauvegarder un objet.');
      return null;
    }

    try {
      const { data, error: sbError } = await supabase
        .from('collection_items')
        .insert({ ...itemData, user_id: isOwnerModeActive ? null : user!.id })
        .select()
        .single();

      if (sbError) throw sbError;
      setItems((prev) => [data, ...prev]);
      return data;
    } catch (err: any) {
      console.error('[Supabase] saveItem error:', err?.message);
      setError(err?.message || 'Sauvegarde impossible');
      return null;
    }
  }, [isOwnerModeActive, user?.id]);

  const deleteItem = useCallback(async (id: string) => {
    try {
      const { error: sbError } = await supabase
        .from('collection_items')
        .delete()
        .eq('id', id);

      if (sbError) throw sbError;
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err: any) {
      console.error('[Supabase] deleteItem error:', err?.message);
      setError(err?.message || 'Suppression impossible');
    }
  }, []);

  const updateNotes = useCallback(async (id: string, notes: string) => {
    try {
      const { data, error: sbError } = await supabase
        .from('collection_items')
        .update({ notes })
        .eq('id', id)
        .select()
        .single();

      if (sbError) throw sbError;
      setItems((prev) => prev.map((i) => (i.id === id ? data : i)));
    } catch (err: any) {
      console.error('[Supabase] updateNotes error:', err?.message);
      setError(err?.message || 'Mise à jour impossible');
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    items,
    isLoading,
    error,
    fetchItems,
    saveItem,
    deleteItem,
    updateNotes,
    clearError,
  };
}
