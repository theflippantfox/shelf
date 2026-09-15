/**
 * HistoryScreen — recent sales list with date filtering.
 */
import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../components/ThemeProvider';
import {useAuth} from '../components/AuthProvider';
import {Card, Badge, EmptyState, Chip} from '../components/ui';
import {fetchSales, type Sale} from '../lib/api';
import {formatPrice, formatDateTime} from '../lib/format';
import {spacing, radii, typeScale} from '../theme';
import {User} from 'lucide-react-native';

type TimeRange = 'today' | 'week' | 'month' | 'all';


function getDateRange(range: TimeRange): {from: string; to: string} | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'today':
      return {from: today.toISOString(), to: now.toISOString()};
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return {from: weekAgo.toISOString(), to: now.toISOString()};
    }
    case 'month': {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return {from: monthAgo.toISOString(), to: now.toISOString()};
    }
    case 'all':
      return null;
  }
}

export function HistoryScreen() {
  const {tokens} = useTheme();
  const {shop} = useAuth();
  const insets = useSafeAreaInsets();

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [range, setRange] = useState<TimeRange>('week');

  const loadSales = useCallback(async () => {
    if (!shop) {
      setLoading(false);
      return;
    }
    try {
      const dateRange = getDateRange(range);
      const data = await fetchSales({
        limit: 100,
        ...(dateRange
          ? {date_from: dateRange.from, date_to: dateRange.to}
          : {}),
      });
      setSales(data.filter(s => !s.voided_at));
    } catch (err) {
      console.error('[History] Failed to load:', err);
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to load sales history',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shop, range]);

  useEffect(() => {
    setLoading(true);
    loadSales();
  }, [loadSales]);

  const stats = useMemo(() => {
    const total = sales.reduce((sum, s) => sum + s.total, 0);
    const count = sales.length;
    const avg = count > 0 ? total / count : 0;
    return {total, count, avg};
  }, [sales]);

  const renderSale = ({item}: {item: Sale}) => (
    <Card variant="outlined" style={styles.saleCard} padding={spacing.md}>
      <View style={styles.saleHeader}>
        <View style={styles.saleRefRow}>
          <Text style={[styles.saleRef, {color: tokens.text}]}>
            {item.sale_ref}
          </Text>
          <Text style={[styles.saleTime, {color: tokens.text3}]}>
            {formatDateTime(item.created_at, shop!)}
          </Text>
        </View>
        <Text style={[styles.saleTotal, {color: tokens.text}]}>
          {shop ? formatPrice(item.total, shop) : `₹${item.total}`}
        </Text>
      </View>

      <View style={styles.saleFooter}>
        <Badge
          variant="default"
          label={item.payment_method}
        />
        {item.customer?.name && (
          <View style={styles.customerBadge}>
            <User size={14} color={tokens.text3} strokeWidth={2} />
            <Text
              style={{
                color: tokens.text3,
                marginLeft: 4,
                ...typeScale.caption,
              }}>
              {item.customer.name}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );

  return (
    <View style={[styles.container, {backgroundColor: tokens.bg}]}>
      {/* Header */}
      <View style={[styles.header, {paddingTop: insets.top + spacing.lg}]}>
        <Text style={[typeScale.heading, {color: tokens.text}]}>
          Sales History
        </Text>
      </View>

      {/* Time range tabs */}
      <View style={styles.tabRow}>
        {(['today', 'week', 'month', 'all'] as TimeRange[]).map(r => (
          <Chip
            key={r}
            label={
              r === 'today'
                ? 'Today'
                : r === 'week'
                ? '7 Days'
                : r === 'month'
                ? '30 Days'
                : 'All'
            }
            selected={range === r}
            onPress={() => setRange(r)}
            style={{flex: 1, alignItems: 'center'}}
          />
        ))}
      </View>

      {/* Stats bar */}
      <View
        style={[
          styles.statsBar,
          {backgroundColor: tokens.surface2, borderColor: tokens.border},
        ]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, {color: tokens.text}]}>
            {shop ? formatPrice(stats.total, shop) : `₹${stats.total}`}
          </Text>
          <Text style={[styles.statLabel, {color: tokens.text3}]}>Total</Text>
        </View>
        <View style={[styles.statDivider, {backgroundColor: tokens.border}]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, {color: tokens.text}]}>
            {stats.count}
          </Text>
          <Text style={[styles.statLabel, {color: tokens.text3}]}>Sales</Text>
        </View>
        <View style={[styles.statDivider, {backgroundColor: tokens.border}]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, {color: tokens.text}]}>
            {shop ? formatPrice(stats.avg, shop) : `₹${stats.avg}`}
          </Text>
          <Text style={[styles.statLabel, {color: tokens.text3}]}>Avg</Text>
        </View>
      </View>

      {/* Sales list */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tokens.navAccent} />
        </View>
      ) : (
        <FlatList
          data={sales}
          renderItem={renderSale}
          keyExtractor={item => item.id}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadSales();
          }}
          contentContainerStyle={{
            paddingHorizontal: spacing.xl,
            paddingBottom: insets.bottom + 20,
          }}
          ListEmptyComponent={
            <EmptyState
              icon={<User size={48} color={tokens.text3} strokeWidth={1} />}
              title="No sales in this period"
              subtitle="Change the time range to see more history"
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1},
  header: {paddingHorizontal: spacing.xl, marginBottom: spacing.sm},
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  tab: {flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center'},
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  stat: {flex: 1, alignItems: 'center'},
  statValue: {...typeScale.title, fontWeight: '700'},
  statLabel: {...typeScale.tiny, marginTop: 2},
  statDivider: {width: 1, marginVertical: 4},
  loadingContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  saleCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  saleRefRow: {flex: 1},
  saleRef: {...typeScale.title},
  saleTime: {...typeScale.tiny, marginTop: 2},
  saleTotal: {...typeScale.heading},
  saleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  paymentBadge: {
    ...typeScale.caption,
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerBadge: {
    ...typeScale.caption,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {paddingVertical: 60, alignItems: 'center'},
  emptyText: {...typeScale.body},
});
