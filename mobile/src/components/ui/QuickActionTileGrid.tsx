import React from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import {useTheme} from '../ThemeProvider';
import {spacing, radii, typeScale} from '../../theme';

export interface ActionTile {
  id: string;
  label: string;
  icon: (props: {color: string; size: number}) => React.ReactNode;
}

export interface QuickActionTileGridProps {
  tiles: ActionTile[];
  activeId: string;
  onSelect: (id: string) => void;
  style?: ViewStyle;
}

export function QuickActionTileGrid({
  tiles,
  activeId,
  onSelect,
  style,
}: QuickActionTileGridProps) {
  const {tokens} = useTheme();

  return (
    <View style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.grid}>
        {tiles.map(tile => {
          const isActive = tile.id === activeId;
          return (
            <TouchableOpacity
              key={tile.id}
              activeOpacity={0.7}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? tokens.navAccent : tokens.surface,
                  borderColor: isActive ? tokens.navAccent : tokens.border,
                },
              ]}
              onPress={() => onSelect(tile.id)}>
              <View style={styles.iconWrap}>
                {tile.icon({
                  color: isActive ? '#FFFFFF' : tokens.text2,
                  size: 16,
                })}
              </View>
              <Text
                style={[
                  styles.label,
                  {
                    color: isActive ? '#FFFFFF' : tokens.text2,
                    fontWeight: isActive ? '600' : '500',
                  },
                ]}
                numberOfLines={1}>
                {tile.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    gap: spacing.xs,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typeScale.caption,
  },
});
