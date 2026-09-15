/**
 * Typography tokens — font families and type scale.
 * Plus Jakarta Sans matches the web app's design language.
 */

import {Platform, TextStyle} from 'react-native';

/**
 * Plus Jakarta Sans — bundled in assets/fonts/.
 * Loaded at app startup via useLoadFonts() hook.
 * Falls back to system font if loading fails.
 */
const fontFamily =
  Platform.select({
    ios: 'PlusJakartaSans-Regular',
    android: 'PlusJakartaSans-Regular',
  }) ?? 'System';

const fontFamilyMedium =
  Platform.select({
    ios: 'PlusJakartaSans-Medium',
    android: 'PlusJakartaSans-Medium',
  }) ?? 'System';

const fontFamilySemiBold =
  Platform.select({
    ios: 'PlusJakartaSans-SemiBold',
    android: 'PlusJakartaSans-SemiBold',
  }) ?? 'System';

const fontFamilyBold =
  Platform.select({
    ios: 'PlusJakartaSans-Bold',
    android: 'PlusJakartaSans-Bold',
  }) ?? 'System';

const fontFamilyExtraBold =
  Platform.select({
    ios: 'PlusJakartaSans-ExtraBold',
    android: 'PlusJakartaSans-ExtraBold',
  }) ?? 'System';

const fontFamilyMono =
  Platform.select({
    ios: 'Menlo',
    android: 'monospace',
  }) ?? 'monospace';

/**
 * Type scale — mobile-adjusted from the web app's scale.
 * The web review recommends bumping the floor so nothing dips
 * below comfortable reading size at arm's length.
 */
export const typeScale = {
  /** Page hero title (Dashboard greeting) — 28sp */
  display: {
    fontFamily: fontFamilyExtraBold,
    fontSize: 28,
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  /** Section headers — 20sp */
  heading: {
    fontFamily: fontFamilyBold,
    fontSize: 20,
    lineHeight: 26,
  },
  /** Card titles, product names — 16sp */
  title: {
    fontFamily: fontFamilySemiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  /** Body text — 14sp */
  body: {
    fontFamily,
    fontSize: 14,
    lineHeight: 20,
  },
  /** Metadata, timestamps — 12sp */
  caption: {
    fontFamily: fontFamilyMedium,
    fontSize: 12,
    lineHeight: 16,
  },
  /** Overlines, status labels — 11sp, uppercase */
  tiny: {
    fontFamily: fontFamilySemiBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase' as TextStyle['textTransform'],
    lineHeight: 14,
  },
  /** Monospace for barcodes, SKUs */
  mono: {
    fontFamily: fontFamilyMono,
    fontSize: 13,
    lineHeight: 18,
  },
} as const;
