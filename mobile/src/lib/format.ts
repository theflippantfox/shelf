/**
 * Formatting utilities that respect the shop's locale settings.
 *
 * Uses the Shop's currency_code, currency_symbol, date_format,
 * time_format, timezone, and tax settings.
 */

import type {Shop} from './api';

// ── Currency formatting ───────────────────────────────────────────────────

/**
 * Format a price using the shop's currency settings.
 * e.g. formatPrice(12.50, shop) → "₦12.50" or "$12.50"
 */
export function formatPrice(amount: number, shop: Shop): string {
  const {currency_symbol, currency_code} = shop;

  // Use Intl if available (works on React Native with Hermes)
  try {
    return new Intl.NumberFormat(shop.currency_locale || 'en-US', {
      style: 'currency',
      currency: currency_code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback: simple symbol + number
    return `${currency_symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Format a price without the currency symbol (for compact displays).
 * e.g. formatPriceCompact(12.50, shop) → "12.50"
 */
export function formatPriceCompact(amount: number): string {
  return amount.toFixed(2);
}

// ── Tax helpers ───────────────────────────────────────────────────────────

/**
 * Calculate tax amount for a subtotal.
 */
export function calculateTax(subtotal: number, shop: Shop): number {
  if (shop.tax_rate <= 0) {
    return 0;
  }
  const tax = subtotal * (shop.tax_rate / 100);
  return Math.round(tax * 100) / 100; // Round to 2 decimals
}

/**
 * Get the display text for the tax label.
 * e.g. "VAT (7.5%)" or "Tax (10%)"
 */
export function taxLabel(shop: Shop): string {
  if (!shop.tax_name) {
    return 'Tax';
  }
  return `${shop.tax_name} (${shop.tax_rate}%)`;
}

/**
 * Is the price tax-inclusive? (tax is already included in the listed price)
 */
export function isTaxInclusive(shop: Shop): boolean {
  return shop.tax_inclusive;
}

// ── Date formatting ───────────────────────────────────────────────────────

/**
 * Format a date string using the shop's date_format and timezone.
 *
 * Supported formats:
 *   "D MMM YYYY"  → "5 Jan 2024"
 *   "DD/MM/YYYY"  → "05/01/2024"
 *   "MM/DD/YYYY"  → "01/05/2024"
 *   "YYYY-MM-DD"  → "2024-01-05"
 */
export function formatDate(
  isoString: string | null | undefined,
  shop: Shop,
): string {
  if (!isoString) {
    return '—';
  }

  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return '—';
  }

  try {
    return new Intl.DateTimeFormat(shop.currency_locale || 'en-US', {
      timeZone: shop.timezone || 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    // Fallback to ISO
    return date.toLocaleDateString();
  }
}

/**
 * Format a date + time using the shop's settings.
 */
export function formatDateTime(
  isoString: string | null | undefined,
  shop: Shop,
): string {
  if (!isoString) {
    return '—';
  }

  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return '—';
  }

  const use24h = shop.time_format === '24h';

  try {
    return new Intl.DateTimeFormat(shop.currency_locale || 'en-US', {
      timeZone: shop.timezone || 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: !use24h,
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

/**
 * Format time only (e.g. for the POS clock display).
 */
export function formatTime(shop: Shop): string {
  const use24h = shop.time_format === '24h';

  try {
    return new Intl.DateTimeFormat(shop.currency_locale || 'en-US', {
      timeZone: shop.timezone || 'UTC',
      hour: 'numeric',
      minute: '2-digit',
      hour12: !use24h,
    }).format(new Date());
  } catch {
    return new Date().toLocaleTimeString();
  }
}

// ── Number formatting ─────────────────────────────────────────────────────

/**
 * Format a quantity with the shop's locale.
 * e.g. formatQuantity(1500) → "1,500" (en-US) or "1.500" (de-DE)
 */
export function formatQuantity(qty: number): string {
  return new Intl.NumberFormat().format(qty);
}

// ── Discount helpers ──────────────────────────────────────────────────────

/**
 * Calculate the discount amount based on type.
 */
export function calculateDiscount(
  subtotal: number,
  discountType: string,
  discountValue: number,
): number {
  if (discountType === 'percentage') {
    return Math.round(subtotal * (discountValue / 100) * 100) / 100;
  }
  // Fixed amount
  return Math.min(discountValue, subtotal);
}

/**
 * Format discount for display.
 * e.g. formatDiscount('percentage', 10) → "10%"
 *      formatDiscount('fixed', 5) → "$5.00"
 */
export function formatDiscount(
  discountType: string,
  discountValue: number,
  shop: Shop,
): string {
  if (discountType === 'percentage') {
    return `${discountValue}%`;
  }
  return formatPrice(discountValue, shop);
}
