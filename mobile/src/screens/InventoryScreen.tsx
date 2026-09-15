/**
 * InventoryScreen — product list with search, category filters, and stock info.
 */
import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../components/ThemeProvider';
import {useAuth} from '../components/AuthProvider';
import {
  fetchProducts,
  fetchCategories,
  type Product,
  type Category,
} from '../lib/api';
import {formatPrice} from '../lib/format';
import {spacing, typeScale} from '../theme';
import {
  Package,
  Tag,
  Shirt,
  Coffee,
  Apple,
  Cpu,
  BookOpen,
  Home,
  Car,
  Gamepad2,
  Heart,
  Baby,
  LayoutGrid,
} from 'lucide-react-native';
import type {ComponentType} from 'react';

// Map category icons to lucide components
const CATEGORY_ICON_MAP: Record<string, ComponentType<any>> = {
  tag: Tag,
  shirt: Shirt,
  coffee: Coffee,
  apple: Apple,
  cpu: Cpu,
  book: BookOpen,
  home: Home,
  car: Car,
  gamepad: Gamepad2,
  heart: Heart,
  baby: Baby,
  box: Package,
  'layout-grid': LayoutGrid,
};

type SortKey = 'name' | 'price' | 'qty' | 'updated';

export function InventoryScreen() {
  const {tokens} = useTheme();
  const {shop} = useAuth();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('name');

  const loadInventory = useCallback(async () => {
    if (!shop) {
      setLoading(false);
      return;
    }
    try {
      const [prods, cats] = await Promise.all([
        fetchProducts({limit: 500}),
        fetchCategories(),
      ]);
      setProducts(prods);
      setCategories(cats.filter(c => !c.archived_at));
    } catch (err) {
      console.error('[Inventory] Failed to load:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to load inventory',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shop]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  const getCategoryName = (id: string | null) => {
    if (!id) {
      return 'Uncategorized';
    }
    return categories.find(c => c.id === id)?.name ?? 'Unknown';
  };

  const filtered = useMemo(() => {
    let list = products.filter(p => !p.archived_at);

    if (selectedCategory) {
      list = list.filter(p => p.category_id === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.barcode && p.barcode.includes(q)),
      );
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price':
          return b.price - a.price;
        case 'qty':
          return a.qty - b.qty;
        case 'updated':
          return (
            new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          );
        default:
          return 0;
      }
    });

    return list;
  }, [products, selectedCategory, search, sortBy]);

  const lowStockCount = useMemo(
    () =>
      products.filter(
        p => !p.archived_at && p.track_stock && p.qty <= p.low_stock_threshold,
      ).length,
    [products],
  );

  const renderProduct = ({item}: {item: Product}) => {
    const isLowStock = item.track_stock && item.qty <= item.low_stock_threshold;
    const isOut = item.track_stock && item.qty <= 0;
    const category = categories.find(c => c.id === item.category_id);

    return (
      <View
        style={[
          styles.productRow,
          {backgroundColor: tokens.surface, borderBottomColor: tokens.border},
        ]}>
        {/* Icon */}
        <View
          style={[
            styles.productIcon,
            {
              backgroundColor: category?.color
                ? category.color + '20'
                : tokens.surface2,
            },
          ]}>
          {(() => {
            const IconComp = category?.icon
              ? CATEGORY_ICON_MAP[category.icon.toLowerCase()]
              : undefined;
            return IconComp ? (
              <IconComp
                size={22}
                color={category?.color ?? tokens.text3}
                strokeWidth={1.75}
              />
            ) : (
              <Package size={22} color={tokens.text3} strokeWidth={1.75} />
            );
          })()}
        </View>

        {/* Info */}
        <View style={styles.productInfo}>
          <Text
            style={[styles.productName, {color: tokens.text}]}
            numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={[styles.productMeta, {color: tokens.text3}]}>
            {item.sku} · {getCategoryName(item.category_id)}
          </Text>
        </View>

        {/* Stock + Price */}
        <View style={styles.productRight}>
          <Text style={[styles.productPrice, {color: tokens.navAccent}]}>
            {shop ? formatPrice(item.price, shop) : `₹${item.price}`}
          </Text>
          {item.track_stock ? (
            <Text
              style={[
                styles.stockBadge,
                {
                  color: isOut
                    ? '#EF4444'
                    : isLowStock
                    ? '#F59E0B'
                    : tokens.text3,
                },
              ]}>
              {isOut ? 'OUT' : `${item.qty} in stock`}
            </Text>
          ) : null}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: tokens.bg}]}>
        <ActivityIndicator size="large" color={tokens.navAccent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: tokens.bg}]}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + spacing.lg}]}>
        <View style={styles.headerRow}>
          <Text style={[typeScale.heading, {color: tokens.text}]}>
            Inventory
          </Text>
          <Text style={[typeScale.caption, {color: tokens.text3}]}>
            {filtered.length} items
            {lowStockCount > 0 ? ` · ${lowStockCount} low stock` : ''}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBar,
            {backgroundColor: tokens.surface2, borderColor: tokens.border},
          ]}>
          <TextInput
            style={[styles.searchInput, {color: tokens.text}]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search inventory..."
            placeholderTextColor={tokens.text3}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={{color: tokens.text3, fontSize: 16}}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category filter + Sort */}
      <View style={styles.filterRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[
            {
              id: '',
              name: 'All',
              icon: 'layout-grid',
              color: '',
              sort_order: 0,
              shop_id: '',
              archived_at: null,
            } as Category,
            ...categories,
          ]}
          keyExtractor={c => c.id ?? 'all'}
          contentContainerStyle={styles.filterList}
          renderItem={({item: cat}) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                {
                  backgroundColor:
                    selectedCategory === cat.id
                      ? tokens.navAccent
                      : tokens.surface2,
                },
              ]}
              onPress={() => setSelectedCategory(cat.id)}>
              <Text
                style={{
                  color: selectedCategory === cat.id ? '#fff' : tokens.text2,
                  ...typeScale.caption,
                  fontWeight: '600',
                }}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          )}
        />

        {/* Sort toggle */}
        <TouchableOpacity
          style={[styles.sortBtn, {backgroundColor: tokens.surface2}]}
          onPress={() => {
            const order: SortKey[] = ['name', 'price', 'qty', 'updated'];
            const idx = order.indexOf(sortBy);
            setSortBy(order[(idx + 1) % order.length]);
          }}>
          <Text style={[styles.sortBtnText, {color: tokens.text2}]}>
            {sortBy === 'name'
              ? 'A-Z'
              : sortBy === 'price'
              ? 'Price'
              : sortBy === 'qty'
              ? 'Stock'
              : 'Recent'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Product list */}
      <FlatList
        data={filtered}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadInventory();
        }}
        contentContainerStyle={{paddingBottom: insets.bottom + 20}}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, {color: tokens.text3}]}>
              No products found
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: {paddingHorizontal: spacing.xl, marginBottom: spacing.sm},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  searchRow: {paddingHorizontal: spacing.xl, marginBottom: spacing.sm},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 42,
  },
  searchInput: {flex: 1, ...typeScale.body, paddingVertical: 0},
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
  filterList: {gap: spacing.xs, flexGrow: 1},
  filterChip: {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16},
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: spacing.sm,
  },
  sortBtnText: {...typeScale.caption, fontWeight: '600'},
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  productInfo: {flex: 1},
  productName: {...typeScale.title},
  productMeta: {...typeScale.tiny, marginTop: 2},
  productRight: {alignItems: 'flex-end', marginLeft: spacing.sm},
  productPrice: {...typeScale.body, fontWeight: '600'},
  stockBadge: {...typeScale.tiny, marginTop: 2},
  emptyContainer: {paddingVertical: 60, alignItems: 'center'},
  emptyText: {...typeScale.body},
});
