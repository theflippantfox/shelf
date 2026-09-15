import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from '../ThemeProvider';
import {spacing, radii, typeScale} from '../../theme';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: React.ReactNode;
  iconBgColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export function ListRow({
  title,
  subtitle,
  value,
  icon,
  iconBgColor,
  onPress,
  style,
}: ListRowProps) {
  const {tokens} = useTheme();

  const content = (
    <View
      style={[
        styles.container,
        {backgroundColor: tokens.surface, borderRadius: radii.lg},
        style,
      ]}>
      {/* Leading */}
      {icon && (
        <View
          style={[
            styles.iconBadge,
            {backgroundColor: iconBgColor || tokens.surface2},
          ]}>
          {icon}
        </View>
      )}

      {/* Middle */}
      <View style={styles.middle}>
        <Text
          style={[typeScale.body, {fontWeight: '600', color: tokens.text}]}
          numberOfLines={1}>
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[typeScale.caption, {color: tokens.text2, marginTop: 2}]}
            numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {/* Trailing */}
      {value && (
        <Text
          style={[
            typeScale.body,
            {color: tokens.text, fontVariant: ['tabular-nums']},
          ]}
          numberOfLines={1}>
          {value}
        </Text>
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm, // Gap between stacked rows
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  middle: {
    flex: 1,
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
});
