/**
 * Semantic accent colors — shared across all palettes.
 * Each accent has base, dim (for chip/badge fills), and fg (text on base).
 * Ported from the web app's accent system.
 */

export interface AppAccent {
  base: string;
  dim: string;
  fg: string;
}

export const ACCENTS = {
  gold: {
    base: '#E8A317',
    dim: '#fff3d6',
    fg: '#6b4c00',
  },
  cobalt: {
    base: '#2D6BFF',
    dim: '#e1ebff',
    fg: '#002b99',
  },
  crimson: {
    base: '#E53572',
    dim: '#ffe1ec',
    fg: '#8a0a2e',
  },
  teal: {
    base: '#00B894',
    dim: '#d3f7ee',
    fg: '#05443d',
  },
  violet: {
    base: '#7C4DFF',
    dim: '#ece4ff',
    fg: '#3a1aaa',
  },
  lime: {
    base: '#84CC16',
    dim: '#ecfccb',
    fg: '#3a5a08',
  },
} as const;

export type AccentName = keyof typeof ACCENTS;

/**
 * Category colors — 40-color palette for product categories.
 * Ported from the web app's category color system.
 */
export const CATEGORY_COLORS = [
  // Purple & Pink
  '#7B4F8A',
  '#9333EA',
  '#C026D3',
  '#EC4899',
  '#F472B6',
  // Blue
  '#2563EB',
  '#3B82F6',
  '#0EA5E9',
  '#06B6D4',
  '#14B8A6',
  // Green
  '#10B981',
  '#22C55E',
  '#84CC16',
  '#65A30D',
  '#059669',
  // Yellow & Orange
  '#F59E0B',
  '#F97316',
  '#EF4444',
  '#DC2626',
  '#EA580C',
  // Red & Crimson
  '#BE123C',
  '#E11D48',
  '#F43F5E',
  '#FB7185',
  '#C03868',
  // Brown & Earth
  '#92400E',
  '#B45309',
  '#D97706',
  '#78350F',
  '#B85430',
  // Teal & Cyan
  '#0D9488',
  '#0E7490',
  '#0891B2',
  '#0D7A6E',
  '#164E63',
  // Gray & Slate
  '#475569',
  '#64748B',
  '#94A3B8',
  '#71717A',
  '#52525B',
  // Indigo & Violet
  '#4F46E5',
  '#6366F1',
  '#7C3AED',
  '#8B5CF6',
  '#A855F7',
];
