/**
 * Card — elevated surface container with optional press interaction.
 */
import React from 'react';
import {
  View,
  TouchableOpacity,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import {useTheme} from '../ThemeProvider';
import {radii, shadows} from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  onPress?: () => void;
  variant?: 'default' | 'inset' | 'outlined';
}

export function Card({
  children,
  style,
  padding = 16,
  onPress,
  variant = 'default',
}: CardProps) {
  const {tokens} = useTheme();

  const bgColor = variant === 'inset' ? tokens.surface2 : tokens.surface;
  const borderColor = variant === 'outlined' ? tokens.border : 'transparent';

  const containerStyle: ViewStyle = {
    backgroundColor: bgColor,
    borderRadius: radii.lg,
    padding,
    borderWidth: variant === 'outlined' ? 1 : 0,
    borderColor,
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[containerStyle, shadows.sm, style]}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[containerStyle, shadows.sm, style]}>{children}</View>;
}
