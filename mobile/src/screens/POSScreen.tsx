/**
 * POSScreen — the core money-making screen.
 *
 * Layout:
 *   Top: Search bar + category chips
 *   Middle: Product grid (2 columns)
 *   Bottom: Cart bar (tap to expand) → full cart + checkout
 */
import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../components/ThemeProvider';
import {useAuth} from '../components/AuthProvider';
import {BarcodeScannerModal} from '../components/BarcodeScannerModal';
import {
  fetchProducts,
  fetchCategories,
  fetchProductByBarcode,
  createSale,
  type Product,
  type Category,
  type SaleItem,
} from '../lib/api';
import {
  formatPrice,
  calculateTax,
  calculateDiscount,
  taxLabel,
} from '../lib/format';
import {spacing, radii, typeScale} from '../theme';
import {
  Package,
  Search,
  Banknote,
  CreditCard,
  Smartphone,
  FileText,
  ScanLine,
} from 'lucide-react-native';

// ── Cart types ────────────────────────────────────────────────────────────

interface CartItem {
  product: Product;
  qty: number;
}

// ── Main component ────────────────────────────────────────────────────────

export function POSScreen() {
  const {tokens} = useTheme();
  const {shop} = useAuth();
  const insets = useSafeAreaInsets();

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);

  // Checkout
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);

  // Scanner
  const [scannerVisible, setScannerVisible] = useState(false);

  // Discount
  const [discountType, setDiscountType] = useState<string>('none');
  const [discountValue, setDiscountValue] = useState(0);

  // ── Load data ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!shop) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [prods, cats] = await Promise.all([
          fetchProducts({limit: 200}),
          fetchCategories(),
        ]);
        setProducts(prods.filter(p => !p.archived_at));
        setCategories(cats.filter(c => !c.archived_at));
      } catch (err) {
        console.error('[POS] Failed to load:', err);
        Alert.alert(
          'Error',
          err instanceof Error ? err.message : 'Failed to load products',
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [shop]);

  // ── Filtered products ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = products;
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
    return list;
  }, [products, selectedCategory, search]);

  // ── Cart helpers ──────────────────────────────────────────────────────

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        // Check stock
        if (product.track_stock && existing.qty >= product.qty) {
          Alert.alert('Out of stock', `${product.name} has no stock left`);
          return prev;
        }
        return prev.map(c =>
          c.product.id === product.id ? {...c, qty: c.qty + 1} : c,
        );
      }
      // New item
      if (product.track_stock && product.qty <= 0) {
        Alert.alert('Out of stock', `${product.name} is out of stock`);
        return prev;
      }
      return [...prev, {product, qty: 1}];
    });
  }, []);

  const updateCartQty = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(prev => prev.filter(c => c.product.id !== productId));
    } else {
      setCart(prev =>
        prev.map(c => {
          if (c.product.id !== productId) {
            return c;
          }
          // Check stock
          if (c.product.track_stock && qty > c.product.qty) {
            Alert.alert('Stock limit', `Only ${c.product.qty} in stock`);
            return c;
          }
          return {...c, qty};
        }),
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setDiscountType('none');
    setDiscountValue(0);
  }, []);

  // ── Totals ────────────────────────────────────────────────────────────

  const subtotal = useMemo(
    () => cart.reduce((sum, c) => sum + c.product.price * c.qty, 0),
    [cart],
  );

  const discountAmount = useMemo(
    () => (shop ? calculateDiscount(subtotal, discountType, discountValue) : 0),
    [subtotal, discountType, discountValue, shop],
  );

  const taxableAmount = subtotal - discountAmount;

  const tax = useMemo(
    () => (shop ? calculateTax(taxableAmount, shop) : 0),
    [taxableAmount, shop],
  );

  const total = taxableAmount + tax;

  const cartCount = useMemo(
    () => cart.reduce((sum, c) => sum + c.qty, 0),
    [cart],
  );

  // ── Checkout ──────────────────────────────────────────────────────────

  const handleCheckout = async () => {
    if (cart.length === 0) {
      return;
    }
    if (!shop) {
      return;
    }

    setSubmitting(true);
    try {
      const items: SaleItem[] = cart.map(c => ({
        productId: c.product.id,
        name: c.product.name,
        sku: c.product.sku,
        qty: c.qty,
        unitPrice: c.product.price,
      }));

      await createSale({
        items,
        subtotal,
        tax_amount: tax,
        total,
        discount_type: discountType === 'none' ? 'fixed' : discountType,
        discount_value: discountValue,
        discount_amount: discountAmount,
        payment_method: paymentMethod,
      });

      Alert.alert('Sale Complete', `Total: ${formatPrice(total, shop)}`, [
        {
          text: 'OK',
          onPress: () => {
            clearCart();
            setCheckoutVisible(false);
          },
        },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to process sale');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Barcode scan handler ───────────────────────────────────────────

  const handleScanResult = useCallback(
    async (code: string) => {
      // Check local inventory first
      const local = products.find(p => p.barcode === code);
      if (local) {
        if (local.track_stock && local.qty <= 0) {
          Alert.alert('Out of stock', `${local.name} is out of stock`);
          return;
        }
        addToCart(local);
        return;
      }
      // Try API lookup
      try {
        const product = await fetchProductByBarcode(code);
        addToCart(product);
      } catch {
        Alert.alert('Not found', `No product for barcode: ${code}`);
      }
    },
    [products, addToCart],
  );

  // ── Render product card ───────────────────────────────────────────────

  const renderProduct = ({item}: {item: Product}) => {
    const inCart = cart.find(c => c.product.id === item.id);
    const outOfStock = item.track_stock && item.qty <= 0;

    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          {
            backgroundColor: tokens.surface,
            borderColor: inCart ? tokens.navAccent : tokens.border,
            opacity: outOfStock ? 0.5 : 1,
          },
        ]}
        onPress={() => addToCart(item)}
        disabled={outOfStock}
        activeOpacity={0.7}>
        {/* Image placeholder */}
        <View style={[styles.productImage, {backgroundColor: tokens.surface2}]}>
          <Package size={28} color={tokens.text3} strokeWidth={1.5} />
        </View>

        <Text
          style={[styles.productName, {color: tokens.text}]}
          numberOfLines={2}>
          {item.name}
        </Text>

        <Text style={[styles.productSku, {color: tokens.text3}]}>
          {item.sku}
        </Text>

        <View style={styles.productFooter}>
          <Text style={[styles.productPrice, {color: tokens.navAccent}]}>
            {shop ? formatPrice(item.price, shop) : `₹${item.price}`}
          </Text>
          {item.track_stock && (
            <Text style={[styles.productStock, {color: tokens.text3}]}>
              {item.qty} left
            </Text>
          )}
        </View>

        {inCart && (
          <View style={[styles.cartBadge, {backgroundColor: tokens.navAccent}]}>
            <Text style={styles.cartBadgeText}>{inCart.qty}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loadingContainer, {backgroundColor: tokens.bg}]}>
        <ActivityIndicator size="large" color={tokens.navAccent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: tokens.bg}]}>
      {/* Search + Categories */}
      <View style={[styles.topBar, {paddingTop: insets.top + spacing.sm}]}>
        <View
          style={[
            styles.searchBar,
            {backgroundColor: tokens.surface2, borderColor: tokens.border},
          ]}>
          <Search size={18} color={tokens.text3} strokeWidth={2} />
          <TextInput
            style={[styles.searchInput, {color: tokens.text}]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search products..."
            placeholderTextColor={tokens.text3}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={[styles.clearBtn, {color: tokens.text3}]}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={() => setScannerVisible(true)}
          style={[
            styles.scanBtn,
            {backgroundColor: tokens.surface2, borderColor: tokens.border},
          ]}
          activeOpacity={0.7}>
          <ScanLine size={20} color={tokens.navAccent} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Category chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}>
        <TouchableOpacity
          style={[
            styles.categoryChip,
            {
              backgroundColor: !selectedCategory
                ? tokens.navAccent
                : tokens.surface2,
              borderColor: tokens.border,
            },
          ]}
          onPress={() => setSelectedCategory(null)}>
          <Text
            style={[
              styles.categoryChipText,
              {color: !selectedCategory ? '#fff' : tokens.text2},
            ]}>
            All
          </Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.categoryChip,
              {
                backgroundColor:
                  selectedCategory === cat.id ? cat.color : tokens.surface2,
                borderColor: tokens.border,
              },
            ]}
            onPress={() =>
              setSelectedCategory(selectedCategory === cat.id ? null : cat.id)
            }>
            <Text
              style={[
                styles.categoryChipText,
                {
                  color: selectedCategory === cat.id ? '#fff' : tokens.text2,
                },
              ]}>
              {cat.icon} {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Product grid */}
      <FlatList
        data={filtered}
        renderItem={renderProduct}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRow}
        contentContainerStyle={[
          styles.productGrid,
          {paddingBottom: insets.bottom + 80},
        ]}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, {color: tokens.text3}]}>
              No products found
            </Text>
          </View>
        }
      />

      {/* Cart bar (fixed at bottom) */}
      {cartCount > 0 && (
        <TouchableOpacity
          style={[
            styles.cartBar,
            {
              backgroundColor: tokens.navAccent,
              bottom: insets.bottom + 16,
            },
          ]}
          onPress={() => setCartVisible(true)}
          activeOpacity={0.8}>
          <View style={styles.cartBarLeft}>
            <View style={styles.cartCountBadge}>
              <Text style={styles.cartCountText}>{cartCount}</Text>
            </View>
            <Text style={styles.cartBarLabel}>
              {cartCount === 1 ? '1 item' : `${cartCount} items`}
            </Text>
          </View>
          <Text style={styles.cartBarTotal}>
            {shop ? formatPrice(total, shop) : `₹${total}`}
          </Text>
          <Text style={styles.cartBarArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* ── Cart modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={cartVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCartVisible(false)}>
        <KeyboardAvoidingView
          style={{flex: 1}}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.cartContainer, {backgroundColor: tokens.bg}]}>
            {/* Cart header */}
            <View
              style={[styles.cartHeader, {borderBottomColor: tokens.border}]}>
              <TouchableOpacity onPress={() => setCartVisible(false)}>
                <Text style={[styles.cartCloseBtn, {color: tokens.navAccent}]}>
                  Done
                </Text>
              </TouchableOpacity>
              <Text style={[styles.cartTitle, {color: tokens.text}]}>
                Cart ({cartCount})
              </Text>
              <TouchableOpacity onPress={clearCart}>
                <Text style={[styles.cartClearBtn, {color: '#EF4444'}]}>
                  Clear
                </Text>
              </TouchableOpacity>
            </View>

            {/* Cart items */}
            <FlatList
              data={cart}
              keyExtractor={c => c.product.id}
              contentContainerStyle={styles.cartItems}
              ListEmptyComponent={
                <View style={styles.cartEmpty}>
                  <Text style={[styles.cartEmptyText, {color: tokens.text3}]}>
                    Cart is empty
                  </Text>
                </View>
              }
              renderItem={({item: c}) => (
                <View
                  style={[styles.cartItem, {borderBottomColor: tokens.border}]}>
                  <View style={styles.cartItemInfo}>
                    <Text
                      style={[styles.cartItemName, {color: tokens.text}]}
                      numberOfLines={1}>
                      {c.product.name}
                    </Text>
                    <Text style={[styles.cartItemSku, {color: tokens.text3}]}>
                      {c.product.sku}
                    </Text>
                  </View>

                  {/* Qty controls */}
                  <View style={styles.qtyControls}>
                    <TouchableOpacity
                      style={[
                        styles.qtyBtn,
                        {
                          backgroundColor: tokens.surface2,
                          borderColor: tokens.border,
                        },
                      ]}
                      onPress={() => updateCartQty(c.product.id, c.qty - 1)}>
                      <Text style={[styles.qtyBtnText, {color: tokens.text}]}>
                        −
                      </Text>
                    </TouchableOpacity>
                    <Text style={[styles.qtyValue, {color: tokens.text}]}>
                      {c.qty}
                    </Text>
                    <TouchableOpacity
                      style={[
                        styles.qtyBtn,
                        {
                          backgroundColor: tokens.surface2,
                          borderColor: tokens.border,
                        },
                      ]}
                      onPress={() => updateCartQty(c.product.id, c.qty + 1)}>
                      <Text style={[styles.qtyBtnText, {color: tokens.text}]}>
                        +
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text
                    style={[styles.cartItemTotal, {color: tokens.navAccent}]}>
                    {shop
                      ? formatPrice(c.product.price * c.qty, shop)
                      : `₹${c.product.price * c.qty}`}
                  </Text>
                </View>
              )}
            />

            {/* Discount row */}
            <View style={[styles.discountRow, {borderTopColor: tokens.border}]}>
              <Text style={[styles.discountLabel, {color: tokens.text2}]}>
                Discount
              </Text>
              <View style={styles.discountControls}>
                <TouchableOpacity
                  style={[
                    styles.discountTypeBtn,
                    {
                      backgroundColor:
                        discountType === 'none'
                          ? tokens.surface2
                          : tokens.navAccent,
                    },
                  ]}
                  onPress={() =>
                    setDiscountType(
                      discountType === 'none' ? 'percentage' : 'none',
                    )
                  }>
                  <Text
                    style={[
                      styles.discountTypeText,
                      {color: discountType === 'none' ? tokens.text2 : '#fff'},
                    ]}>
                    {discountType === 'none'
                      ? 'None'
                      : discountType === 'percentage'
                      ? '%'
                      : '₹'}
                  </Text>
                </TouchableOpacity>
                {discountType !== 'none' && (
                  <TextInput
                    style={[
                      styles.discountInput,
                      {color: tokens.text, borderColor: tokens.border},
                    ]}
                    value={discountValue ? String(discountValue) : ''}
                    onChangeText={t => setDiscountValue(Number(t) || 0)}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={tokens.text3}
                  />
                )}
              </View>
            </View>

            {/* Totals */}
            <View
              style={[styles.totalsSection, {borderTopColor: tokens.border}]}>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, {color: tokens.text2}]}>
                  Subtotal
                </Text>
                <Text style={[styles.totalValue, {color: tokens.text}]}>
                  {shop ? formatPrice(subtotal, shop) : `₹${subtotal}`}
                </Text>
              </View>
              {discountAmount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, {color: '#EF4444'}]}>
                    Discount
                  </Text>
                  <Text style={[styles.totalValue, {color: '#EF4444'}]}>
                    −
                    {shop
                      ? formatPrice(discountAmount, shop)
                      : `₹${discountAmount}`}
                  </Text>
                </View>
              )}
              {shop && shop.tax_rate > 0 && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, {color: tokens.text2}]}>
                    {taxLabel(shop)}
                  </Text>
                  <Text style={[styles.totalValue, {color: tokens.text}]}>
                    {formatPrice(tax, shop)}
                  </Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.totalRowFinal]}>
                <Text style={[styles.totalLabelFinal, {color: tokens.text}]}>
                  Total
                </Text>
                <Text
                  style={[styles.totalValueFinal, {color: tokens.navAccent}]}>
                  {shop ? formatPrice(total, shop) : `₹${total}`}
                </Text>
              </View>
            </View>

            {/* Checkout button */}
            <View
              style={[
                styles.checkoutSection,
                {paddingBottom: insets.bottom + 16},
              ]}>
              <TouchableOpacity
                style={[
                  styles.checkoutButton,
                  {backgroundColor: tokens.navAccent},
                ]}
                onPress={() => {
                  setCartVisible(false);
                  setCheckoutVisible(true);
                }}
                disabled={cart.length === 0}
                activeOpacity={0.8}>
                <Text style={styles.checkoutButtonText}>Checkout</Text>
                <Text style={styles.checkoutButtonTotal}>
                  {shop ? formatPrice(total, shop) : `₹${total}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Checkout modal ──────────────────────────────────────────────── */}
      <Modal
        visible={checkoutVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCheckoutVisible(false)}>
        <View style={[styles.checkoutContainer, {backgroundColor: tokens.bg}]}>
          <View
            style={[styles.checkoutHeader, {borderBottomColor: tokens.border}]}>
            <TouchableOpacity onPress={() => setCheckoutVisible(false)}>
              <Text style={[styles.cartCloseBtn, {color: tokens.navAccent}]}>
                Back
              </Text>
            </TouchableOpacity>
            <Text style={[styles.cartTitle, {color: tokens.text}]}>
              Payment
            </Text>
            <View style={{width: 50}} />
          </View>

          <View style={styles.checkoutBody}>
            {/* Total display */}
            <View
              style={[styles.totalDisplay, {backgroundColor: tokens.surface2}]}>
              <Text style={[styles.totalDisplayLabel, {color: tokens.text3}]}>
                Amount Due
              </Text>
              <Text
                style={[styles.totalDisplayValue, {color: tokens.navAccent}]}>
                {shop ? formatPrice(total, shop) : `₹${total}`}
              </Text>
            </View>

            {/* Payment method */}
            <Text style={[styles.sectionTitle, {color: tokens.text2}]}>
              Payment Method
            </Text>
            <View style={styles.paymentMethods}>
              {[
                {id: 'cash', label: 'Cash', Icon: Banknote},
                {id: 'card', label: 'Card', Icon: CreditCard},
                {id: 'upi', label: 'UPI', Icon: Smartphone},
                {id: 'credit', label: 'Credit', Icon: FileText},
              ].map(pm => (
                <TouchableOpacity
                  key={pm.id}
                  style={[
                    styles.paymentMethodBtn,
                    {
                      backgroundColor:
                        paymentMethod === pm.id
                          ? tokens.navAccent
                          : tokens.surface2,
                      borderColor: tokens.border,
                    },
                  ]}
                  onPress={() => setPaymentMethod(pm.id)}>
                  <pm.Icon
                    size={16}
                    color={paymentMethod === pm.id ? '#fff' : tokens.text}
                    strokeWidth={2}
                  />
                  <Text
                    style={[
                      styles.paymentMethodText,
                      {color: paymentMethod === pm.id ? '#fff' : tokens.text},
                    ]}>
                    {pm.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Confirm button */}
            <TouchableOpacity
              style={[
                styles.confirmButton,
                {backgroundColor: tokens.navAccent},
              ]}
              onPress={handleCheckout}
              disabled={submitting || cart.length === 0}
              activeOpacity={0.8}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmButtonText}>Confirm Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Barcode Scanner */}
      <BarcodeScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onResult={handleScanResult}
        stayOpen
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {flex: 1},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},

  // Top bar
  topBar: {paddingHorizontal: spacing.lg, paddingBottom: spacing.sm},
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {fontSize: 14, marginRight: 8},
  searchInput: {flex: 1, ...typeScale.body, paddingVertical: 0},
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
  },
  clearBtn: {fontSize: 16, paddingLeft: 8},

  // Categories
  categoryRow: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {...typeScale.caption, fontWeight: '600'},

  // Products
  productGrid: {paddingHorizontal: spacing.lg},
  productRow: {gap: spacing.sm, marginBottom: spacing.sm},
  productCard: {
    flex: 1,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    maxWidth: '48%',
  },
  productImage: {
    height: 80,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  productIcon: {fontSize: 28},
  productName: {...typeScale.title, marginBottom: 2},
  productSku: {...typeScale.tiny, marginBottom: spacing.xs},
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: {...typeScale.heading},
  productStock: {...typeScale.tiny},
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {color: '#fff', fontSize: 12, fontWeight: '700'},
  emptyContainer: {paddingVertical: 60, alignItems: 'center'},
  emptyText: {...typeScale.body},

  // Cart bar
  cartBar: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    borderRadius: radii.xl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 16,
  },
  cartBarLeft: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  cartCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cartCountText: {color: '#fff', fontSize: 12, fontWeight: '700'},
  cartBarLabel: {color: '#fff', ...typeScale.body, fontWeight: '600'},
  cartBarTotal: {color: '#fff', ...typeScale.heading, marginRight: 12},
  cartBarArrow: {color: '#fff', fontSize: 20},

  // Cart modal
  cartContainer: {flex: 1},
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  cartCloseBtn: {...typeScale.body, fontWeight: '600'},
  cartTitle: {...typeScale.heading},
  cartClearBtn: {...typeScale.body, fontWeight: '600'},
  cartItems: {paddingHorizontal: spacing.lg},
  cartEmpty: {paddingVertical: 60, alignItems: 'center'},
  cartEmptyText: {...typeScale.body},
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  cartItemInfo: {flex: 1},
  cartItemName: {...typeScale.title},
  cartItemSku: {...typeScale.tiny, marginTop: 2},

  // Qty controls
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  qtyBtnText: {fontSize: 18, fontWeight: '600'},
  qtyValue: {
    ...typeScale.title,
    marginHorizontal: spacing.sm,
    minWidth: 24,
    textAlign: 'center',
  },
  cartItemTotal: {...typeScale.title, marginLeft: spacing.sm},

  // Discount
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  discountLabel: {...typeScale.body},
  discountControls: {flexDirection: 'row', alignItems: 'center'},
  discountTypeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  discountTypeText: {...typeScale.caption, fontWeight: '600'},
  discountInput: {
    width: 60,
    ...typeScale.body,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'center',
  },

  // Totals
  totalsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  totalLabel: {...typeScale.body},
  totalValue: {...typeScale.body},
  totalRowFinal: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
  },
  totalLabelFinal: {...typeScale.heading},
  totalValueFinal: {...typeScale.heading},

  // Checkout
  checkoutSection: {paddingHorizontal: spacing.lg, paddingTop: spacing.md},
  checkoutButton: {
    borderRadius: radii.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: spacing.lg,
  },
  checkoutButtonText: {color: '#fff', ...typeScale.heading},
  checkoutButtonTotal: {color: '#fff', ...typeScale.heading},

  // Checkout modal
  checkoutContainer: {flex: 1},
  checkoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  checkoutBody: {flex: 1, padding: spacing.lg},
  totalDisplay: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  totalDisplayLabel: {...typeScale.caption, marginBottom: spacing.xs},
  totalDisplayValue: {fontSize: 36, fontWeight: '800'},
  sectionTitle: {...typeScale.tiny, marginBottom: spacing.md},
  paymentMethods: {flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm},
  paymentMethodBtn: {
    flex: 1,
    minWidth: '45%',
    borderRadius: radii.md,
    borderWidth: 1,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  paymentMethodText: {...typeScale.title, marginLeft: 4},
  confirmButton: {
    marginTop: 'auto',
    borderRadius: radii.lg,
    paddingVertical: 18,
    alignItems: 'center',
  },
  confirmButtonText: {color: '#fff', ...typeScale.heading},
});
