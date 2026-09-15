/**
 * EmptyState — centered empty message with icon and optional CTA.
 */
import React from 'react';
import {View, Text} from 'react-native';
import {useTheme} from '../ThemeProvider';
import {typeScale, spacing} from '../../theme';
import {Button} from './Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const {tokens} = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        paddingVertical: spacing.xxxl,
        gap: spacing.md,
      }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: tokens.surface2,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.sm,
        }}>
        {icon}
      </View>
      <Text
        style={[typeScale.title, {color: tokens.text, textAlign: 'center'}]}>
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={[
            typeScale.body,
            {color: tokens.text3, textAlign: 'center', maxWidth: 260},
          ]}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{marginTop: spacing.sm}}>
          <Button
            label={actionLabel}
            onPress={onAction}
            variant="primary"
            size="md"
          />
        </View>
      ) : null}
    </View>
  );
}
