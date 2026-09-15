/**
 * DashboardScreen — rich dashboard with stats, quick actions, and insights.
 *
 * Data is fetched from the API on mount and synced to SQLite for offline use.
 */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTheme} from '../components/ThemeProvider';
import {useAuth} from '../components/AuthProvider';
import {
  fetchProducts,
  fetchSales,
  fetchCustomers,
  fetchAnalytics,
  type Product,
  type Sale,
  type Customer,
  type DailySummary,
} from '../lib/api';
import {isOnline, syncProductsDown, syncCustomersDown} from '../lib/sync';
import {formatPrice} from '../lib/format';
import {
  HeroStatCard,
  SectionHeader,
  PageHeadingBlock,
  Card,
} from '../components/ui';
import {spacing, typeScale, radii} from '../theme';
import {
  ShoppingCart,
  Package,
  IndianRupee,
  Users,
  LayoutGrid,
  TrendingUp,
  BarChart3,
  History,
  Calculator,
  Grid3X3,
} from 'lucide-react-native';

export function DashboardScreen() {
  const {tokens} = useTheme();
  const {user, shop} = useAuth();
  const navigation = useNavigation<any>();

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [_analytics, setAnalytics] = useState<DailySummary[]>([]);
  const [_loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!shop) {
      setLoading(false);
      return;
    }
    try {
      const online = await isOnline();
      if (online) {
        await Promise.all([
          syncProductsDown(shop.id),
          syncCustomersDown(shop.id),
        ]);
      }
      const [p, s, c, a] = await Promise.all([
        fetchProducts().catch(() => []),
        fetchSales().catch(() => []),
        fetchCustomers().catch(() => []),
        fetchAnalytics().catch(() => []),
      ]);
      setProducts(p);
      setSales(s);
      setCustomers(c);
      setAnalytics(a);
    } catch (err) {
      console.error('[Dashboard] load failed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shop]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySales = sales
    .filter(s => s.created_at?.startsWith(todayStr))
    .reduce((sum, s) => sum + (s.total ?? 0), 0);
  const todayTxns = sales.filter(s =>
    s.created_at?.startsWith(todayStr),
  ).length;

  const stats = [
    {
      label: "Today's sales",
      value: todaySales,
      prefix: '₹',
      tone: 'teal' as const,
      icon: <IndianRupee size={20} color="#115E59" strokeWidth={2} />,
    },
    {
      label: 'Transactions today',
      value: todayTxns,
      tone: 'blue' as const,
      icon: <ShoppingCart size={20} color="#1E40AF" strokeWidth={2} />,
    },
    {
      label: 'Products',
      value: products.length,
      tone: 'violet' as const,
      icon: <Package size={20} color="#5B21B6" strokeWidth={2} />,
    },
    {
      label: 'Customers',
      value: customers.length,
      tone: 'gold' as const,
      icon: <Users size={20} color="#92400E" strokeWidth={2} />,
    },
  ];

  // Quick actions
  const quickActions = [
    {
      id: 'pos',
      label: 'POS',
      icon: ShoppingCart,
      color: '#14B8A6',
      onPress: () => navigation.navigate('POS'),
    },
    {
      id: 'inventory',
      label: 'Inventory',
      icon: Grid3X3,
      color: '#8B5CF6',
      onPress: () => navigation.navigate('Inventory'),
    },
    {
      id: 'history',
      label: 'History',
      icon: History,
      color: '#F59E0B',
      onPress: () => navigation.navigate('History'),
    },
    {
      id: 'cash',
      label: 'Cash',
      icon: Calculator,
      color: '#EF4444',
      onPress: () => navigation.navigate('CashRegister'),
    },
  ];

  // Greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.email?.split('@')[0] ?? 'there';

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: tokens.bg}}
      contentContainerStyle={{
        paddingTop: spacing.xxl + spacing.lg,
        paddingBottom: spacing.xxxl,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={tokens.navAccent}
        />
      }>
      {/* ── Header ─────────────────────────────────────── */}
      <PageHeadingBlock
        heading={`${greeting}, ${firstName}`}
        eyebrow={shop?.name ?? ''}
      />

      {/* ── Hero Stat Cards ────────────────────────────── */}
      <View style={{paddingHorizontal: spacing.xl}}>
        <SectionHeader
          title="Overview"
          icon={<BarChart3 size={16} color={tokens.text3} strokeWidth={2} />}
        />
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.md,
          }}>
          {stats.map(stat => (
            <HeroStatCard key={stat.label} {...stat} style={{width: '47.5%'}} />
          ))}
        </View>
      </View>

      {/* ── Quick Actions ──────────────────────────────── */}
      <View style={{marginTop: spacing.xxl, paddingHorizontal: spacing.xl}}>
        <SectionHeader
          title="Quick actions"
          icon={<LayoutGrid size={16} color={tokens.text3} strokeWidth={2} />}
        />
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.md,
          }}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.id}
              activeOpacity={0.7}
              onPress={action.onPress}
              style={{flex: 1}}>
              <Card
                variant="outlined"
                style={{
                  alignItems: 'center',
                  padding: spacing.lg,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: radii.md,
                    backgroundColor: action.color + '12',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: spacing.sm,
                  }}>
                  <action.icon
                    size={22}
                    color={action.color}
                    strokeWidth={1.75}
                  />
                </View>
                <Text style={[typeScale.caption, {color: tokens.text}]}>
                  {action.label}
                </Text>
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Recent Sales ───────────────────────────────── */}
      {sales.length > 0 && (
        <View style={{marginTop: spacing.xxl, paddingHorizontal: spacing.xl}}>
          <SectionHeader
            title="Recent sales"
            icon={<TrendingUp size={16} color={tokens.text3} strokeWidth={2} />}
            actionLabel="View all"
            onAction={() => navigation.navigate('History')}
          />
          {sales.slice(0, 5).map((sale, i) => (
            <Card
              key={sale.id}
              variant="outlined"
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: spacing.md,
                borderRadius: radii.lg,
                borderWidth: 1,
                marginBottom: spacing.sm,
              }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radii.sm,
                  backgroundColor: tokens.navAccent + '12',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: spacing.md,
                }}>
                <ShoppingCart
                  size={16}
                  color={tokens.navAccent}
                  strokeWidth={1.75}
                />
              </View>
              <View style={{flex: 1}}>
                <Text
                  style={[typeScale.title, {color: tokens.text}]}
                  numberOfLines={1}>
                  {sale.sale_ref ?? `Sale #${i + 1}`}
                </Text>
                <Text style={[typeScale.caption, {color: tokens.text3}]}>
                  {sale.sale_ref}
                </Text>
              </View>
              <Text style={[typeScale.title, {color: tokens.text}]}>
                {shop ? formatPrice(sale.total, shop) : `₹${sale.total}`}
              </Text>
            </Card>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
