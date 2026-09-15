import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from '../ThemeProvider';
import {spacing, typeScale} from '../../theme';

import {Card} from './Card';

export interface HeroStatCardProps {
  label: string;
  value: string;
  deltaText?: string;
  deltaSign?: 'positive' | 'negative' | 'neutral';
  actionIcon?: React.ReactNode;
  inlineIcon?: React.ReactNode;
  graphic?: React.ReactNode;
  style?: ViewStyle;
}

export function HeroStatCard({
  label,
  value,
  deltaText,
  deltaSign = 'neutral',
  actionIcon,
  inlineIcon,
  graphic,
  style,
}: HeroStatCardProps) {
  const {tokens} = useTheme();

  return (
    <Card
      variant="default" // surface-1
      style={[{position: 'relative', overflow: 'hidden', padding: spacing.xl}, style]}
    >
      {/* Decorative graphic positioned bottom-right */}
      {graphic && (
        <View
          style={{
            position: 'absolute',
            bottom: -10,
            right: -10,
            opacity: 0.8,
            zIndex: 0,
          }}>
          {graphic}
        </View>
      )}

      <View style={{zIndex: 1}}>
        {/* Row 1: Eyebrow label and Action */}
        <View style={styles.topRow}>
          <Text style={[typeScale.caption, {color: tokens.text2, flex: 1}]}>
            {label}
          </Text>
          {actionIcon && <View>{actionIcon}</View>}
        </View>

        {/* Row 2: Large bold value + inline icon */}
        <View style={styles.valueRow}>
          <Text style={[typeScale.display, {color: tokens.text}]}>
            {value}
          </Text>
          {inlineIcon && <View style={styles.inlineIcon}>{inlineIcon}</View>}
        </View>

        {/* Row 3: Status / Delta */}
        {deltaText && (
          <Text
            style={[
              typeScale.caption,
              {
                marginTop: spacing.xs,
                color:
                  deltaSign === 'positive'
                    ? tokens.success
                    : deltaSign === 'negative'
                    ? tokens.danger
                    : tokens.text2,
              },
            ]}>
            {deltaText}
          </Text>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  inlineIcon: {
    marginLeft: spacing.xs,
  },
});
