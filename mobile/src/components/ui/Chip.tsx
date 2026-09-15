/**
 * Chip — compact selectable filter/tag.
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import {useTheme} from '../ThemeProvider';
import {radii} from '../../theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

export function Chip({label, selected = false, onPress, style}: ChipProps) {
  const {tokens} = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
      style={[
        {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: radii.pill,
          backgroundColor: selected ? tokens.navAccent : tokens.surface2,
          borderWidth: 1,
          borderColor: selected ? tokens.navAccent : tokens.border,
        },
        style,
      ]}>
      <Text
        style={{
          color: selected ? '#fff' : tokens.text2,
          fontSize: 12,
          fontWeight: '600',
        }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
