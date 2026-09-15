/**
 * API client for Shëlf POS.
 *
 * Talks to the SvelteKit web app's /api/* routes using Bearer token auth.
 * The web app detects the Authorization header and creates a Supabase client
 * from the JWT instead of cookies.
 */

// ── Config ────────────────────────────────────────────────────────────────

// Development: point to your local network or deployed web app.
// Production: change this to your actual domain.
const API_BASE = 'http://10.232.3.145:5173';

// ── Token storage ─────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'shelf_access_token';
const REFRESH_KEY = 'shelf_refresh_token';
const TOKEN_EXPIRES_KEY = 'shelf_token_expires_at';
const SHOP_ID_KEY = 'shelf_current_shop_id';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  user: {id: string; email: string};
}

export async function storeTokens(tokens: AuthTokens): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, tokens.access_token],
    [REFRESH_KEY, tokens.refresh_token],
    [TOKEN_EXPIRES_KEY, String(tokens.expires_at)],
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([
    TOKEN_KEY,
    REFRESH_KEY,
    TOKEN_EXPIRES_KEY,
    SHOP_ID_KEY,
  ]);
}

export async function getCurrentShopId(): Promise<string | null> {
  return AsyncStorage.getItem(SHOP_ID_KEY);
}

export async function setCurrentShopId(shopId: string): Promise<void> {
  await AsyncStorage.setItem(SHOP_ID_KEY, shopId);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiOptions {
  method?: Method;
  body?: unknown;
  shopId?: string | null;
  noAuth?: boolean;
}

class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const {method = 'GET', body, shopId, noAuth} = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!noAuth) {
    const token = await getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  // Shop ID from param, or from stored selection
  const sid = shopId ?? (noAuth ? null : await getCurrentShopId());
  if (sid) {
    headers['x-shop-id'] = sid;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && typeof data === 'object' && 'error' in data
        ? (data as {error: string}).error
        : null) ?? `API error ${res.status}`;
    throw new ApiError(res.status, msg, data);
  }

  return data as T;
}

// ── Auth API ──────────────────────────────────────────────────────────────

export interface LoginResult {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at: number;
  user: {id: string; email: string};
}

export interface RegisterResult {
  ok: boolean;
  userId: string;
  warning?: string;
}

export interface Shop {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  // Locale
  country_code: string;
  currency_code: string;
  currency_symbol: string;
  currency_locale: string;
  timezone: string;
  date_format: string;
  time_format: '12h' | '24h';
  // Tax
  tax_rate: number;
  tax_name: string;
  tax_inclusive: boolean;
  // Theme
  theme: string;
  palette_id: string;
  primary_color: string;
  sidebar_bg: string;
  // Receipt
  receipt_header: string | null;
  receipt_footer: string | null;
  // Misc
  low_stock_threshold: number;
  onboarding_complete: boolean;
  onboarding_step: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
}

export interface ShopMember {
  id: string;
  shop_id: string;
  user_id: string;
  role: string;
  status: string;
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResult> {
  const result = await apiFetch<LoginResult>('/api/auth/token', {
    method: 'POST',
    body: {email, password},
    noAuth: true,
  });
  await storeTokens(result);
  return result;
}

export async function register(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
): Promise<RegisterResult> {
  return apiFetch<RegisterResult>('/api/auth/register', {
    method: 'POST',
    body: {first_name: firstName, last_name: lastName, email, password},
    noAuth: true,
  });
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/api/auth', {method: 'DELETE'});
  } catch {
    // Ignore logout errors — clear local state regardless
  }
  await clearTokens();
}

export async function fetchMyShops(): Promise<Shop[]> {
  return apiFetch<Shop[]>('/api/auth/my-shops');
}

export async function selectShop(shopId: string): Promise<void> {
  await apiFetch('/api/auth/select-shop', {
    method: 'POST',
    body: {shop_id: shopId},
  });
  await setCurrentShopId(shopId);
}

// ── Products API ──────────────────────────────────────────────────────────

export interface Product {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: number;
  cost_price: number;
  qty: number;
  unit: string;
  category_id: string | null;
  image_url: string | null;
  track_stock: boolean;
  track_barcode: boolean;
  low_stock_threshold: number;
  shop_id: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  description: string | null;
  category?: Category | null;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  shop_id: string;
  archived_at: string | null;
}

