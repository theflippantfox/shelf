/**
 * HistoryScreen — recent sales list with date filtering.
 */
import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {View, Text, ActivityIndicator, Alert, ScrollView} from 'react-native';
import {useTheme} from '../components/ThemeProvider';
import {useAuth} from '../components/AuthProvider';
import {
  EmptyState,
  PageHeadingBlock,
  ListRow,
  QuickActionTileGrid,
  type ActionTile,
} from '../components/ui';
import {fetchSales, type Sale} from '../lib/api';
import {formatPrice, formatDateTime} from '../lib/format';
import {spacing, typeScale} from '../theme';
import {
  CalendarClock,
  CalendarDays,
  Calendar as CalendarIcon,
  History,
  Receipt,
} from 'lucide-react-native';

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

  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [_refreshing, setRefreshing] = useState(false);
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

  const rangeTiles: ActionTile[] = [
    {
      id: 'today',
      label: 'Today',
      icon: ({color, size}) => (
        <CalendarClock color={color} size={size} strokeWidth={1.75} />
      ),
    },
    {
      id: 'week',
      label: '7 Days',
      icon: ({color, size}) => (
        <CalendarDays color={color} size={size} strokeWidth={1.75} />
      ),
    },
    {
      id: 'month',
      label: '30 Days',
      icon: ({color, size}) => (
        <CalendarIcon color={color} size={size} strokeWidth={1.75} />
      ),
    },
    {
      id: 'all',
      label: 'All Time',
      icon: ({color, size}) => (
        <History color={color} size={size} strokeWidth={1.75} />
      ),
    },
  ];

  return (
    <View style={{flex: 1, backgroundColor: tokens.bg}}>
      <ScrollView
        style={{flex: 1}}
        contentContainerStyle={{
          paddingTop: spacing.xxl + spacing.lg,
          paddingBottom: spacing.xxxl,
        }}>
        {/* Header */}
        <PageHeadingBlock heading="Sales History" eyebrow={shop?.name ?? ''} />

        {/* Time range filters */}
        <View style={{marginBottom: spacing.lg}}>
          <QuickActionTileGrid
            tiles={rangeTiles}
            activeId={range}
            onSelect={id => setRange(id as TimeRange)}
          />
        </View>

        {/* Stats bar */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: tokens.surface2,
            borderRadius: 12,
            marginHorizontal: spacing.xl,
            padding: spacing.md,
            marginBottom: spacing.lg,
          }}>
          <View style={{flex: 1, alignItems: 'center'}}>
            <Text
              style={[
                typeScale.heading,
                {color: tokens.text, fontWeight: '700'},
              ]}>
              {shop ? formatPrice(stats.total, shop) : `₹${stats.total}`}
            </Text>
            <Text style={[typeScale.tiny, {color: tokens.text3, marginTop: 2}]}>
              Total
            </Text>
          </View>
          <View
            style={{
              width: 1,
              backgroundColor: tokens.border,
              marginHorizontal: spacing.sm,
            }}
          />
          <View style={{flex: 1, alignItems: 'center'}}>
            <Text
              style={[
                typeScale.heading,
                {color: tokens.text, fontWeight: '700'},
              ]}>
              {stats.count}
            </Text>
            <Text style={[typeScale.tiny, {color: tokens.text3, marginTop: 2}]}>
              Sales
            </Text>
          </View>
          <View
            style={{
              width: 1,
              backgroundColor: tokens.border,
              marginHorizontal: spacing.sm,
            }}
          />
          <View style={{flex: 1, alignItems: 'center'}}>
            <Text
              style={[
                typeScale.heading,
                {color: tokens.text, fontWeight: '700'},
              ]}>
              {shop
                ? formatPrice(stats.avg, shop)
                : `₹${Math.round(stats.avg)}`}
            </Text>
            <Text style={[typeScale.tiny, {color: tokens.text3, marginTop: 2}]}>
              Average
            </Text>
          </View>
        </View>

        {/* Sales list */}
        {loading ? (
          <View
            style={{
              paddingVertical: spacing.xxxl,
              alignItems: 'center',
            }}>
            <ActivityIndicator size="large" color={tokens.navAccent} />
          </View>
        ) : sales.length === 0 ? (
          <View style={{paddingHorizontal: spacing.xl}}>
            <EmptyState
              icon={<History size={48} color={tokens.text3} strokeWidth={1} />}
              title="No sales in this period"
              subtitle="Change the time range to see more history"
            />
          </View>
        ) : (
          <View style={{paddingHorizontal: spacing.xl}}>
            {sales.map(item => (
              <ListRow
                key={item.id}
                title={item.sale_ref}
                subtitle={`${formatDateTime(item.created_at, shop!)}${
                  item.customer?.name ? ` · ${item.customer.name}` : ''
                }`}
                value={shop ? formatPrice(item.total, shop) : `₹${item.total}`}
                icon={<Receipt size={20} color={tokens.text2} />}
                iconBgColor={tokens.surface2}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
