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
import {Svg, Defs, LinearGradient, Stop, Rect} from 'react-native-svg';

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
              style={styles.tileWrapper}
              onPress={() => onSelect(tile.id)}>
              <View
                style={[
                  styles.iconContainer,
                  {backgroundColor: isActive ? 'transparent' : tokens.surface},
                ]}>
                {isActive && (
                  <View
                    style={[
                      StyleSheet.absoluteFillObject,
                      {borderRadius: radii.md, overflow: 'hidden'},
                    ]}>
                    <Svg width="100%" height="100%">
                      <Defs>
                        <LinearGradient
                          id="activeGrad"
                          x1="0"
                          y1="0"
                          x2="1"
                          y2="1">
                          <Stop
                            offset="0"
                            stopColor="#8B5CF6"
                            stopOpacity="1"
                          />
                          <Stop
                            offset="1"
                            stopColor="#3B82F6"
                            stopOpacity="1"
                          />
                        </LinearGradient>
                      </Defs>
                      <Rect
                        width="100%"
                        height="100%"
                        fill="url(#activeGrad)"
                      />
                    </Svg>
                  </View>
                )}
                {tile.icon({
                  color: isActive ? '#FFFFFF' : tokens.text2,
                  size: 24,
                })}
              </View>

              <Text
                style={[
                  typeScale.caption,
                  styles.label,
                  {
                    color: isActive ? tokens.text : tokens.text2,
                    fontWeight: isActive ? '600' : '400',
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
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  tileWrapper: {
    alignItems: 'center',
    width: 72,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    textAlign: 'center',
  },
});
