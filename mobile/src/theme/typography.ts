/**
 * Typography tokens — font families and type scale.
 * Ported from the web app with mobile-adjusted sizes.
 *
 * Web uses DM Sans, Outfit, DM Mono.
 * React Native will use system fonts as primary, with the same weight/size hierarchy.
 * For production, bundle custom fonts in assets/fonts/ for offline reliability.
 */

import {Platform, TextStyle} from 'react-native';

// On Android, use sans-serif as primary. On iOS, use the system font.
// For custom fonts (DM Sans, Outfit, DM Mono), bundle font files and register them.
const fontFamily =
  Platform.select({
    ios: 'System',
    android: 'sans-serif',
  }) ?? 'System';

const fontFamilyMono =
  Platform.select({
    ios: 'Menlo',
    android: 'monospace',
  }) ?? 'monospace';

const fontFamilyDisplay =
  Platform.select({
    ios: 'System',
    android: 'sans-serif',
  }) ?? 'System';

/**
 * Type scale — mobile-adjusted from the web app's scale.
 * The web review recommends bumping the floor so nothing dips
 * below comfortable reading size at arm's length.
 */
export const typeScale = {
  /** Page hero title (Dashboard greeting) — 26sp */
  display: {
    fontFamily: fontFamilyDisplay,
    fontSize: 26,
    fontWeight: '700' as TextStyle['fontWeight'],
    letterSpacing: -0.3,
    lineHeight: 32,
  },
  /** Section headers — 19sp */
  heading: {
    fontFamily,
    fontSize: 19,
    fontWeight: '700' as TextStyle['fontWeight'],
    lineHeight: 24,
  },
  /** Card titles, product names — 16sp */
  title: {
    fontFamily,
    fontSize: 16,
    fontWeight: '600' as TextStyle['fontWeight'],
    lineHeight: 22,
  },
  /** Body text — 14sp */
  body: {
    fontFamily,
    fontSize: 14,
    fontWeight: '400' as TextStyle['fontWeight'],
    lineHeight: 20,
  },
  /** Metadata, timestamps — 12sp */
  caption: {
    fontFamily,
    fontSize: 12,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 16,
  },
  /** Overlines, status labels — 11sp, uppercase */
  tiny: {
    fontFamily,
    fontSize: 11,
    fontWeight: '600' as TextStyle['fontWeight'],
    letterSpacing: 0.4,
    textTransform: 'uppercase' as TextStyle['textTransform'],
    lineHeight: 14,
  },
  /** Monospace for barcodes, SKUs */
  mono: {
    fontFamily: fontFamilyMono,
    fontSize: 13,
    fontWeight: '500' as TextStyle['fontWeight'],
    lineHeight: 18,
  },
} as const;
