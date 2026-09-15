/**
 * InventoryScreen — product list with search, category filters, stock info,
 * add/edit modal, and archive (delete) confirmation.
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
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../components/ThemeProvider';
import {useAuth} from '../components/AuthProvider';
import {BarcodeScannerModal} from '../components/BarcodeScannerModal';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type Product,
  type Category,
} from '../lib/api';
import {
  isOnline,
  syncProductsDown,
  syncCategoriesDown,
  getLocalProducts,
  getLocalCategories,
} from '../lib/sync';
import {formatPrice} from '../lib/format';
import {spacing, radii, typeScale} from '../theme';
import {
  TopBar,
  PageHeadingBlock,
  ListRow,
  QuickActionTileGrid,
  type ActionTile,
} from '../components/ui';
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
  Plus,
  X,
  Search,
  ScanLine,
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

interface ProductForm {
  name: string;
  sku: string;
  price: string;
  cost_price: string;
  qty: string;
  unit: string;
  category_id: string;
  description: string;
  track_stock: boolean;
  track_barcode: boolean;
  low_stock_threshold: string;
  barcode: string;
}

const EMPTY_FORM: ProductForm = {
  name: '',
  sku: '',
  price: '',
  cost_price: '',
  qty: '0',
  unit: 'piece',
  category_id: '',
  description: '',
  track_stock: true,
  track_barcode: true,
  low_stock_threshold: '',
  barcode: '',
};

const UNITS = ['piece', 'kg', 'g', 'l', 'ml', 'box', 'pack', 'dozen'];

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

  // Modal state
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    product: Product | null;
  }>({visible: false, product: null});
  const [deleting, setDeleting] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);

  const setField = <K extends keyof ProductForm>(
    key: K,
    value: ProductForm[K],
  ) => {
    setForm(prev => ({...prev, [key]: value}));
  };

  const loadInventory = useCallback(async () => {
    if (!shop) {
      setLoading(false);
      return;
    }
    try {
      // 1. Local first
      const [localProds, localCats] = await Promise.all([
        getLocalProducts(),
        getLocalCategories(),
      ]);
      if (localProds.length > 0) {
        setProducts(localProds);
      }
      if (localCats.length > 0) {
        setCategories(localCats.filter(c => !c.archived_at));
      }

      // 2. Network if online
      if (await isOnline()) {
        await Promise.all([
          syncCategoriesDown(shop.id),
          syncProductsDown(shop.id),
        ]);
        const [freshProds, freshCats] = await Promise.all([
          getLocalProducts(),
          getLocalCategories(),
        ]);
        setProducts(freshProds);
        setCategories(freshCats.filter(c => !c.archived_at));
      }
    } catch (err) {
      console.error('[Inventory] Failed to load:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shop]);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // ── Add / Edit ──────────────────────────────────────────────

  const openAdd = () => {
    setForm({...EMPTY_FORM});
    setEditId(null);
    setFormVisible(true);
  };

  const openEdit = (p: Product) => {
    setForm({
      name: p.name,
      sku: p.sku,
      price: String(p.price),
      cost_price: p.cost_price ? String(p.cost_price) : '',
      qty: String(p.qty),
      unit: p.unit ?? 'piece',
      category_id: p.category_id ?? '',
      description: p.description ?? '',
      track_stock: p.track_stock !== false,
      track_barcode: p.track_barcode !== false,
      low_stock_threshold: p.low_stock_threshold
        ? String(p.low_stock_threshold)
        : '',
      barcode: p.barcode ?? '',
    });
    setEditId(p.id);
    setFormVisible(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Product name is required');
      return;
    }
    if (!form.sku.trim()) {
      Alert.alert('Required', 'SKU is required');
      return;
    }
    const price = parseFloat(form.price || '0');
    if (isNaN(price) || price < 0) {
      Alert.alert('Invalid', 'Enter a valid selling price');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        price,
        cost_price: parseFloat(form.cost_price || '0') || 0,
        qty: parseInt(form.qty || '0', 10) || 0,
        unit: form.unit,
        category_id: form.category_id || null,
        description: form.description.trim() || null,
        track_stock: form.track_stock,
        track_barcode: form.track_barcode,
        low_stock_threshold:
          form.track_stock && form.low_stock_threshold
            ? parseInt(form.low_stock_threshold, 10)
            : null,
        barcode: form.barcode.trim() || null,
      };

      if (editId) {
        const updated = await updateProduct(editId, payload);
        setProducts(prev =>
          prev.map(p => (p.id === editId ? {...p, ...updated} : p)),
        );
      } else {
        const created = await createProduct(payload);
        setProducts(prev => [created, ...prev]);
      }
      setFormVisible(false);
    } catch (err) {
      console.error('[Inventory] Save failed:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to save product',
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Archive (Delete) ────────────────────────────────────────

  const confirmArchive = (p: Product) => {
    setDeleteConfirm({visible: true, product: p});
  };

  const handleArchive = async () => {
    const p = deleteConfirm.product;
    if (!p) {
      return;
    }
    setDeleting(true);
    try {
      await deleteProduct(p.id);
      setProducts(prev => prev.filter(x => x.id !== p.id));
      setDeleteConfirm({visible: false, product: null});
    } catch (err) {
      console.error('[Inventory] Archive failed:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to archive product',
      );
    } finally {
      setDeleting(false);
    }
  };

  // ── Derived ─────────────────────────────────────────────────

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

  const categoryTiles: ActionTile[] = [
    {
      id: '',
      label: 'All',
      icon: ({color, size}: {color: string; size: number}) => (
        <LayoutGrid color={color} size={size} strokeWidth={1.75} />
      ),
    },
    ...categories.map(c => {
      const IconComp = c.icon
        ? CATEGORY_ICON_MAP[c.icon.toLowerCase()]
        : Package;
      return {
        id: c.id,
        label: c.name,
        icon: ({color, size}: {color: string; size: number}) =>
          IconComp ? (
            <IconComp color={color} size={size} strokeWidth={1.75} />
          ) : (
            <Package color={color} size={size} strokeWidth={1.75} />
          ),
      };
    }),
  ];

  // ── Main render ─────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: tokens.bg}]}>
        <ActivityIndicator size="large" color={tokens.navAccent} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: tokens.bg, paddingTop: insets.top},
      ]}>
      {/* Header */}
      <TopBar
        trailingIcons={[
          <Search key="search" size={24} color={tokens.text2} />,
          <Plus
            key="add"
            size={24}
            color={tokens.navAccent}
            onPress={openAdd}
          />,
        ]}
      />
      <PageHeadingBlock
        heading="Inventory"
        eyebrow={`${filtered.length} items`}
        inlineBadge={
          lowStockCount > 0 ? (
            <View
              style={{
                backgroundColor: '#F59E0B20',
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 12,
              }}>
              <Text style={{color: '#F59E0B', fontSize: 10, fontWeight: '600'}}>
                {lowStockCount} low
              </Text>
            </View>
          ) : null
        }
      />

      {/* Category filter */}
      <View style={{marginBottom: spacing.md}}>
        <QuickActionTileGrid
          tiles={categoryTiles}
          activeId={selectedCategory || ''}
          onSelect={setSelectedCategory}
        />
      </View>

      {/* Summary stats */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryItem, {backgroundColor: tokens.surface2}]}>
          <Text style={[styles.summaryValue, {color: tokens.text}]}>{products.filter(p => !p.archived_at).length}</Text>
          <Text style={[styles.summaryLabel, {color: tokens.text3}]}>Total</Text>
        </View>
        <View style={[styles.summaryItem, {backgroundColor: tokens.surface2}]}>
          <Text style={[styles.summaryValue, {color: tokens.text}]}>{lowStockCount}</Text>
          <Text style={[styles.summaryLabel, {color: tokens.text3}]}>Low stock</Text>
        </View>
        <View style={[styles.summaryItem, {backgroundColor: tokens.surface2}]}>
          <Text style={[styles.summaryValue, {color: tokens.text}]}>{categories.length}</Text>
          <Text style={[styles.summaryLabel, {color: tokens.text3}]}>Categories</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View
          style={[
            styles.searchBar,
            {backgroundColor: tokens.surface2, borderColor: tokens.border},
          ]}>
          <Search size={16} color={tokens.text3} strokeWidth={1.75} />
          <TextInput
            style={[styles.searchInput, {color: tokens.text}]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search inventory..."
            placeholderTextColor={tokens.text3}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <X size={16} color={tokens.text3} strokeWidth={2} />
            </TouchableOpacity>
          ) : null}
        </View>

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
        renderItem={({item}) => {
          const category = categories.find(c => c.id === item.category_id);
          const IconComp = category?.icon
            ? CATEGORY_ICON_MAP[category.icon.toLowerCase()]
            : Package;
          const isLowStock =
            item.track_stock && item.qty <= item.low_stock_threshold;
          const isOut = item.track_stock && item.qty <= 0;
          return (
            <View style={{paddingHorizontal: 16}}>
              <ListRow
                title={item.name}
                subtitle={`${item.sku} · ${getCategoryName(
                  item.category_id,
                )} · ${
                  item.track_stock
                    ? isOut
                      ? 'OUT OF STOCK'
                      : isLowStock
                      ? `LOW (${item.qty})`
                      : `${item.qty} in stock`
                    : '∞'
                }`}
                value={
                  shop ? formatPrice(item.price, shop) : `\u20B9${item.price}`
                }
                icon={
                  IconComp ? (
                    <IconComp
                      size={22}
                      color={category?.color ?? tokens.text3}
                      strokeWidth={1.75}
                    />
                  ) : (
                    <Package
                      size={22}
                      color={tokens.text3}
                      strokeWidth={1.75}
                    />
                  )
                }
                iconBgColor={
                  category?.color ? category.color + '20' : tokens.surface2
                }
                onPress={() => openEdit(item)}
                style={{marginHorizontal: spacing.xl}}
              />
            </View>
          );
        }}
        keyExtractor={item => item.id}
        refreshing={refreshing}
        onRefresh={() => {
          setRefreshing(true);
          loadInventory();
        }}
        contentContainerStyle={{paddingBottom: insets.bottom + 20}}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Package size={40} color={tokens.text3} strokeWidth={1.25} />
            <Text
              style={[styles.emptyText, {color: tokens.text3, marginTop: 12}]}>
              No products found
            </Text>
            <TouchableOpacity
              style={[styles.emptyCta, {backgroundColor: tokens.navAccent}]}
              onPress={openAdd}>
              <Text style={styles.emptyCtaText}>Add first product</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ── Add / Edit Modal ───────────────────────────────── */}
      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setFormVisible(false)}>
        <KeyboardAvoidingView
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.modal, {backgroundColor: tokens.bg}]}>
            {/* Modal header */}
            <View
              style={[styles.modalHeader, {borderBottomColor: tokens.border}]}>
              <TouchableOpacity onPress={() => setFormVisible(false)}>
                <X size={22} color={tokens.text} strokeWidth={2} />
              </TouchableOpacity>
              <Text
                style={[
                  typeScale.title,
                  {
                    color: tokens.text,
                    flex: 1,
                    textAlign: 'center',
                    marginHorizontal: 12,
                  },
                ]}>
                {editId ? 'Edit Product' : 'Add Product'}
              </Text>
              <TouchableOpacity onPress={handleSave} disabled={saving}>
                <Text
                  style={[
                    typeScale.body,
                    {
                      color: tokens.navAccent,
                      fontWeight: '700',
                      opacity: saving ? 0.5 : 1,
                    },
                  ]}>
                  {saving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled">
              {/* Name */}
              <FieldLabel text="Product name" required />
              <TextInput
                style={[
                  styles.input,
                  {
                    color: tokens.text,
                    borderColor: tokens.border,
                    backgroundColor: tokens.surface,
                  },
                ]}
                value={form.name}
                onChangeText={v => setField('name', v)}
                placeholder="e.g. Rice 5kg"
                placeholderTextColor={tokens.text3}
              />

              {/* SKU + Unit */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <FieldLabel text="SKU" required />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: tokens.text,
                        borderColor: tokens.border,
                        backgroundColor: tokens.surface,
                      },
                    ]}
                    value={form.sku}
                    onChangeText={v => setField('sku', v)}
                    placeholder="e.g. RIC-5KG"
                    placeholderTextColor={tokens.text3}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={styles.col}>
                  <FieldLabel text="Unit" />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipRow}>
                      {UNITS.map(u => (
                        <TouchableOpacity
                          key={u}
                          style={[
                            styles.unitChip,
                            {
                              backgroundColor:
                                form.unit === u
                                  ? tokens.navAccent
                                  : tokens.surface2,
                            },
                          ]}
                          onPress={() => setField('unit', u)}>
                          <Text
                            style={{
                              color: form.unit === u ? '#fff' : tokens.text2,
                              ...typeScale.caption,
                              fontWeight: '600',
                            }}>
                            {u}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              {/* Price + Cost */}
              <View style={styles.row}>
                <View style={styles.col}>
                  <FieldLabel text="Selling price" required />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: tokens.text,
                        borderColor: tokens.border,
                        backgroundColor: tokens.surface,
                      },
                    ]}
                    value={form.price}
                    onChangeText={v => setField('price', v)}
                    placeholder="0.00"
                    placeholderTextColor={tokens.text3}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.col}>
                  <FieldLabel text="Cost price" />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: tokens.text,
                        borderColor: tokens.border,
                        backgroundColor: tokens.surface,
                      },
                    ]}
                    value={form.cost_price}
                    onChangeText={v => setField('cost_price', v)}
                    placeholder="0.00"
                    placeholderTextColor={tokens.text3}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Stock qty */}
              <FieldLabel text="Quantity in stock" />
              <TextInput
                style={[
                  styles.input,
                  {
                    color: tokens.text,
                    borderColor: tokens.border,
                    backgroundColor: tokens.surface,
                  },
                ]}
                value={form.qty}
                onChangeText={v => setField('qty', v)}
                placeholder="0"
                placeholderTextColor={tokens.text3}
                keyboardType="number-pad"
              />

              {/* Track stock toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabel}>
                  <Text style={[typeScale.body, {color: tokens.text}]}>
                    Low-stock alerts
                  </Text>
                  <Text style={[typeScale.tiny, {color: tokens.text3}]}>
                    Warn when quantity drops below threshold
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: form.track_stock
                        ? tokens.navAccent
                        : tokens.surface2,
                    },
                  ]}
                  onPress={() => {
                    setField('track_stock', !form.track_stock);
                    if (!form.track_stock) {
                      // turning on — set default threshold if empty
                      if (!form.low_stock_threshold) {
                        setField('low_stock_threshold', '5');
                      }
                    } else {
                      setField('low_stock_threshold', '');
                    }
                  }}>
                  <View
                    style={[
                      styles.toggleKnob,
                      {transform: [{translateX: form.track_stock ? 20 : 0}]},
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {form.track_stock && (
                <>
                  <FieldLabel text="Low-stock alert at" />
                  <TextInput
                    style={[
                      styles.input,
                      {
                        color: tokens.text,
                        borderColor: tokens.border,
                        backgroundColor: tokens.surface,
                      },
                    ]}
                    value={form.low_stock_threshold}
                    onChangeText={v => setField('low_stock_threshold', v)}
                    placeholder="e.g. 5"
                    placeholderTextColor={tokens.text3}
                    keyboardType="number-pad"
                  />
                </>
              )}

              {/* Track barcode toggle */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleLabel}>
                  <Text style={[typeScale.body, {color: tokens.text}]}>
                    Barcode tracking
                  </Text>
                  <Text style={[typeScale.tiny, {color: tokens.text3}]}>
                    Track a barcode for this product
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: form.track_barcode
                        ? tokens.navAccent
                        : tokens.surface2,
                    },
                  ]}
                  onPress={() => {
                    setField('track_barcode', !form.track_barcode);
                    if (form.track_barcode) {
                      setField('barcode', '');
                    }
                  }}>
                  <View
                    style={[
                      styles.toggleKnob,
                      {transform: [{translateX: form.track_barcode ? 20 : 0}]},
                    ]}
                  />
                </TouchableOpacity>
              </View>

              {form.track_barcode && (
                <>
                  <FieldLabel text="Barcode" />
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}>
                    <TextInput
                      style={[
                        styles.input,
                        styles.mono,
                        {
                          flex: 1,
                          color: tokens.text,
                          borderColor: tokens.border,
                          backgroundColor: tokens.surface,
                        },
                      ]}
                      value={form.barcode}
                      onChangeText={v => setField('barcode', v)}
                      placeholder="Scan or type barcode"
                      placeholderTextColor={tokens.text3}
                    />
                    <TouchableOpacity
                      onPress={() => setScannerVisible(true)}
                      style={[
                        styles.scanBtn,
                        {
                          backgroundColor: tokens.surface2,
                          borderColor: tokens.border,
                        },
                      ]}
                      activeOpacity={0.7}>
                      <ScanLine
                        size={20}
                        color={tokens.navAccent}
                        strokeWidth={2}
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Category */}
              <FieldLabel text="Category" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.chipRow}>
                  <TouchableOpacity
                    style={[
                      styles.unitChip,
                      {
                        backgroundColor: !form.category_id
                          ? tokens.navAccent
                          : tokens.surface2,
                      },
                    ]}
                    onPress={() => setField('category_id', '')}>
                    <Text
                      style={{
                        color: !form.category_id ? '#fff' : tokens.text2,
                        ...typeScale.caption,
                        fontWeight: '600',
                      }}>
                      None
                    </Text>
                  </TouchableOpacity>
                  {categories.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.unitChip,
                        {
                          backgroundColor:
                            form.category_id === c.id
                              ? c.color ?? tokens.navAccent
                              : tokens.surface2,
                        },
                      ]}
                      onPress={() => setField('category_id', c.id)}>
                      <Text
                        style={{
                          color:
                            form.category_id === c.id ? '#fff' : tokens.text2,
                          ...typeScale.caption,
                          fontWeight: '600',
                        }}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Description */}
              <FieldLabel text="Description" />
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    color: tokens.text,
                    borderColor: tokens.border,
                    backgroundColor: tokens.surface,
                  },
                ]}
                value={form.description}
                onChangeText={v => setField('description', v)}
                placeholder="Optional notes"
                placeholderTextColor={tokens.text3}
                multiline
                numberOfLines={3}
              />
              {editId && (
                <TouchableOpacity
                  onPress={() => {
                    setFormVisible(false);
                    const prod = products.find(p => p.id === editId);
                    if (prod) {
                      confirmArchive(prod);
                    }
                  }}
                  style={{
                    marginTop: spacing.xl,
                    padding: spacing.md,
                    backgroundColor: '#FEE2E220',
                    borderRadius: 12,
                    alignItems: 'center',
                  }}>
                  <Text style={{color: '#EF4444', fontWeight: '600'}}>
                    Archive Product
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Archive Confirmation Modal ─────────────────────── */}
      <Modal
        visible={deleteConfirm.visible}
        transparent
        animationType="fade"
        onRequestClose={() =>
          setDeleteConfirm({visible: false, product: null})
        }>
        <View style={styles.overlay}>
          <View
            style={[
              styles.confirmCard,
              {backgroundColor: tokens.surface, borderColor: tokens.border},
            ]}>
            <Text style={[typeScale.title, {color: tokens.text}]}>
              Archive product?
            </Text>
            <Text style={[typeScale.body, {color: tokens.text2, marginTop: 8}]}>
              {deleteConfirm.product?.name} will be archived. Sales history is
              preserved but it won't appear in POS.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={[styles.cancelBtn, {borderColor: tokens.border}]}
                onPress={() =>
                  setDeleteConfirm({visible: false, product: null})
                }>
                <Text style={[typeScale.body, {color: tokens.text2}]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteBtn]}
                onPress={handleArchive}
                disabled={deleting}>
                <Text
                  style={[typeScale.body, {color: '#fff', fontWeight: '600'}]}>
                  {deleting ? 'Archiving...' : 'Archive'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Barcode Scanner */}
      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onResult={code => setField('barcode', code)}
      />
    </View>
  );
}

