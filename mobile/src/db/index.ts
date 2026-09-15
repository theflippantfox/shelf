import {open} from '@op-engineering/op-sqlite';
import {drizzle} from 'drizzle-orm/op-sqlite';
import * as schema from './schema';

// Open the database synchronously
const opsqliteDb = open({
  name: 'shelf_local.sqlite',
});

// Initialize Drizzle ORM
export const db = drizzle(opsqliteDb, {schema});

// Simple schema creation (since we are not using full drizzle-kit generate here for speed)
export const initDb = async () => {
  try {
    await opsqliteDb.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sku TEXT NOT NULL,
        barcode TEXT,
        price REAL NOT NULL,
        cost_price REAL NOT NULL,
        qty INTEGER NOT NULL,
        unit TEXT NOT NULL,
        category_id TEXT,
        image_url TEXT,
        track_stock INTEGER NOT NULL,
        track_barcode INTEGER NOT NULL,
        low_stock_threshold INTEGER NOT NULL DEFAULT 0,
        shop_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        archived_at TEXT,
        description TEXT,
        category_name TEXT,
        category_color TEXT,
        category_icon TEXT
      );
    `);

    await opsqliteDb.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        sort_order INTEGER NOT NULL,
        shop_id TEXT NOT NULL,
        archived_at TEXT
      );
    `);

    await opsqliteDb.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        notes TEXT,
        outstanding_balance REAL NOT NULL DEFAULT 0,
        total_spent REAL NOT NULL DEFAULT 0,
        visit_count INTEGER NOT NULL DEFAULT 0,
        last_visit TEXT,
        shop_id TEXT NOT NULL
      );
    `);

    await opsqliteDb.execute(`
      CREATE TABLE IF NOT EXISTS sales (
        id TEXT PRIMARY KEY,
        sale_ref TEXT NOT NULL,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        voided_at TEXT,
        created_at TEXT NOT NULL,
        customer_id TEXT,
        customer_name TEXT,
        customer_phone TEXT
      );
    `);

    await opsqliteDb.execute(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        action TEXT NOT NULL,
        entity TEXT NOT NULL,
        payload TEXT NOT NULL,
        created_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        error_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0
      );
    `);
    console.log('[DB] initDb complete');
  } catch (error) {
    console.error('[DB] Failed to init tables', error);
  }
};
