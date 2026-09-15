/**
 * Button — primary, secondary, ghost, danger variants with loading state.
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import {useTheme} from '../ThemeProvider';
import {radii, shadows} from '../../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const SIZE_MAP: Record<
  ButtonSize,
  {height: number; px: number; fontSize: number}
> = {
  sm: {height: 32, px: 12, fontSize: 13},
  md: {height: 40, px: 16, fontSize: 14},
  lg: {height: 48, px: 20, fontSize: 15},
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const {tokens} = useTheme();
  const s = SIZE_MAP[size];

  const variantStyles: Record<
    ButtonVariant,
    {bg: string; text: string; border?: string}
  > = {
    primary: {bg: tokens.navAccent, text: '#FFFFFF'},
    secondary: {bg: tokens.surface2, text: tokens.text, border: tokens.border},
    ghost: {bg: 'transparent', text: tokens.navAccent},
    danger: {bg: tokens.danger, text: '#FFFFFF'},
  };

  const v = variantStyles[variant];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        {
          height: s.height,
          paddingHorizontal: s.px,
          backgroundColor: v.bg,
          borderRadius: variant === 'ghost' ? 0 : radii.md,
          borderWidth: v.border ? 1 : 0,
          borderColor: v.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          opacity: disabled ? 0.5 : 1,
        },
        variant === 'primary' ? shadows.sm : undefined,
        style,
      ]}>
      {loading ? <ActivityIndicator size="small" color={v.text} /> : icon}
      <Text
        style={{
          color: v.text,
          fontSize: s.fontSize,
          fontWeight: '600',
        }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
