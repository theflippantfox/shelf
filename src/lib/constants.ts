/**
 * Shared constants for roles, statuses, payment methods, and destinations.
 * Extract magic strings from API routes here so they're defined once.
 */

// ── Roles ──────────────────────────────────────────────────────────────
export const ROLES = {
 OWNER: "owner",
 MANAGER: "manager",
 CASHIER: "cashier",
 INVENTORY_MANAGER: "inventory_manager",
} as const;

export type ShopRole = (typeof ROLES)[keyof typeof ROLES];

/** All roles that can manage users/settings. */
export const ADMIN_ROLES = [ROLES.OWNER, ROLES.MANAGER];

type AllowedRole = "owner" | "manager" | "cashier";

/** Roles that can operate the cash register. */
export const CASHIER_CAPABLE_ROLES: AllowedRole[] = [
 ROLES.OWNER,
 ROLES.MANAGER,
 ROLES.CASHIER,
];

// ── Purchase order statuses ────────────────────────────────────────────
export const PO_STATUS = {
 PENDING: "pending",
 PARTIAL: "partial",
 RECEIVED: "received",
 CANCELLED: "cancelled",
} as const;

export type PoStatus = (typeof PO_STATUS)[keyof typeof PO_STATUS];

// ── Credit / payment statuses ──────────────────────────────────────────
export const CREDIT_STATUS = {
 PAID: "paid",
 PARTIAL: "partial",
 PENDING: "pending",
} as const;

export type CreditStatus = (typeof CREDIT_STATUS)[keyof typeof CREDIT_STATUS];

// ── Payment methods ────────────────────────────────────────────────────
export const PAYMENT_METHOD = {
 CASH: "cash",
 BANK: "bank",
 CREDIT: "credit",
 CREDIT_NOTE: "credit_note",
 ADJUSTMENT: "adjustment",
 NONE: "none",
} as const;

export type PaymentMethod =
 (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

/** Payment methods accepted on purchase order payments. */
export const PO_PAYMENT_METHODS: PaymentMethod[] = [
 PAYMENT_METHOD.CASH,
 PAYMENT_METHOD.BANK,
 PAYMENT_METHOD.CREDIT,
 PAYMENT_METHOD.ADJUSTMENT,
];

/** Payment methods accepted on sale refunds. */
export const REFUND_METHODS: PaymentMethod[] = [
 PAYMENT_METHOD.CASH,
 PAYMENT_METHOD.BANK,
 PAYMENT_METHOD.CREDIT_NOTE,
 PAYMENT_METHOD.NONE,
];

// ── Cash register destinations ─────────────────────────────────────────
export const DESTINATION = {
 COUNTER: "counter",
 BANK: "bank",
} as const;

export type Destination = (typeof DESTINATION)[keyof typeof DESTINATION];

/** Map payment method → cash register destination. */
export function paymentDestination(method: PaymentMethod): Destination | null {
 if (method === PAYMENT_METHOD.CASH) return DESTINATION.COUNTER;
 if (method === PAYMENT_METHOD.BANK) return DESTINATION.BANK;
 return null;
}

// ── Cash register entry types ──────────────────────────────────────────
export const ENTRY_TYPE = {
 SALE: "sale",
 INJECTION: "injection",
 WITHDRAWAL: "withdrawal",
 ADJUSTMENT: "adjustment",
 TRANSFER: "transfer",
 REFUND: "refund",
 PURCHASE: "purchase",
} as const;

export type EntryType = (typeof ENTRY_TYPE)[keyof typeof ENTRY_TYPE];
