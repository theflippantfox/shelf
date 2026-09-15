/**
 * HeroStatCard — gradient stat card matching the web KpiCard.
 *
 * Features:
 * - Gradient background with tone-based color
 * - Animated counter that counts up on mount
 * - Trend indicator with arrow
 */
import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  Text,
  Animated,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import {TrendingUp, TrendingDown, Minus} from 'lucide-react-native';
import {typeScale, radii, shadows} from '../../theme';

type Tone = 'gold' | 'blue' | 'teal' | 'violet' | 'crimson' | 'lime';

interface HeroStatCardProps {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  trend?: number;
  tone?: Tone;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const TONE_CONFIG: Record<
  Tone,
  {bg: string; chipBg: string; chipText: string; iconBg: string}
> = {
  gold: {
    bg: '#FEF3C7',
    chipBg: '#FDE68A',
    chipText: '#92400E',
    iconBg: '#F59E0B18',
  },
  blue: {
    bg: '#DBEAFE',
    chipBg: '#BFDBFE',
    chipText: '#1E40AF',
    iconBg: '#3B82F618',
  },
  teal: {
    bg: '#CCFBF1',
    chipBg: '#99F6E4',
    chipText: '#115E59',
    iconBg: '#14B8A618',
  },
  violet: {
    bg: '#EDE9FE',
    chipBg: '#DDD6FE',
    chipText: '#5B21B6',
    iconBg: '#8B5CF618',
  },
  crimson: {
    bg: '#FEE2E2',
    chipBg: '#FECACA',
    chipText: '#991B1B',
    iconBg: '#EF444418',
  },
  lime: {
    bg: '#ECFCCB',
    chipBg: '#D9F99D',
    chipText: '#3F6212',
    iconBg: '#84CC1618',
  },
};

export function HeroStatCard({
  label,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  trend,
  tone = 'gold',
  icon,
  style,
}: HeroStatCardProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [displayNum, setDisplayNum] = useState(0);
  const config = TONE_CONFIG[tone];

  useEffect(() => {
    const listener = animatedValue.addListener(({value: v}) => {
      setDisplayNum(v);
    });
    Animated.timing(animatedValue, {
      toValue: value,
      duration: 1200,
      useNativeDriver: false,
    }).start();
    return () => animatedValue.removeListener(listener);
  }, [value, animatedValue]);

  const trendColor =
    trend && trend > 0 ? '#16A34A' : trend && trend < 0 ? '#DC2626' : '#71717A';

  const TrendIcon =
    trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;

  return (
    <View
      style={[
        {
          borderRadius: radii.xl,
          backgroundColor: config.bg,
          overflow: 'hidden',
          ...shadows.md,
        },
        style,
      ]}>
      <View style={{padding: 20}}>
        {/* Top row: icon chip + trend */}
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radii.md,
              backgroundColor: config.iconBg,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
            {icon}
          </View>

          {trend !== undefined && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                backgroundColor: `${trendColor}12`,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: radii.sm,
              }}>
              <TrendIcon size={12} color={trendColor} strokeWidth={2.5} />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: trendColor,
                }}>
                {trend > 0 ? '+' : ''}
                {trend.toFixed(1)}%
              </Text>
            </View>
          )}
        </View>

        {/* Label */}
        <Text
          style={[
            typeScale.caption,
            {color: config.chipText, opacity: 0.7, marginBottom: 4},
          ]}>
          {label}
        </Text>

        {/* Animated value */}
        <Text
          style={[
            typeScale.display,
            {
              color: config.chipText,
              fontVariant: ['tabular-nums'],
            },
          ]}>
          {prefix}
          {displayNum.toFixed(decimals)}
          {suffix ? ` ${suffix}` : ''}
        </Text>
      </View>
    </View>
  );
}
