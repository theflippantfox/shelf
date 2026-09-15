/**
 * ProductDetailScreen — view and edit product details.
 */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useTheme} from '../components/ThemeProvider';
import {useAuth} from '../components/AuthProvider';
import {fetchProducts, type Product} from '../lib/api';
import {formatPrice} from '../lib/format';
import {Badge, Card, Button, SectionHeader} from '../components/ui';
import {spacing, radii, typeScale} from '../theme';
import {
  ArrowLeft,
  Package,
  Barcode,
  Hash,
  Tag,
  Boxes,
  AlertCircle,
  Edit,
} from 'lucide-react-native';

export function ProductDetailScreen() {
  const {tokens} = useTheme();
  const {shop} = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const {id} = route.params as {id: string};

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const products = await fetchProducts();
        const found = products.find(p => p.id === id);
        setProduct(found || null);
      } catch (err) {
        console.error('Failed to load product:', err);
        Alert.alert('Error', 'Failed to load product details');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.bg,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
        <ActivityIndicator size="large" color={tokens.navAccent} />
      </View>
    );
  }

  if (!product) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: tokens.bg,
          justifyContent: 'center',
          alignItems: 'center',
          padding: spacing.xl,
        }}>
        <Package size={48} color={tokens.text3} strokeWidth={1.5} />
        <Text
          style={[
            typeScale.heading,
            {color: tokens.text, marginTop: spacing.md},
          ]}>
          Product not found
        </Text>
        <Button
          label="Go Back"
          onPress={() => navigation.goBack()}
          variant="secondary"
          style={{marginTop: spacing.lg}}
        />
      </View>
    );
  }

  const categoryName =
    typeof product.category === 'object'
      ? product.category?.name
      : product.category;

  const getStockBadge = () => {
    if (product.track_stock === false) {
      return {label: 'Always available', variant: 'success' as const};
    }
    if (product.qty === 0) {
      return {label: 'Out of stock', variant: 'danger' as const};
    }
    if (
      product.low_stock_threshold != null &&
      product.qty <= product.low_stock_threshold
    ) {
      return {
        label: `Low stock — ${product.qty} left`,
        variant: 'warning' as const,
      };
    }
    return {label: `${product.qty} in stock`, variant: 'success' as const};
  };

  const stockBadge = getStockBadge();

  return (
    <View style={{flex: 1, backgroundColor: tokens.bg}}>
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{
          paddingTop: spacing.xxl + spacing.lg,
          paddingBottom: spacing.xxxl,
        }}>
        {/* Header with back button */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.xl,
            marginBottom: spacing.lg,
          }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: tokens.surface,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: spacing.md,
            }}>
            <ArrowLeft size={20} color={tokens.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={[typeScale.heading, {color: tokens.text, flex: 1}]}>
            Product Details
          </Text>
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Coming Soon', 'Product editing coming soon!');
            }}
            style={{
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radii.lg,
              backgroundColor: tokens.navAccent,
            }}>
            <Edit size={18} color="#fff" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Product Image/Icon */}
        <View style={{paddingHorizontal: spacing.xl, marginBottom: spacing.lg}}>
          <View
            style={{
              width: '100%',
              height: 200,
              borderRadius: radii.xl,
              backgroundColor: tokens.surface2,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            <Package size={64} color={tokens.text3} strokeWidth={1.5} />
          </View>
        </View>

        {/* Product Name & Badge */}
        <View style={{paddingHorizontal: spacing.xl, marginBottom: spacing.xl}}>
          <Text
            style={[
              typeScale.display,
              {color: tokens.text, fontWeight: '700', marginBottom: spacing.sm},
            ]}>
            {product.name}
          </Text>
          <Badge label={stockBadge.label} variant={stockBadge.variant} />
        </View>

        {/* Price */}
        <View style={{paddingHorizontal: spacing.xl, marginBottom: spacing.xl}}>
          <Card
            variant="default"
            style={{padding: spacing.lg, backgroundColor: tokens.surface}}>
            <Text style={[typeScale.caption, {color: tokens.text3}]}>
              PRICE
            </Text>
            <Text
              style={[
                typeScale.display,
                {color: tokens.navAccent, fontWeight: '800', marginTop: 4},
              ]}>
              {shop ? formatPrice(product.price, shop) : `₹${product.price}`}
            </Text>
          </Card>
        </View>

        {/* Details Section */}
        <View style={{paddingHorizontal: spacing.xl}}>
          <SectionHeader
            title="Details"
            icon={<Package size={16} color={tokens.text3} strokeWidth={2} />}
          />

          {/* SKU */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: tokens.border,
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radii.sm,
                backgroundColor: tokens.surface2,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.md,
              }}>
              <Hash size={18} color={tokens.text2} strokeWidth={2} />
            </View>
            <View style={{flex: 1}}>
              <Text style={[typeScale.caption, {color: tokens.text3}]}>
                SKU
              </Text>
              <Text
                style={[
                  typeScale.body,
                  {
                    color: tokens.text,
                    fontWeight: '600',
                    fontFamily: 'monospace',
                  },
                ]}>
                {product.sku}
              </Text>
            </View>
          </View>

          {/* Barcode */}
          {product.barcode && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: tokens.border,
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radii.sm,
                  backgroundColor: tokens.surface2,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: spacing.md,
                }}>
                <Barcode size={18} color={tokens.text2} strokeWidth={2} />
              </View>
              <View style={{flex: 1}}>
                <Text style={[typeScale.caption, {color: tokens.text3}]}>
                  Barcode
                </Text>
                <Text
                  style={[
                    typeScale.body,
                    {
                      color: tokens.text,
                      fontWeight: '600',
                      fontFamily: 'monospace',
                    },
                  ]}>
                  {product.barcode}
                </Text>
              </View>
            </View>
          )}

          {/* Category */}
          {categoryName && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: tokens.border,
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radii.sm,
                  backgroundColor: tokens.surface2,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: spacing.md,
                }}>
                <Tag size={18} color={tokens.text2} strokeWidth={2} />
              </View>
              <View style={{flex: 1}}>
                <Text style={[typeScale.caption, {color: tokens.text3}]}>
                  Category
                </Text>
                <Text
                  style={[
                    typeScale.body,
                    {color: tokens.text, fontWeight: '600'},
                  ]}>
                  {categoryName}
                </Text>
              </View>
            </View>
          )}

          {/* Stock */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: tokens.border,
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radii.sm,
                backgroundColor: tokens.surface2,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: spacing.md,
              }}>
              <Boxes size={18} color={tokens.text2} strokeWidth={2} />
            </View>
            <View style={{flex: 1}}>
              <Text style={[typeScale.caption, {color: tokens.text3}]}>
                Quantity
              </Text>
              <Text
                style={[
                  typeScale.body,
                  {color: tokens.text, fontWeight: '600'},
                ]}>
                {product.track_stock === false
                  ? 'Not tracked'
                  : `${product.qty} units`}
              </Text>
            </View>
          </View>

          {/* Low Stock Threshold */}
          {product.track_stock !== false &&
            product.low_stock_threshold != null && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: spacing.md,
                }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radii.sm,
                    backgroundColor: tokens.surface2,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: spacing.md,
                  }}>
                  <AlertCircle size={18} color={tokens.text2} strokeWidth={2} />
                </View>
                <View style={{flex: 1}}>
                  <Text style={[typeScale.caption, {color: tokens.text3}]}>
                    Low Stock Alert
                  </Text>
                  <Text
                    style={[
                      typeScale.body,
                      {color: tokens.text, fontWeight: '600'},
                    ]}>
                    {product.low_stock_threshold} units
                  </Text>
                </View>
              </View>
            )}
        </View>

        {/* Description */}
        {product.description && (
          <View style={{paddingHorizontal: spacing.xl, marginTop: spacing.xl}}>
            <SectionHeader title="Description" />
            <Text
              style={[typeScale.body, {color: tokens.text2, lineHeight: 22}]}>
              {product.description}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
