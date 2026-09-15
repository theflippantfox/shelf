/**
 * DashboardScreen — polished analytics dashboard with stat cards.
 */
import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useTheme} from '../components/ThemeProvider';
import {useAuth} from '../components/AuthProvider';
import {fetchAnalytics, type DailySummary} from '../lib/api';
import {formatPrice} from '../lib/format';
import {spacing} from '../theme';
import {SectionHeader, PageHeadingBlock, HeroStatCard, ListRow} from '../components/ui';
import {
  TrendingUp,
  Receipt,
  BarChart3,
  ShoppingCart,
  Sun,
  Sunset,
  Moon,
} from 'lucide-react-native';

function getGreeting(): {text: string; Icon: typeof Sun} {
  const h = new Date().getHours();
  if (h < 12) {
    return {text: 'Good morning', Icon: Sun};
  }
  if (h < 17) {
    return {text: 'Good afternoon', Icon: Sunset};
  }
  return {text: 'Good evening', Icon: Moon};
}

export function DashboardScreen() {
  const {tokens} = useTheme();
  const {shop, user} = useAuth();
  const insets = useSafeAreaInsets();
  const [daily, setDaily] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!shop) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchAnalytics();
      setDaily(data);
    } catch (err) {
      console.error('[Dashboard] Failed to load analytics:', err);
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

  // Compute totals
  const today = daily[daily.length - 1];
  const totalSales = daily.reduce((s, d) => s + d.total_sales, 0);
  const totalTxns = daily.reduce((s, d) => s + d.total_transactions, 0);
  const avgBasket = totalTxns > 0 ? totalSales / totalTxns : 0;

  const greeting = getGreeting();
  const firstName = user?.email?.split('@')[0] ?? 'there';

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: tokens.bg,
        }}>
        <ActivityIndicator size="large" color={tokens.navAccent} />
      </View>
    );
  }

  const statCards = [
    {
      label: "Today's sales",
      value: shop ? formatPrice(today?.total_sales ?? 0, shop) : '0',
      icon: <TrendingUp size={20} color={tokens.success} strokeWidth={2} />,
      color: tokens.successDim,
    },
    {
      label: 'Transactions',
      value: String(today?.total_transactions ?? 0),
      icon: <Receipt size={20} color={tokens.info} strokeWidth={2} />,
      color: tokens.infoDim,
    },
    {
      label: 'Avg basket',
      value: shop ? formatPrice(avgBasket, shop) : '0',
      icon: <ShoppingCart size={20} color={tokens.warning} strokeWidth={2} />,
      color: tokens.warningDim,
    },
    {
      label: 'Total sales',
      value: shop ? formatPrice(totalSales, shop) : '0',
      icon: <BarChart3 size={20} color={tokens.navAccent} strokeWidth={2} />,
      color: tokens.accentGlow,
    },
  ];

  return (
    <ScrollView
      style={{flex: 1, backgroundColor: tokens.bg}}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.xl,
        paddingBottom: insets.bottom + spacing.xxxl,
      }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={tokens.navAccent}
          colors={[tokens.navAccent]}
        />
      }>
      {/* Greeting */}
      <PageHeadingBlock
        eyebrow={greeting.text}
        heading={firstName}
        inlineBadge={shop ? (
          <View style={{backgroundColor: tokens.surface2, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12}}>
            <Text style={{color: tokens.text2, fontSize: 10, fontWeight: '600'}}>{shop.name}</Text>
          </View>
        ) : null}
      />

      {/* Stat cards - Today's Hero */}
      <View style={{paddingHorizontal: spacing.xl, marginBottom: spacing.md}}>
        <HeroStatCard
          label="Today's sales"
          value={shop ? formatPrice(today?.total_sales ?? 0, shop) : '0'}
          deltaText={`${today?.total_transactions ?? 0} transactions`}
          deltaSign="neutral"
          graphic={<TrendingUp size={64} color={tokens.success} strokeWidth={1} style={{opacity: 0.2, margin: -10}} />}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: spacing.xl,
          gap: spacing.md,
        }}>
        {statCards.slice(1).map((card, i) => (
          <HeroStatCard
            key={i}
            label={card.label}
            value={card.value}
            style={{
              width: '47%' as any,
              flexGrow: 1,
            }}
          />
        ))}
      </View>

      {/* Recent daily breakdown */}
      {daily.length > 1 && (
        <>
          <SectionHeader
            title="Daily breakdown"
            icon={
              <BarChart3 size={14} color={tokens.text3} strokeWidth={1.75} />
            }
          />
          <View style={{paddingHorizontal: spacing.xl}}>
            {daily
              .slice(-7)
              .reverse()
              .map((d, i) => (
                <ListRow
                  key={d.date + i}
                  title={d.date}
                  subtitle={`${d.total_transactions} txns`}
                  value={shop ? formatPrice(d.total_sales, shop) : `\u20B9${d.total_sales}`}
                  icon={<BarChart3 size={20} color={tokens.text2} />}
                  iconBgColor={tokens.surface2}
                />
              ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
