/**
 * DashboardScreen — KPIs and quick actions.
 * Fetches real analytics data from the web app's /api/analytics endpoint.
 */
import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../components/ThemeProvider';
import {useAuth} from '../components/AuthProvider';
import {
  DollarSign,
  Receipt,
  BarChart3,
  Landmark,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react-native';
import {
  fetchAnalytics,
  fetchRegisterBalance,
  type DailySummary,
} from '../lib/api';
import {formatPrice} from '../lib/format';
import {spacing, radii, typeScale} from '../theme';

export function DashboardScreen() {
  const {tokens} = useTheme();
  const {shop} = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState<DailySummary[]>([]);
  const [cashTotal, setCashTotal] = useState(0);

  useEffect(() => {
    if (!shop) {
      return;
    }
    (async () => {
      try {
        const [analytics, register] = await Promise.all([
          fetchAnalytics(),
          fetchRegisterBalance(),
        ]);
        setDaily(Array.isArray(analytics) ? analytics : []);
        const total = register.reduce(
          (
            sum: number,
            r: {destination: string; balance: number; total_balance: number},
          ) => sum + (r.balance ?? 0),
          0,
        );
        setCashTotal(total);
      } catch {
        // Silently fail — show placeholder data
      } finally {
        setLoading(false);
      }
    })();
  }, [shop]);

  // Aggregate KPIs from daily analytics
  const totalRevenue = daily.reduce((s, d) => s + (d.total_sales ?? 0), 0);
  const totalTransactions = daily.reduce(
    (s, d) => s + (d.total_transactions ?? 0),
    0,
  );
  const avgSale = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

  const kpiIconSize = 20;
  const kpis = shop
    ? [
        {
          label: 'Revenue',
          value: formatPrice(totalRevenue, shop),
          Icon: DollarSign,
          color: '#10B981',
        },
        {
          label: 'Sales',
          value: String(totalTransactions),
          Icon: Receipt,
          color: '#6366F1',
        },
        {
          label: 'Avg Sale',
          value: formatPrice(avgSale, shop),
          Icon: BarChart3,
          color: '#F59E0B',
        },
        {
          label: 'Cash Drawer',
          value: formatPrice(cashTotal, shop),
          Icon: Landmark,
          color: '#EC4899',
        },
      ]
    : [
        {label: 'Revenue', value: '—', Icon: DollarSign, color: '#10B981'},
        {label: 'Sales', value: '—', Icon: Receipt, color: '#6366F1'},
        {label: 'Avg Sale', value: '—', Icon: BarChart3, color: '#F59E0B'},
        {label: 'Cash Drawer', value: '—', Icon: Landmark, color: '#EC4899'},
      ];

  const now = new Date();
  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const GreetingIcon = hour < 12 ? Sun : hour < 18 ? Sunset : Moon;
  const greetingColor =
    hour < 12 ? '#F59E0B' : hour < 18 ? '#F97316' : '#8B5CF6';

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: tokens.bg}]}
      contentContainerStyle={{paddingBottom: insets.bottom + 20}}
      contentInsetAdjustmentBehavior="automatic">
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + spacing.lg}]}>
        <View style={styles.greetingRow}>
          <Text style={[typeScale.display, {color: tokens.text}]}>
            {greeting}
          </Text>
          <GreetingIcon size={28} color={greetingColor} strokeWidth={1.75} />
        </View>
        <Text style={[typeScale.caption, {color: tokens.text3, marginTop: 4}]}>
          {shop?.name ?? 'Shëlf'} — Here's what's happening today
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.navAccent} />
        </View>
      ) : (
        <View style={styles.kpiGrid}>
          {kpis.map(kpi => (
            <View
              key={kpi.label}
              style={[
                styles.kpiCard,
                {backgroundColor: tokens.surface, borderColor: tokens.border},
              ]}>
              <View
                style={[
                  styles.kpiIconWrap,
                  {backgroundColor: kpi.color + '18'},
                ]}>
                <kpi.Icon
                  size={kpiIconSize}
                  color={kpi.color}
                  strokeWidth={2}
                />
              </View>
              <Text style={[styles.kpiLabel, {color: tokens.text3}]}>
                {kpi.label}
              </Text>
              <Text style={[styles.kpiValue, {color: tokens.text}]}>
                {kpi.value}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {paddingHorizontal: spacing.xl, marginBottom: spacing.lg},
  loadingContainer: {paddingVertical: 40, alignItems: 'center'},
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  kpiCard: {
    width: '47%',
    flexGrow: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  kpiIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  kpiLabel: {...typeScale.tiny, marginBottom: spacing.xs},
  kpiValue: {...typeScale.heading},
});
