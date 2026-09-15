/**
 * Theme barrel export — single import for all design tokens.
 */

export {ACCENTS, CATEGORY_COLORS} from './colors';
export type {AccentName, AppAccent} from './colors';
export {PALETTES, DEFAULT_PALETTE, getPalette} from './palettes';
export type {Palette, Tokens} from './palettes';
export {typeScale} from './typography';
export {spacing} from './spacing';
export {radii} from './radii';
export {shadows} from './shadows';
export {
  durations,
  appDuration,
  initMotionPreferences,
  isReduceMotionEnabled,
} from './durations';
