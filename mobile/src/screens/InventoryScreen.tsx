/**
 * InventoryScreen — product list with search, filter, sort.
 */
import React, {useState, useEffect, useMemo} from 'react';
import {View, Text, FlatList, TouchableOpacity, ScrollView, TextInput} from 'react-native';
import {useTheme} from '../components/ThemeProvider';
import {useAuth} from '../components/AuthProvider';
import {fetchProducts, type Product, type Shop} from '../lib/api';
import {formatPrice} from '../lib/format';
import {TopBar, EmptyState, Badge, PageHeadingBlock} from '../components/ui';
import {spacing, radii, typeScale} from '../theme';
import {
  Plus,
  Search,
  ArrowUpDown,
  X,
  Package,
} from 'lucide-react-native';

export function InventoryScreen({navigation}: any) {
  const {tokens} = useTheme();
  const {shop} = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [_loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<
    'name-asc' | 'name-desc' | 'stock-asc' | 'stock-desc'
  >('name-asc');
  const [showSort, setShowSort] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (e) {
        console.error('Failed to load products', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categories = useMemo(() => {
    const cats = new Map<string, number>();
    products.forEach(p => {
      const cat = typeof p.category === 'object' ? p.category?.name : p.category;
      if (cat) {
        cats.set(cat, (cats.get(cat) || 0) + 1);
      }
    });
    return Array.from(cats.entries()).map(([name, count]) => ({name, count}));
  }, [products]);

  const lowStockCount = useMemo(
    () =>
      products.filter(
        p =>
          p.track_stock !== false &&
          p.low_stock_threshold != null &&
          p.qty <= p.low_stock_threshold &&
          p.qty > 0,
      ).length,
    [products],
  );

  const filtered = useMemo(() => {
    let list = [...products];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q),
      );
    }

    if (categoryFilter) {
      list = list.filter(p => {
        const cat = typeof p.category === 'object' ? p.category?.name : p.category;
        return cat === categoryFilter;
      });
    }

    switch (sortKey) {
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name-desc':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'stock-asc':
        list.sort((a, b) => (a.qty || 0) - (b.qty || 0));
        break;
      case 'stock-desc':
        list.sort((a, b) => (b.qty || 0) - (a.qty || 0));
        break;
    }

    return list;
  }, [products, search, sortKey, categoryFilter]);

  const activeFilters = (search ? 1 : 0) + (categoryFilter ? 1 : 0);

  const getStockBadge = (p: Product) => {
    if (p.track_stock === false) {
      return {label: 'Active', variant: 'success' as const};
    }
    if (p.qty === 0) {
      return {label: 'Out of stock', variant: 'danger' as const};
    }
    if (p.low_stock_threshold != null && p.qty <= p.low_stock_threshold) {
      return {label: `Low — ${p.qty}`, variant: 'warning' as const};
    }
    return {label: 'In stock', variant: 'success' as const};
  };

  const sortOptions = [
    {key: 'name-asc' as const, label: 'Name · A → Z'},
    {key: 'name-desc' as const, label: 'Name · Z → A'},
    {key: 'stock-desc' as const, label: 'Stock · High → Low'},
    {key: 'stock-asc' as const, label: 'Stock · Low → High'},
  ];

  const renderProduct = ({item}: {item: Product}) => {
    const badge = getStockBadge(item);
    const catName =
      typeof item.category === 'object'
        ? item.category?.name
        : item.category;

    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ProductDetail', {id: item.id})}
        style={[
          styles.productCard,
          {backgroundColor: tokens.surface, borderColor: tokens.border},
        ]}>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text
              style={[styles.productName, {color: tokens.text}]}
              numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.productMeta}>
              <Text style={[styles.productSku, {color: tokens.text3}]}>
                {item.sku}
              </Text>
              {catName && (
                <>
                  <Text style={{color: tokens.text3}}>&middot;</Text>
                  <Text style={[styles.productCat, {color: tokens.text2}]}>
                    {catName}
                  </Text>
                </>
              )}
            </View>
          </View>
          <Badge label={badge.label} variant={badge.variant} size="sm" />
        </View>

        <View style={styles.productBottom}>
          <Text style={[styles.productPrice, {color: tokens.text}]}>
            {shop ? formatPrice(item.price, shop) : `₹${item.price}`}
          </Text>
          <Text style={[styles.productStock, {color: tokens.text2}]}>
            {item.qty} in stock
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: tokens.bg}]}>
      <TopBar
        leadingIcon={
          <Text style={[typeScale.heading, {color: tokens.text}]}>Inventory</Text>
        }
        trailingIcons={[
          <TouchableOpacity
            key="add"
            activeOpacity={0.7}
            onPress={() => navigation.navigate('AddProduct')}
            style={[styles.addBtn, {backgroundColor: tokens.navAccent}]}>
            <Plus size={16} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>,
        ]}
      />

      {/* ── Summary stats ── */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryItem, {backgroundColor: tokens.surface2}]}>
          <Text style={[styles.summaryValue, {color: tokens.text}]}>
            {products.filter(p => !p.archived_at).length}
          </Text>
          <Text style={[styles.summaryLabel, {color: tokens.text3}]}>
            Total
          </Text>
        </View>
        <View style={[styles.summaryItem, {backgroundColor: tokens.surface2}]}>
          <Text style={[styles.summaryValue, {color: tokens.text}]}>
            {lowStockCount}
          </Text>
          <Text style={[styles.summaryLabel, {color: tokens.text3}]}>
            Low stock
          </Text>
        </View>
        <View style={[styles.summaryItem, {backgroundColor: tokens.surface2}]}>
          <Text style={[styles.summaryValue, {color: tokens.text}]}>
            {categories.length}
          </Text>
          <Text style={[styles.summaryLabel, {color: tokens.text3}]}>
            Categories
          </Text>
        </View>
      </View>

      {/* ── Search + Sort row ── */}
      <View style={styles.searchFilterRow}>
        <View
          style={[
            styles.searchBar,
            {borderColor: tokens.border, backgroundColor: tokens.surface},
          ]}>
          <Search size={16} color={tokens.text3} strokeWidth={1.75} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor={tokens.text3}
            style={[styles.searchInput, {color: tokens.text}]}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={14} color={tokens.text3} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setShowSort(!showSort)}
          style={[
            styles.filterBtn,
            {borderColor: tokens.border, backgroundColor: tokens.surface},
          ]}>
          <ArrowUpDown size={16} color={tokens.text2} strokeWidth={1.75} />
        </TouchableOpacity>
      </View>

      {/* ── Sort dropdown ── */}
      {showSort && (
        <View
          style={[
            styles.sortDropdown,
            {backgroundColor: tokens.surface, borderColor: tokens.border},
          ]}>
          {sortOptions.map(opt => (
            <TouchableOpacity
              key={opt.key}
              activeOpacity={0.7}
              onPress={() => {
                setSortKey(opt.key);
                setShowSort(false);
              }}
              style={[
                styles.sortOption,
                sortKey === opt.key && {
                  backgroundColor: tokens.navAccent + '12',
                },
              ]}>
              <Text
                style={[
                  styles.sortOptionText,
                  {
                    color:
                      sortKey === opt.key ? tokens.navAccent : tokens.text,
                  },
                ]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Category chips ── */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setCategoryFilter('')}
            style={[
              styles.chip,
              {
                backgroundColor: !categoryFilter
                  ? tokens.navAccent
                  : tokens.surface,
                borderColor: !categoryFilter
                  ? tokens.navAccent
                  : tokens.border,
              },
            ]}>
            <Text
              style={[
                styles.chipText,
                {color: !categoryFilter ? '#fff' : tokens.text2},
              ]}>
              All
            </Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.name}
              activeOpacity={0.7}
              onPress={() => setCategoryFilter(cat.name)}
              style={[
                styles.chip,
                {
                  backgroundColor:
                    categoryFilter === cat.name
                      ? tokens.navAccent
                      : tokens.surface,
                  borderColor:
                    categoryFilter === cat.name
                      ? tokens.navAccent
                      : tokens.border,
                },
              ]}>
              <Text
                style={[
                  styles.chipText,
                  {
                    color:
                      categoryFilter === cat.name ? '#fff' : tokens.text2,
                  },
                ]}>
                {cat.name}
              </Text>
              <View
                style={[
                  styles.chipCount,
                  {
                    backgroundColor:
                      categoryFilter === cat.name
                        ? 'rgba(255,255,255,0.25)'
                        : tokens.surface2,
                  },
                ]}>
                <Text
                  style={[
                    styles.chipCountText,
                    {
                      color:
                        categoryFilter === cat.name ? '#fff' : tokens.text3,
                    },
                  ]}>
                  {cat.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* ── Active filter indicator ── */}
      {activeFilters > 0 && (
        <View style={styles.activeFilterRow}>
          <Text style={[styles.activeFilterText, {color: tokens.text3}]}>
            {filtered.length} of {products.length} products
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              setSearch('');
              setCategoryFilter('');
            }}
            style={styles.clearFilterBtn}>
            <X size={12} color={tokens.text3} strokeWidth={2} />
            <Text style={[styles.clearFilterText, {color: tokens.text3}]}>
              Clear {activeFilters} filter{activeFilters > 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Product list ── */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderProduct}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon={<Package size={32} color={tokens.text3} strokeWidth={1.5} />}
            title="No products found"
            subtitle="Try adjusting your search or filters."
          />
        }
      />
    </View>
  );
}

const styles = {
  container: {flex: 1} as const,
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
  } as const,
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  } as const,
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  } as const,
  summaryValue: {
    ...typeScale.heading,
    fontWeight: '700',
  } as const,
  summaryLabel: {
    ...typeScale.tiny,
    marginTop: 2,
  } as const,
  searchFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  } as const,
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  } as const,
  searchInput: {
    flex: 1,
    ...typeScale.body,
    paddingVertical: 0,
  } as const,
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  } as const,
  sortDropdown: {
    marginHorizontal: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.xs,
    marginBottom: spacing.sm,
  } as const,
  sortOption: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  } as const,
  sortOptionText: {
    ...typeScale.body,
  } as const,
  chipRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  } as const,
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    gap: spacing.xs,
  } as const,
  chipText: {
    ...typeScale.caption,
    fontWeight: '500',
  } as const,
  chipCount: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  } as const,
  chipCountText: {
    ...typeScale.tiny,
    fontWeight: '600',
  } as const,
  activeFilterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  } as const,
  activeFilterText: {
    ...typeScale.caption,
  } as const,
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as const,
  clearFilterText: {
    ...typeScale.caption,
    fontWeight: '500',
  } as const,
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  } as const,
  productCard: {
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  } as const,
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  } as const,
  productInfo: {
    flex: 1,
    marginRight: spacing.sm,
  } as const,
  productName: {
    ...typeScale.title,
    fontWeight: '600',
    marginBottom: 2,
  } as const,
  productMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  } as const,
  productSku: {
    ...typeScale.tiny,
    fontFamily: 'monospace',
  } as const,
  productCat: {
    ...typeScale.tiny,
  } as const,
  productBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as const,
  productPrice: {
    ...typeScale.heading,
    fontWeight: '700',
  } as const,
  productStock: {
    ...typeScale.caption,
  } as const,
};
