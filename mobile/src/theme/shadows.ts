/**
 * Shadow tokens — four-tier elevation system with accent glow.
 * Ported from the web app's shadow-sm, shadow, shadow-lg.
 *
 * On React Native, shadows require both shadow* (iOS) and elevation (Android).
 */

import {Platform, ViewStyle} from 'react-native';

const isAndroid = Platform.OS === 'android';

export const shadows = {
  /** Subtle card lift */
  sm: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: isAndroid ? 0.15 : 0.06,
    shadowRadius: 3,
    elevation: 1,
  } as ViewStyle,

  /** Dropdown, popover, sheet */
  md: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: isAndroid ? 0.2 : 0.08,
    shadowRadius: 14,
    elevation: 3,
  } as ViewStyle,

  /** Modal, FAB */
  lg: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: isAndroid ? 0.25 : 0.12,
    shadowRadius: 32,
    elevation: 6,
  } as ViewStyle,

  /** Accent glow — for FABs and primary buttons */
  glow: (accentColor: string) =>
    ({
      shadowColor: accentColor,
      shadowOffset: {width: 0, height: 4},
      shadowOpacity: isAndroid ? 0.35 : 0.25,
      shadowRadius: 16,
      elevation: 8,
    } as ViewStyle),
} as const;
