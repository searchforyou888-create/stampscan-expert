import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/design';
import { blink } from '@/lib/blink';
import { CollectibleType } from '@/types/collection';

const TYPE_FILTERS: { id: CollectibleType | 'all'; label: string; icon: any }[] = [
  { id: 'all', label: 'Tout', icon: 'grid-outline' },
  { id: 'stamp', label: 'Timbres', icon: 'mail' },
  { id: 'coin', label: 'Pièces', icon: 'ellipse' },
  { id: 'banknote', label: 'Billets', icon: 'cash' },
  { id: 'card', label: 'Cartes', icon: 'card' },
  { id: 'other', label: 'Autres', icon: 'cube' },
];
const TYPE_COLORS: Record<string, string> = {
  stamp: '#C8973A', coin: '#8B7355', banknote: '#2D9B6F', card: '#3B6FE8', other: '#8B7E9E',
};

async function fetchItems(type: CollectibleType | 'all', search: string) {
  const where: Record<string, string> = {};
  if (type !== 'all') where.type = type;
  const items = await blink.db.collectionItems.list({ where, orderBy: { createdAt: 'desc' } });
  if (!search) return items;
  const q = search.toLowerCase();
  return items.filter((i: any) =>
    i.name?.toLowerCase().includes(q) || i.originCountry?.toLowerCase().includes(q)
  );
}

export default function CatalogueScreen() {
  const router = useRouter();
  const [activeType, setActiveType] = useState<CollectibleType | 'all'>('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['collection', activeType, search],
    queryFn: () => fetchItems(activeType, search),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => blink.db.collectionItems.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collection'] }),
  });

  const handleDelete = useCallback((id: string, name: string) => {
    Alert.alert('Supprimer', `Supprimer "${name}" de votre collection ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  }, [deleteMutation]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Ma Collection</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{items.length}</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher..."
          placeholderTextColor={colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.8}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Type filters */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={TYPE_FILTERS}
        keyExtractor={(f) => f.id}
        contentContainerStyle={styles.filtersContent}
        style={styles.filters}
        renderItem={({ item: f }) => (
          <TouchableOpacity
            style={[styles.filterChip, activeType === f.id && styles.filterChipActive]}
            onPress={() => setActiveType(f.id)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={f.icon}
              size={13}
              color={activeType === f.id ? '#FFF' : colors.textSecondary}
            />
            <Text style={[styles.filterText, activeType === f.id && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Items grid */}
      <FlatList
        data={items}
        keyExtractor={(item: any) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.primary} />}
        ListEmptyComponent={!isLoading ? <EmptyState search={search} /> : null}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }: { item: any }) => (
          <TouchableOpacity
            style={styles.itemCard}
            activeOpacity={0.85}
            onPress={() => router.push(`/result/${item.id}`)}
            onLongPress={() => handleDelete(item.id, item.name)}
          >
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.itemImage} resizeMode="cover" />
            ) : (
              <View style={[styles.itemImagePlaceholder, { backgroundColor: (TYPE_COLORS[item.type] || colors.primary) + '22' }]}>
                <Ionicons name="image-outline" size={28} color={TYPE_COLORS[item.type] || colors.primary} />
              </View>
            )}
            <View style={styles.itemInfo}>
              <View style={[styles.typeDot, { backgroundColor: TYPE_COLORS[item.type] || colors.primary }]} />
              <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
              {item.estimatedValueMin != null && (
                <Text style={styles.itemValue}>
                  {Number(item.estimatedValueMin).toFixed(0)}–{Number(item.estimatedValueMax).toFixed(0)} {item.estimatedValueCurrency}
                </Text>
              )}
              {item.originCountry ? (
                <Text style={styles.itemMeta}>{item.originCountry} · {item.originYear}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="albums-outline" size={56} color={colors.border} />
      <Text style={styles.emptyTitle}>
        {search ? 'Aucun résultat' : 'Collection vide'}
      </Text>
      <Text style={styles.emptyText}>
        {search
          ? `Aucun objet correspondant à "${search}"`
          : 'Scannez vos premiers objets pour les retrouver ici'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.secondary, flex: 1 },
  countBadge: {
    backgroundColor: colors.primary, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
    minWidth: 28, alignItems: 'center',
  },
  countText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginBottom: spacing.sm,
    backgroundColor: '#FFF', borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    ...shadows.xs,
  },
  searchIcon: { marginRight: spacing.xs },
  searchInput: { flex: 1, ...typography.body, color: colors.text },

  filters: { maxHeight: 44 },
  filtersContent: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF', borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 6,
    borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 12, fontWeight: '500', color: colors.textSecondary },
  filterTextActive: { color: '#FFF', fontWeight: '700' },

  grid: { padding: spacing.sm, paddingBottom: 100 },
  columnWrapper: { gap: spacing.sm },

  itemCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: borderRadius.xl,
    overflow: 'hidden', marginBottom: spacing.sm, ...shadows.sm,
  },
  itemImage: { width: '100%', height: 120 },
  itemImagePlaceholder: {
    width: '100%', height: 120, justifyContent: 'center', alignItems: 'center',
  },
  itemInfo: { padding: spacing.sm },
  typeDot: { width: 6, height: 6, borderRadius: 3, marginBottom: 4 },
  itemName: { ...typography.small, color: colors.secondary, fontWeight: '600', lineHeight: 16, marginBottom: 4 },
  itemValue: { fontSize: 12, fontWeight: '700', color: colors.primary },
  itemMeta: { ...typography.tiny, color: colors.textTertiary, marginTop: 2 },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { ...typography.h4, color: colors.textSecondary, marginTop: spacing.md },
  emptyText: { ...typography.body, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xs },
});
