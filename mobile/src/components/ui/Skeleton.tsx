/**
 * Skeleton — shimmer loading placeholder component.
 * Used across screens for consistent loading states.
 */
import {useEffect, useRef} from 'react';
import {View, Animated, StyleSheet, type ViewStyle} from 'react-native';
import {useTheme} from '../ThemeProvider';
import {radii} from '../../theme';

interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = radii.sm,
  style,
}: SkeletonProps) {
  const {tokens} = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: tokens.surface2,
          opacity,
        },
        style,
      ]}
    />
  );
}

/** Pre-built skeleton layouts for common patterns */

export function StatCardSkeleton() {
  return (
    <View style={skeletonStyles.card}>
      <Skeleton width={40} height={40} borderRadius={20} />
      <Skeleton width="60%" height={12} style={{marginTop: 12}} />
      <Skeleton width="40%" height={24} style={{marginTop: 8}} />
      <Skeleton width="50%" height={10} style={{marginTop: 6}} />
    </View>
  );
}

export function ListRowSkeleton({count = 5}: {count?: number}) {
  return (
    <View style={skeletonStyles.list}>
      {Array.from({length: count}).map((_, i) => (
        <View key={i} style={skeletonStyles.row}>
          <Skeleton width={44} height={44} borderRadius={12} />
          <View style={skeletonStyles.rowContent}>
            <Skeleton width="70%" height={14} />
            <Skeleton width="50%" height={10} style={{marginTop: 6}} />
          </View>
          <Skeleton width={60} height={14} />
        </View>
      ))}
    </View>
  );
}

export function ProductGridSkeleton() {
  return (
    <View style={skeletonStyles.grid}>
      {Array.from({length: 6}).map((_, i) => (
        <View key={i} style={skeletonStyles.gridItem}>
          <Skeleton width="100%" height={80} borderRadius={10} />
          <Skeleton width="80%" height={12} style={{marginTop: 8}} />
          <Skeleton width="50%" height={10} style={{marginTop: 4}} />
          <Skeleton width="40%" height={14} style={{marginTop: 6}} />
        </View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 16,
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  rowContent: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '48%',
    padding: 12,
  },
});
