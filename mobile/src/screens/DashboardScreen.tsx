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
import {spacing, radii, typeScale} from '../theme';
import {Card, SectionHeader} from '../components/ui';
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
      <View style={{paddingHorizontal: spacing.xl, marginBottom: spacing.xl}}>
        <View
          style={{flexDirection: 'row', alignItems: 'center', gap: spacing.sm}}>
          <greeting.Icon size={22} color={tokens.navAccent} strokeWidth={2} />
          <Text style={[typeScale.body, {color: tokens.text3}]}>
            {greeting.text}
          </Text>
        </View>
        <Text
          style={[
            typeScale.display,
            {color: tokens.text, marginTop: spacing.xs},
          ]}>
          {firstName}
        </Text>
        {shop ? (
          <Text
            style={[typeScale.caption, {color: tokens.text3, marginTop: 2}]}>
            {shop.name}
          </Text>
        ) : null}
      </View>

      {/* Stat cards */}
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          paddingHorizontal: spacing.lg,
          gap: spacing.md,
        }}>
        {statCards.map((card, i) => (
          <Card
            key={i}
            variant="outlined"
            padding={spacing.lg}
            style={{
              width: '47%' as any,
              flexGrow: 1,
            }}>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: radii.md,
                backgroundColor: card.color,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: spacing.md,
              }}>
              {card.icon}
            </View>
            <Text
              style={[
                typeScale.tiny,
                {color: tokens.text3, marginBottom: spacing.xs},
              ]}>
              {card.label}
            </Text>
            <Text
              style={[
                typeScale.title,
                {color: tokens.text, fontVariant: ['tabular-nums']},
              ]}>
              {card.value}
            </Text>
          </Card>
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
                <View
                  key={d.date + i}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingVertical: spacing.md,
                    borderBottomWidth:
                      i < Math.min(daily.length, 7) - 1 ? 1 : 0,
                    borderBottomColor: tokens.border,
                  }}>
                  <Text style={[typeScale.body, {color: tokens.text, flex: 1}]}>
                    {d.date}
                  </Text>
                  <Text
                    style={[
                      typeScale.caption,
                      {color: tokens.text3, marginRight: spacing.lg},
                    ]}>
                    {d.total_transactions} txns
                  </Text>
                  <Text
                    style={[
                      typeScale.body,
                      {
                        color: tokens.text,
                        fontWeight: '600',
                        fontVariant: ['tabular-nums'],
                      },
                    ]}>
                    {shop
                      ? formatPrice(d.total_sales, shop)
                      : `\u20B9${d.total_sales}`}
                  </Text>
                </View>
              ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