// ── Small helper component ────────────────────────────────────

function FieldLabel({text, required}: {text: string; required?: boolean}) {
  return (
    <Text style={styles.fieldLabel}>
      {text}
      {required ? <Text style={{color: '#EF4444'}}> *</Text> : null}
    </Text>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  header: {paddingHorizontal: spacing.xl, marginBottom: spacing.sm},
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerRight: {flexDirection: 'row', alignItems: 'center'},
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchRow: {paddingHorizontal: spacing.xl, marginBottom: spacing.sm},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
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
    paddingVertical: 8,
    borderRadius: radii.md,
    marginLeft: spacing.sm,
    height: 48,
    justifyContent: 'center',
  },
  sortBtnText: {...typeScale.caption, fontWeight: '600'},
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
  },
  summaryValue: {...typeScale.heading, fontWeight: '700'},
  summaryLabel: {...typeScale.tiny, marginTop: 2},
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
  rowActions: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 6,
  },
  actionBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {...typeScale.body},
  emptyCta: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyCtaText: {color: '#fff', ...typeScale.body, fontWeight: '600'},

  // Modal
  modal: {flex: 1},
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
  },
  modalScroll: {flex: 1},
  modalContent: {
    padding: spacing.xl,
    paddingBottom: 40,
  },
  fieldLabel: {
    ...typeScale.caption,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 6,
    marginTop: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...typeScale.body,
  },
  mono: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {flexDirection: 'row', gap: 12},
  col: {flex: 1},
  chipRow: {flexDirection: 'row', gap: 6, paddingVertical: 4},
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 8,
  },
  toggleLabel: {flex: 1, marginRight: 12},
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
  },

  // Confirm dialog
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  deleteBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EF4444',
  },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});
