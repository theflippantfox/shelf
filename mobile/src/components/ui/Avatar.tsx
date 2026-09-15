/**
 * Avatar — circular initials display with consistent name-based coloring.
 */
import React from 'react';
import {View, Text} from 'react-native';

interface AvatarProps {
  name: string;
  size?: number;
  fontSize?: number;
}

const AVATAR_COLORS = [
  '#6366F1',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#06B6D4',
  '#EF4444',
  '#F97316',
  '#14B8A6',
  '#3B82F6',
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getAvatarColor(name: string): string {
  return AVATAR_COLORS[hashName(name) % AVATAR_COLORS.length];
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function Avatar({name, size = 44, fontSize}: AvatarProps) {
  const color = getAvatarColor(name);
  const initials = getInitials(name);
  const fs = fontSize ?? Math.round(size * 0.38);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + '20',
        justifyContent: 'center',
        alignItems: 'center',
      }}>
      <Text style={{color, fontSize: fs, fontWeight: '700'}}>{initials}</Text>
    </View>
  );
}
