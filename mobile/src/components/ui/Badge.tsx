/**
 * Badge — small status/label indicator.
 */
import React from 'react';
import {View, Text, type ViewStyle, type StyleProp} from 'react-native';
import {radii} from '../../theme';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'accent';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
  colors?: {bg: string; text: string};
}

const SIZE_MAP = {
  sm: {px: 6, py: 2, fontSize: 10},
  md: {px: 8, py: 3, fontSize: 11},
};

export function Badge({
  label,
  variant = 'default',
  size = 'sm',
  style,
  colors,
}: BadgeProps) {
  const s = SIZE_MAP[size];

  const palette: Record<BadgeVariant, {bg: string; text: string}> = {
    default: {bg: 'rgba(113,113,122,0.12)', text: '#71717A'},
    success: {bg: 'rgba(16,185,129,0.12)', text: '#10B981'},
    warning: {bg: 'rgba(245,158,11,0.12)', text: '#F59E0B'},
    danger: {bg: 'rgba(239,68,68,0.12)', text: '#EF4444'},
    info: {bg: 'rgba(59,130,246,0.12)', text: '#3B82F6'},
    accent: {bg: 'rgba(16,185,129,0.12)', text: '#10B981'},
  };

  const c = colors ?? palette[variant];

  return (
    <View
      style={[
        {
          backgroundColor: c.bg,
          paddingHorizontal: s.px,
          paddingVertical: s.py,
          borderRadius: radii.sm,
          alignSelf: 'flex-start',
        },
        style,
      ]}>
      <Text
        style={{
          color: c.text,
          fontSize: s.fontSize,
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: 0.3,
        }}>
        {label}
      </Text>
    </View>
  );
}
