/**
 * GlassCard — frosted glass effect card using semi-transparent surfaces.
 * Best used for overlays, floating panels, and scanner mode cards.
 */
import React from 'react';
import {View, type ViewStyle, type StyleProp} from 'react-native';
import {useTheme} from '../ThemeProvider';
import {radii, shadows} from '../../theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padding?: number;
  intensity?: 'light' | 'medium' | 'heavy';
}

export function GlassCard({
  children,
  style,
  padding = 16,
  intensity = 'medium',
}: GlassCardProps) {
  const {isDark} = useTheme();

  const opacity =
    intensity === 'light' ? 0.6 : intensity === 'medium' ? 0.8 : 0.95;

  return (
    <View
      style={[
        {
          backgroundColor: isDark
            ? `rgba(17,17,20,${opacity})`
            : `rgba(255,255,255,${opacity})`,
          borderRadius: radii.xl,
          padding,
          borderWidth: 1,
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
        shadows.md,
        style,
      ]}>
      {children}
    </View>
  );
}
