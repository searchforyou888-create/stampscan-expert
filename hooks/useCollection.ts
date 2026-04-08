import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { blink } from '@/lib/blink';
import { CollectibleType, CollectionItem, ScanResult } from '@/types/collection';

const COLLECTION_KEY = ['collection'];

// ── Fetch helpers ──────────────────────────────────────────────
async function fetchAllItems(): Promise<CollectionItem[]> {
  return blink.db.collectionItems.list({ orderBy: { createdAt: 'desc' } }) as Promise<CollectionItem[]>;
}

async function fetchItemById(id: string): Promise<CollectionItem | null> {
  return blink.db.collectionItems.get(id) as Promise<CollectionItem | null>;
}

// ── Main hook ──────────────────────────────────────────────────
export function useCollection() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: COLLECTION_KEY,
    queryFn: fetchAllItems,
  });

  // ── Save a new scan result ─────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (params: {
      scanResult: ScanResult;
      imageUrl: string;
      condition?: string;
      rarity?: string;
    }) => {
      const { scanResult, imageUrl, condition, rarity } = params;
      const now = new Date().toISOString();
      const item = {
        id: `item_${Date.now()}`,
        type: scanResult.type,
        name: scanResult.name,
        description: scanResult.description,
        estimatedValueMin: scanResult.estimatedValueMin,
        estimatedValueMax: scanResult.estimatedValueMax,
        estimatedValueCurrency: scanResult.currency || 'EUR',
        confidenceScore: scanResult.confidenceScore,
        historicalInfo: scanResult.historicalInfo,
        originCountry: scanResult.originCountry,
        originYear: scanResult.originYear,
        imageUrl,
        aiAnalysis: JSON.stringify({
          keyFacts: scanResult.keyFacts,
          condition: condition || scanResult.condition,
          rarity: rarity || scanResult.rarity,
        }),
        createdAt: now,
        updatedAt: now,
      };
      await blink.db.collectionItems.create(item);
      return item as unknown as CollectionItem;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: COLLECTION_KEY }),
  });

  // ── Update an item ─────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CollectionItem> }) =>
      blink.db.collectionItems.update(id, { ...data, updatedAt: new Date().toISOString() }),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: COLLECTION_KEY });
      const previous = queryClient.getQueryData<CollectionItem[]>(COLLECTION_KEY);
      queryClient.setQueryData<CollectionItem[]>(COLLECTION_KEY, (old = []) =>
        old.map((item) => (item.id === id ? { ...item, ...data } : item)),
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(COLLECTION_KEY, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: COLLECTION_KEY }),
  });

  // ── Delete with confirmation ───────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => blink.db.collectionItems.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: COLLECTION_KEY });
      const previous = queryClient.getQueryData<CollectionItem[]>(COLLECTION_KEY);
      queryClient.setQueryData<CollectionItem[]>(COLLECTION_KEY, (old = []) =>
        old.filter((item) => item.id !== id),
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(COLLECTION_KEY, ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: COLLECTION_KEY }),
  });

  const deleteItem = useCallback(
    (id: string, name: string) => {
      Alert.alert('Supprimer', `Supprimer "${name}" de votre collection ?`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
      ]);
    },
    [deleteMutation],
  );

  // ── Stats ──────────────────────────────────────────────────
  const stats = useMemo(() => {
    const byType = { stamp: 0, coin: 0, banknote: 0, card: 0, other: 0 } as Record<CollectibleType, number>;
    let totalValue = 0;
    for (const item of items) {
      byType[item.type] = (byType[item.type] || 0) + 1;
      totalValue += Number(item.estimatedValueMax) || 0;
    }
    return { total: items.length, byType, totalValue };
  }, [items]);

  return {
    items,
    isLoading,
    refetch,
    saveItem: saveMutation.mutateAsync,
    updateItem: (id: string, data: Partial<CollectionItem>) => updateMutation.mutateAsync({ id, data }),
    deleteItem,
    getItem: fetchItemById,
    stats,
  };
}

// ── Single-item hook ─────────────────────────────────────────
export function useCollectionItem(id: string | undefined) {
  return useQuery({
    queryKey: ['collection', 'item', id],
    queryFn: () => fetchItemById(id!),
    enabled: !!id,
  });
}