export async function fetchProducts(params?: {
  category_id?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Product[]> {
  const parts: string[] = [];
  if (params?.category_id) {
    parts.push(`category=${encodeURIComponent(params.category_id)}`);
  }
  if (params?.search) {
    parts.push(`search=${encodeURIComponent(params.search)}`);
  }
  if (params?.limit) {
    parts.push(`limit=${params.limit}`);
  }
  if (params?.offset) {
    parts.push(
      `page=${Math.floor((params.offset ?? 0) / (params.limit ?? 50)) + 1}`,
    );
  }
  const qs = parts.join('&');
  const res = await apiFetch<{data: Product[]; meta: Record<string, unknown>}>(
    `/api/products${qs ? `?${qs}` : ''}`,
  );
  return res.data ?? [];
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiFetch<{data: Category[]; meta: Record<string, unknown>}>(
    '/api/categories',
  );
  return res.data ?? [];
}

export async function fetchProductByBarcode(barcode: string): Promise<Product> {
  return apiFetch<Product>(
    `/api/products/by-barcode/${encodeURIComponent(barcode)}`,
  );
}

export async function createProduct(data: {
  name: string;
  sku: string;
  price: number;
  cost_price?: number;
  qty?: number;
  unit?: string;
  category_id?: string | null;
  description?: string | null;
  track_stock?: boolean;
  track_barcode?: boolean;
  low_stock_threshold?: number | null;
  barcode?: string | null;
}): Promise<Product> {
  return apiFetch<Product>('/api/products', {method: 'POST', body: data});
}

export async function updateProduct(
  id: string,
  data: {
    name?: string;
    sku?: string;
    price?: number;
    cost_price?: number;
    qty?: number;
    unit?: string;
    category_id?: string | null;
    description?: string | null;
    track_stock?: boolean;
    track_barcode?: boolean;
    low_stock_threshold?: number | null;
    barcode?: string | null;
  },
): Promise<Product> {
  return apiFetch<Product>(`/api/products/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await apiFetch(`/api/products/${id}`, {method: 'DELETE'});
}

// ── Sales API ─────────────────────────────────────────────────────────────

export interface SaleItem {
  productId: string;
  name: string;
  sku: string;
  qty: number;
  unitPrice: number;
}

export interface Sale {
  id: string;
  sale_ref: string;
  total: number;
  payment_method: string;
  voided_at: string | null;
  created_at: string;
  customer?: {id: string; name: string; phone: string | null} | null;
  served_by?: {first_name: string; last_name: string} | null;
}

export interface CreateSalePayload {
  items: SaleItem[];
  subtotal: number;
  tax_amount: number;
  total: number;
  discount_type: string;
  discount_value: number;
  discount_amount: number;
  payment_method: string;
  customer_id?: string;
  notes?: string;
  served_by?: string;
}

export async function createSale(payload: CreateSalePayload): Promise<Sale> {
  return apiFetch<Sale>('/api/sales', {method: 'POST', body: payload});
}

export async function fetchSales(params?: {
  limit?: number;
  offset?: number;
  date_from?: string;
  date_to?: string;
}): Promise<Sale[]> {
  const parts: string[] = [];
  if (params?.limit) {
    parts.push(`limit=${params.limit}`);
  }
  if (params?.offset) {
    parts.push(
      `page=${Math.floor((params.offset ?? 0) / (params.limit ?? 50)) + 1}`,
    );
  }
  if (params?.date_from) {
    parts.push(`from=${encodeURIComponent(params.date_from)}`);
  }
  if (params?.date_to) {
    parts.push(`to=${encodeURIComponent(params.date_to)}`);
  }
  const qs = parts.join('&');
  return apiFetch<Sale[]>(`/api/sales${qs ? `?${qs}` : ''}`);
}

// ── Customers API ─────────────────────────────────────────────────────────

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  outstanding_balance: number;
  total_spent: number;
  visit_count: number;
  last_visit: string | null;
  shop_id: string;
}

export async function fetchCustomers(): Promise<Customer[]> {
  const res = await apiFetch<{data: Customer[]; meta: Record<string, unknown>}>(
    '/api/customers',
  );
  return res.data ?? [];
}

export async function fetchCustomerById(id: string): Promise<Customer> {
  return apiFetch<Customer>(`/api/customers/${id}`);
}

export async function updateCustomer(
  id: string,
  data: {name?: string; phone?: string; email?: string; notes?: string},
): Promise<Customer> {
  return apiFetch<Customer>(`/api/customers/${id}`, {
    method: 'PATCH',
    body: data,
  });
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiFetch(`/api/customers/${id}`, {method: 'DELETE'});
}

export async function createCustomer(data: {
  name: string;
  phone?: string;
  email?: string;
  notes?: string;
}): Promise<Customer> {
  return apiFetch<Customer>('/api/customers', {method: 'POST', body: data});
}

// ── Cash Register API ─────────────────────────────────────────────────────

export interface RegisterBalance {
  destination: string;
  balance: number;
  total_balance: number;
}

export async function fetchRegisterEntries(params?: {
  limit?: number;
}): Promise<CashEntry[]> {
  const qs = params?.limit ? `?limit=${params.limit}` : '';
  return apiFetch<CashEntry[]>(`/api/cash-register${qs}`);
}

export async function fetchRegisterBalance(): Promise<RegisterBalance[]> {
  const res = await apiFetch<{destinations: RegisterBalance[]; total: number}>(
    '/api/cash-register/balance',
  );
  return res.destinations ?? [];
}

export interface CashEntry {
  id: string;
  destination: 'counter' | 'bank' | 'other';
  amount: number;
  entry_type:
    | 'sale'
    | 'expense'
    | 'injection'
    | 'adjustment'
    | 'transfer'
    | 'void';
  source: 'sale' | 'void' | 'manual' | 'transfer';
  notes: string;
  created_at: string;
  effective_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_by_profile?: {
    first_name?: string;
    last_name?: string;
  } | null;
}

export async function createCashEntry(data: {
  destination: string;
  amount: number;
  entry_type: string;
  notes?: string;
}): Promise<unknown> {
  return apiFetch('/api/cash-register', {method: 'POST', body: data});
}

// ── Settings / Analytics ──────────────────────────────────────────────────

export interface DailySummary {
  date: string;
  total_sales: number;
  total_transactions: number;
  avg_basket: number;
}

export async function fetchAnalytics(params?: {
  date_from?: string;
  date_to?: string;
}): Promise<DailySummary[]> {
  const parts: string[] = [];
  if (params?.date_from) {
    parts.push(`date_from=${encodeURIComponent(params.date_from)}`);
  }
  if (params?.date_to) {
    parts.push(`date_to=${encodeURIComponent(params.date_to)}`);
  }
  const qs = parts.join('&');
  const res = await apiFetch<{
    analytics: Record<string, unknown>;
    daily?: DailySummary[];
  }>(`/api/analytics${qs ? `?${qs}` : ''}`);
  return (res as any).daily ?? (res.analytics?.daily as DailySummary[]) ?? [];
}

export {ApiError};
