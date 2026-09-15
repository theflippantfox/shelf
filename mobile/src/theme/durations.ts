/**
 * Duration tokens — animation timing.
 * Ported from the web app's transition-fast/base/slow.
 *
 * Includes a helper to respect reduced motion preferences.
 */

import {AccessibilityInfo} from 'react-native';

export const durations = {
  /** 120ms — tap feedback, focus rings */
  fast: 120,
  /** 200ms — sheet/modal open, tab switches */
  base: 200,
  /** 350ms — screen transitions, sheet slide */
  slow: 350,
} as const;

/**
 * Returns the appropriate duration, respecting reduced motion.
 * Check once at app startup and cache the result.
 */
let _reduceMotion = false;

export async function initMotionPreferences(): Promise<void> {
  try {
    _reduceMotion = await AccessibilityInfo.isReduceMotionEnabled();
    AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => {
      _reduceMotion = enabled;
    });
  } catch {
    // Fallback: assume no reduction
    _reduceMotion = false;
  }
}

export function isReduceMotionEnabled(): boolean {
  return _reduceMotion;
}

/**
 * Returns duration in ms, zero if reduce motion is enabled.
 */
export function appDuration(base: number): number {
  return _reduceMotion ? 0 : base;
}
