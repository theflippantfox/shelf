import React from 'react';
import {View, Text, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from '../ThemeProvider';
import {spacing, typeScale} from '../../theme';

export interface PageHeadingBlockProps {
  eyebrow?: string;
  heading: string;
  inlineBadge?: React.ReactNode;
  style?: ViewStyle;
}

export function PageHeadingBlock({
  eyebrow,
  heading,
  inlineBadge,
  style,
}: PageHeadingBlockProps) {
  const {tokens} = useTheme();

  return (
    <View style={[styles.container, style]}>
      {eyebrow && (
        <Text style={[typeScale.caption, {color: tokens.text2, marginBottom: 4}]}>
          {eyebrow}
        </Text>
      )}
      <View style={styles.headingRow}>
        <Text style={[typeScale.display, {color: tokens.text, fontWeight: '700'}]}>
          {heading}
        </Text>
        {inlineBadge && <View style={styles.badgeWrap}>{inlineBadge}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  badgeWrap: {
    marginLeft: spacing.sm,
  },
});
