/**
 * Spacing scale — 4pt-based, matching Tailwind's scale conceptually.
 * Ported from the web app and Flutter design guide.
 */

export const spacing = {
  /** 4pt — icon-to-label gap */
  xs: 4,
  /** 8pt — inline chip gaps */
  sm: 8,
  /** 12pt — default component gap */
  md: 12,
  /** 16pt — card padding, list item padding */
  lg: 16,
  /** 20pt — screen edge padding (mobile) */
  xl: 20,
  /** 24pt — section separation */
  xxl: 24,
  /** 32pt */
  xxxl: 32,
} as const;
