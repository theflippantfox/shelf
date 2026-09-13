/**
 * Shared helpers for analytics pages.
 * Single source of truth for trend/margin color logic.
 */
import { ArrowUp, ArrowDown, Minus } from "lucide-svelte";

// ── Margin colors ────────────────────────────────────────────────────────────

export function marginTone(margin: number | null | undefined): string {
 if (margin == null) return "text-[var(--text-3)]";
 if (margin >= 30) return "text-[var(--teal-fg)]";
 if (margin >= 15) return "text-[var(--gold-fg)]";
 return "text-[var(--crimson-fg)]";
}

export function marginBg(margin: number | null | undefined): string {
 if (margin == null) return "var(--surface2)";
 if (margin >= 30) return "var(--teal-dim)";
 if (margin >= 15) return "var(--gold-dim)";
 return "var(--crimson-dim)";
}

export function marginHex(margin: number): string {
 if (margin >= 30) return "var(--teal)";
 if (margin >= 15) return "var(--gold)";
 return "var(--crimson)";
}

// ── Trend helpers ────────────────────────────────────────────────────────────

export type TrendDir = "up" | "down" | "flat" | undefined;

export function trendArrow(d: TrendDir) {
 if (d === "up") return ArrowUp;
 if (d === "down") return ArrowDown;
 return Minus;
}

export function trendTone(d: TrendDir): string {
 if (d === "up") return "var(--teal-fg)";
 if (d === "down") return "var(--crimson-fg)";
 return "var(--text-3)";
}

export function trendBg(d: TrendDir): string {
 if (d === "up") return "var(--teal-dim)";
 if (d === "down") return "var(--crimson-dim)";
 return "var(--surface2)";
}
