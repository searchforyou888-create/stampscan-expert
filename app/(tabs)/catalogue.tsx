import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, RefreshControl, TextInput, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/ui/Card';
import { Badge, RarityLevel } from '@/components/ui/Badge';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, typography, borderRadius, shadows } from '@/constants/design';
import { supabase } from '@/lib/supabase';
import { CollectibleType } from '@/types/collection';
import { useCatalogue } from '@/hooks/useCatalogue';
import { useAuth } from '@/hooks/useAuth';
import { CollectibleCategory } from '@/types/supabase';
import { resolveStoredImageUrl } from '@/lib/storage';

type Tab = 'collection' | 'library';

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
const RARITY_COLORS: Record<string, string> = {
  'Commun': '#8B7E9E',
  'Peu commun': '#3B6FE8',
  'Rare': '#C8973A',
  'Tres rare': '#EF4444',
  'Exceptionnel': '#8B5CF6',
};

async function fetchMyItems(type: CollectibleType | 'all', search: string, isOwnerModeActive: boolean, userId?: string) {
  console.log('🔍 fetchMyItems called:', { isOwnerModeActive, userId, type, search });
  
  try {
    let query = supabase
      .from('collection_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (isOwnerModeActive) {
      query = query.is('user_id', null);
      console.log('✅ Owner mode: fetching items with user_id IS NULL');
    } else if (userId) {
      query = query.eq('user_id', userId);
      console.log('👤 User mode: fetching items with user_id =', userId);
    }

    if (type !== 'all') query = query.eq('type', type);

    if (search) {
      const q = search.toLowerCase();
      query = query.or(`name.ilike.%${q}%,origin_country.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('❌ Supabase query error:', JSON.stringify(error));
      throw error;
    }

    console.log('📦 Got items:', data?.length || 0, data?.map(i => i.name));
    return data || [];
  } catch (err) {
    console.error('❌ fetchMyItems exception:', err);
    throw err;
  }
}

export default function CatalogueScreen() {
  const router = useRouter();
  const { user, isOwnerModeActive } = useAuth();
  const [tab, setTab] = useState<Tab>('collection');
  const [activeType, setActiveType] = useState<CollectibleType | 'all'>('all');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const userId = user?.id ?? null;
  const { data: myItems = [], isLoading: myLoading, refetch: refetchMy, error: queryError } = useQuery({
    queryKey: ['collection', activeType, search, isOwnerModeActive, userId],
    queryFn: () => fetchMyItems(activeType, search, isOwnerModeActive, user?.id),
    retry: 2,
  });

  // Log query errors
  React.useEffect(() => {
    if (queryError) {
      console.error('❌ React Query error:', queryError);
    }
  }, [queryError]);

  // Forcer refetch quand Owner Mode change
  React.useEffect(() => {
    if (isOwnerModeActive) {
      console.log('📦 Owner Mode active, refetching collection...');
      refetchMy();
    }
  }, [isOwnerModeActive, refetchMy]);

  const { items: libraryItems, isLoading: libLoading, refresh: refreshLib } = useCatalogue(
    tab === 'library' && activeType !== 'all' ? activeType as CollectibleCategory : undefined,
    tab === 'library' ? search : undefined
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => supabase.from('collection_items').delete().eq('id', id).then(({ error }) => { if (error) throw error; }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['collection'] }),
  });

  const handleDelete = useCallback((id: string, name: string) => {
    Alert.alert('Supprimer', `Supprimer "${name}" de votre collection ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => deleteMutation.mutate(id) },
    ]);
  }, [deleteMutation]);

  const isLoading = tab === 'collection' ? myLoading : libLoading;
  const onRefresh = tab === 'collection' ? refetchMy : refreshLib;
  const count = tab === 'collection' ? myItems.length : libraryItems.length;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={{ backgroundColor: '#FFD60A', padding: 8 }}>
        <Text style={{ color: '#1A1A2E', fontWeight: 'bold' }}>DEBUG: myItems.length = {myItems.length}</Text>
        <Text style={{ color: '#1A1A2E', fontSize: 10 }} numberOfLines={2}>{JSON.stringify(myItems)}</Text>
      </View>
      {/* Debug Panel */}
      <View style={{ backgroundColor: '#1a1a2e', paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2d2d4e' }}>
        <Text style={{ color: '#FFD60A', fontSize: 10, fontWeight: 'bold' }}>
          🔍 DEBUG: Items={myItems.length} | Owner={String(isOwnerModeActive)} | Loading={String(myLoading)}
        </Text>
        <Text style={{ color: '#667eea', fontSize: 9, marginTop: 2 }}>
          User: {user?.id?.slice(0, 8) || 'null'} | Tab: {tab}
        </Text>
        {queryError ? (
          <Text style={{ color: '#EF4444', fontSize: 9, marginTop: 2 }}>
            Error: {String(queryError).slice(0, 100)}
          </Text>
        ) : null}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{tab === 'collection' ? 'Ma Collection' : 'Bibliothèque'}</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      </View>

      {/* Onglets */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'collection' && styles.tabBtnActive]}
          onPress={() => { setTab('collection'); setSearch(''); }}
          activeOpacity={0.8}
        >
          <Ionicons name="albums" size={14} color={tab === 'collection' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'collection' && styles.tabTextActive]}>Ma collection</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'library' && styles.tabBtnActive]}
          onPress={() => { setTab('library'); setSearch(''); }}
          activeOpacity={0.8}
        >
          <Ionicons name="library" size={14} color={tab === 'library' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, tab === 'library' && styles.tabTextActive]}>Bibliothèque</Text>
        </TouchableOpacity>
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
            <Ionicons name={f.icon} size={13} color={activeType === f.id ? '#FFF' : colors.textSecondary} />
            <Text style={[styles.filterText, activeType === f.id && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        )}
      />

      {/* Grille selon l'onglet actif */}
      {tab === 'collection' ? (
        <FlatList
          data={myItems}
          keyExtractor={(item: any) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          refreshControl={<RefreshControl refreshing={myLoading} onRefresh={refetchMy} tintColor={colors.primary} />}
          ListEmptyComponent={!myLoading ? <EmptyState search={search} mode="collection" /> : null}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }: { item: any }) => (
            <Card
              variant="elevated"
              rarity={mapRarity(item.rarity)}
              style={{ margin: 6 }}
              onPress={() => router.push(`/result/${item.id}`)}
              testID={`card-${item.id}`}
            >
              <View style={{ alignItems: 'center', marginTop: 18, marginBottom: 8 }}>
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: '#F0F0E8', borderWidth: 2, borderColor: '#FFF', overflow: 'hidden' }}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.itemImagePlaceholder, { width: 90, height: 90, borderRadius: 45, backgroundColor: (TYPE_COLORS[item.type || ''] || colors.primary) + '22', alignItems: 'center', justifyContent: 'center' }]}> 
                    <Ionicons name="image-outline" size={32} color={TYPE_COLORS[item.type || ''] || colors.primary} />
                  </View>
                )}
                {/* Score de confiance IA si présent */}
                {item.ai_confidence && (
                  <View style={{ position: 'absolute', bottom: -10, left: '50%', transform: [{ translateX: -36 }], backgroundColor: '#FFD60A', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 2, shadowColor: '#FFD60A', shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }}>
                    <Text style={{ color: '#1A1A2E', fontWeight: 'bold', fontSize: 12 }}>{Math.round(item.ai_confidence * 100)}% Match</Text>
                  </View>
                )}
              </View>
              <Card.Header>
                <Text style={{ fontWeight: 'bold', fontSize: 15, color: '#1A1A2E' }} numberOfLines={1}>{item.name}</Text>
                <Text style={{ color: '#8B7E9E', fontSize: 12, marginTop: 2 }}>{item.origin_year || ''}</Text>
              </Card.Header>
              <Card.Content>
                {item.estimated_value_min != null && (
                  <Text style={styles.itemValue}>
                    {Number(item.estimated_value_min).toFixed(0)}–{Number(item.estimated_value_max).toFixed(0)} {item.estimated_value_currency}
                  </Text>
                )}
                {item.origin_country ? (
                  <Text style={styles.itemMeta}>{item.origin_country}</Text>
                ) : null}
                {/* Badge expert si vérifié */}
                {item.expert_verification_status && item.expert_verification_status !== 'none' ? (
                  <View
                    style={[
                      styles.expertBadge,
                      item.expert_verification_status === 'verified' ? styles.expertBadgeVerified : styles.expertBadgePending,
                    ]}
                  >
                    <Ionicons
                      name={item.expert_verification_status === 'verified' ? 'checkmark-circle' : 'time-outline'}
                      size={11}
                      color={item.expert_verification_status === 'verified' ? colors.successDark : colors.warningDark}
                    />
                    <Text
                      style={[
                        styles.expertBadgeText,
                        item.expert_verification_status === 'verified' ? styles.expertBadgeTextVerified : styles.expertBadgeTextPending,
                      ]}
                    >
                      {item.expert_verification_status === 'verified' ? 'Expert valide' : 'Revue pro'}
                    </Text>
                  </View>
                ) : null}
              </Card.Content>
            </Card>
          )}
        />
      ) : (
        <FlatList
          data={libraryItems}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          refreshControl={<RefreshControl refreshing={libLoading} onRefresh={refreshLib} tintColor={colors.primary} />}
          ListEmptyComponent={!libLoading ? <EmptyState search={search} mode="library" /> : null}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => (
            <View style={styles.itemCard}>
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.itemImage} resizeMode="cover" />
              ) : (
                <View style={[styles.itemImagePlaceholder, { backgroundColor: (TYPE_COLORS[item.category] || colors.primary) + '22' }]}>
                  <Ionicons name="library-outline" size={28} color={TYPE_COLORS[item.category] || colors.primary} />
                </View>
              )}
              <View style={styles.itemInfo}>
                <View style={styles.itemInfoRow}>
                  <View style={[styles.typeDot, { backgroundColor: TYPE_COLORS[item.category] || colors.primary }]} />
                  {item.rarity ? (
                    <Text style={[styles.rarityBadge, { color: RARITY_COLORS[item.rarity] || colors.textSecondary }]}>
                      {item.rarity}
                    </Text>
                  ) : null}
                </View>
                <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.itemValue}>
                  {Number(item.estimated_value_min).toFixed(0)}–{Number(item.estimated_value_max).toFixed(0)} {item.currency}
                </Text>
                {item.country ? (
                  <Text style={styles.itemMeta}>
                    {item.country}{item.period_start ? ` · ${item.period_start}${item.period_end && item.period_end !== item.period_start ? `–${item.period_end}` : ''}` : ''}
                  </Text>
                ) : null}
                {item.catalogue_ref ? (
                  <Text style={styles.catalogueRef}>{item.catalogue_ref}</Text>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function EmptyState({ search, mode }: { search: string; mode: Tab }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={mode === 'collection' ? 'albums-outline' : 'library-outline'} size={56} color={colors.border} />
      <Text style={styles.emptyTitle}>
        {search ? 'Aucun résultat' : mode === 'collection' ? 'Collection vide' : 'Bibliothèque vide'}
      </Text>
      <Text style={styles.emptyText}>
        {search
          ? `Aucun objet correspondant à "${search}"`
          : mode === 'collection'
          ? 'Scannez vos premiers objets pour les retrouver ici'
          : 'Exécutez les migrations SQL pour charger les données de référence'}
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

  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 8, borderRadius: borderRadius.md,
  },
  tabBtnActive: { backgroundColor: '#FFF', ...shadows.xs },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.primary, fontWeight: '700' },

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
  itemInfoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 4 },
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  rarityBadge: { fontSize: 10, fontWeight: '700' },
  itemName: { ...typography.small, color: colors.secondary, fontWeight: '600', lineHeight: 16, marginBottom: 4 },
  expertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: borderRadius.full,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 5,
    borderWidth: 1,
  },
  expertBadgePending: { backgroundColor: colors.warningTint, borderColor: '#F5C04055' },
  expertBadgeVerified: { backgroundColor: colors.successTint, borderColor: '#4DB88A55' },
  expertBadgeText: { fontSize: 10, fontWeight: '700' },
  expertBadgeTextPending: { color: colors.warningDark },
  expertBadgeTextVerified: { color: colors.successDark },
  itemValue: { fontSize: 12, fontWeight: '700', color: colors.primary },
  itemMeta: { ...typography.tiny, color: colors.textTertiary, marginTop: 2 },
  catalogueRef: { fontSize: 10, color: colors.textSecondary, marginTop: 2, fontStyle: 'italic' },

  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyTitle: { ...typography.h4, color: colors.textSecondary, marginTop: spacing.md },
  emptyText: { ...typography.body, color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xs },
});
