import {db} from '../db';
import {products, categories, customers, sales, syncQueue} from '../db/schema';
import * as api from './api';
import NetInfo from '@react-native-community/netinfo';
import {eq} from 'drizzle-orm';
import 'react-native-get-random-values';
import {v4 as uuidv4} from 'uuid';

/**
 * Sync Engine - handles offline-first data fetching and background sync.
 */

export async function isOnline() {
  const state = await NetInfo.fetch();
  return state.isConnected && state.isInternetReachable;
}

// ── Refresh helpers (Network to SQLite) ──────────────────────────────────

export async function syncProductsDown(shopId: string) {
  try {
    const freshParts = await api.fetchProducts({limit: 1000}); // simplified
    await db.transaction(async tx => {
      // Clear existing shop products for simplicity, or upsert
      await tx.delete(products).where(eq(products.shop_id, shopId));

      for (const p of freshParts) {
        await tx.insert(products).values({
          id: p.id,
          name: p.name,
          sku: p.sku,
          barcode: p.barcode,
          price: p.price,
          cost_price: p.cost_price,
          qty: p.qty,
          unit: p.unit,
          category_id: p.category_id,
          image_url: p.image_url,
          track_stock: p.track_stock,
          track_barcode: p.track_barcode,
          low_stock_threshold: p.low_stock_threshold,
          shop_id: p.shop_id,
          created_at: p.created_at,
          updated_at: p.updated_at,
          archived_at: p.archived_at,
          description: p.description,
          category_name: p.category?.name,
          category_color: p.category?.color,
          category_icon: p.category?.icon,
        });
      }
    });
  } catch (err) {
    console.warn('[Sync] Sync products failed', err);
  }
}

export async function syncCategoriesDown(shopId: string) {
  try {
    const cats = await api.fetchCategories();
    await db.transaction(async tx => {
      await tx.delete(categories).where(eq(categories.shop_id, shopId));
      for (const c of cats) {
        await tx.insert(categories).values({
          id: c.id,
          name: c.name,
          color: c.color,
          icon: c.icon,
          sort_order: c.sort_order,
          shop_id: c.shop_id,
          archived_at: c.archived_at,
        });
      }
    });
  } catch (err) {
    console.warn('[Sync] Sync categories failed', err);
  }
}

export async function syncCustomersDown(shopId: string) {
  try {
    const custs = await api.fetchCustomers();
    await db.transaction(async tx => {
      await tx.delete(customers).where(eq(customers.shop_id, shopId));
      for (const c of custs) {
        await tx.insert(customers).values({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          notes: c.notes,
          outstanding_balance: c.outstanding_balance,
          total_spent: c.total_spent,
          visit_count: c.visit_count,
          last_visit: c.last_visit,
          shop_id: c.shop_id,
        });
      }
    });
  } catch (err) {
    console.warn('[Sync] Sync customers failed', err);
  }
}

// ── Background Upload (SQLite to Network) ────────────────────────────────

export async function uploadPendingQueue() {
  if (!(await isOnline())) {return;}

  const pending = await db
    .select()
    .from(syncQueue)
    .where(eq(syncQueue.status, 'PENDING'));

  for (const item of pending) {
    try {
      const payload = JSON.parse(item.payload);
      if (item.entity === 'SALE' && item.action === 'CREATE') {
        await api.createSale(payload);
      } else if (item.entity === 'CUSTOMER' && item.action === 'CREATE') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {id, ...rest} = payload;
        await api.createCustomer(rest);
        // Note: in a true offline-first system, we'd map local UUID to remote ID
      }

      // Success, remove from queue
      await db.delete(syncQueue).where(eq(syncQueue.id, item.id));
    } catch (err) {
      console.warn('[Sync] Failed to upload queued item', item.id, err);
      // Mark as error
      await db
        .update(syncQueue)
        .set({
          status: 'ERROR',
          error_message: String(err),
          retry_count: item.retry_count + 1,
        })
        .where(eq(syncQueue.id, item.id));
    }
  }
}

// ── Local Accessors ──────────────────────────────────────────────────────

export async function getLocalProducts(): Promise<api.Product[]> {
  const prods = await db.select().from(products);
  // SAFETY: SQLite rows match API schema structurally
  return prods.map(p => ({
    ...p,
    category: p.category_name
      ? {
          name: p.category_name,
          icon: p.category_icon || 'circle',
          color: p.category_color || '#888',
        }
      : null,
  })) as unknown as api.Product[];
}

export async function getLocalCategories(): Promise<api.Category[]> {
  const cats = await db.select().from(categories).orderBy(categories.sort_order);
  // SAFETY: SQLite rows match API schema structurally
  return cats as unknown as api.Category[];
}

export async function getLocalCustomers(): Promise<api.Customer[]> {
  const custs = await db.select().from(customers);
  // SAFETY: SQLite rows match API schema structurally
  return custs as unknown as api.Customer[];
}

export async function getLocalCustomer(id: string): Promise<api.Customer | null> {
  const res = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  // SAFETY: SQLite row matches API schema structurally
  return res[0] ? (res[0] as unknown as api.Customer) : null;
}

// ── Mutations (Offline-first) ────────────────────────────────────────────

export async function queueOfflineSale(payload: api.CreateSalePayload) {
  // Store locally for display
  await db.insert(sales).values({
    id: uuidv4(),
    sale_ref: `OFFLINE-${Date.now()}`,
    total: payload.total,
    payment_method: payload.payment_method,
    created_at: new Date().toISOString(),
  });

  // Add to queue
  await db.insert(syncQueue).values({
    id: uuidv4(),
    action: 'CREATE',
    entity: 'SALE',
    payload: JSON.stringify(payload),
    created_at: new Date().toISOString(),
  });

  uploadPendingQueue(); // don't await, let it run
}
