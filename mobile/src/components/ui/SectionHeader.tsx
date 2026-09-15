/**
 * SectionHeader — consistent section title with optional action.
 */
import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import {useTheme} from '../ThemeProvider';
import {typeScale, spacing} from '../../theme';

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({
  title,
  icon,
  actionLabel,
  onAction,
}: SectionHeaderProps) {
  const {tokens} = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.xl,
        marginBottom: spacing.md,
        marginTop: spacing.lg,
      }}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
        {icon}
        <Text style={[typeScale.tiny, {color: tokens.text3}]}>{title}</Text>
      </View>
      {actionLabel && onAction ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text
            style={[
              typeScale.caption,
              {color: tokens.navAccent, fontWeight: '600'},
            ]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
