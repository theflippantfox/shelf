import React from 'react';
import {View, TouchableOpacity, StyleSheet, ViewStyle} from 'react-native';
import {useTheme} from '../ThemeProvider';
import {spacing, radii} from '../../theme';
import {ChevronLeft} from 'lucide-react-native';

export interface TopBarProps {
  onBack?: () => void;
  leadingIcon?: React.ReactNode;
  trailingIcons?: React.ReactNode[];
  avatar?: React.ReactNode;
  style?: ViewStyle;
}

export function TopBar({
  onBack,
  leadingIcon,
  trailingIcons = [],
  avatar,
  style,
}: TopBarProps) {
  const {tokens} = useTheme();

  return (
    <View style={[styles.container, style]}>
      {/* Leading Edge */}
      <View style={styles.leading}>
        {(onBack || leadingIcon) && (
          <TouchableOpacity
            style={[styles.iconButton, {backgroundColor: tokens.surface}]}
            onPress={onBack}
            activeOpacity={0.7}>
            {leadingIcon || <ChevronLeft size={24} color={tokens.text2} />}
          </TouchableOpacity>
        )}
      </View>

      {/* Trailing Cluster */}
      <View style={styles.trailing}>
        {trailingIcons.map((icon, i) => (
          <TouchableOpacity
            key={`icon-${i}`}
            style={[
              styles.iconButton,
              {backgroundColor: tokens.surface, marginLeft: spacing.sm},
            ]}
            activeOpacity={0.7}>
            {icon}
          </TouchableOpacity>
        ))}
        {avatar && <View style={styles.avatarWrap}>{avatar}</View>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  leading: {
    flex: 1,
    alignItems: 'flex-start',
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarWrap: {
    marginLeft: spacing.lg,
  },
});
