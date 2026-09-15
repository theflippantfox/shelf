import {sqliteTable, text, integer, real} from 'drizzle-orm/sqlite-core';

export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').notNull(),
  barcode: text('barcode'),
  price: real('price').notNull(),
  cost_price: real('cost_price').notNull(),
  qty: integer('qty').notNull(),
  unit: text('unit').notNull(),
  category_id: text('category_id'),
  image_url: text('image_url'),
  track_stock: integer('track_stock', {mode: 'boolean'}).notNull(),
  track_barcode: integer('track_barcode', {mode: 'boolean'}).notNull(),
  low_stock_threshold: integer('low_stock_threshold').notNull().default(0),
  shop_id: text('shop_id').notNull(),
  created_at: text('created_at').notNull(),
  updated_at: text('updated_at').notNull(),
  archived_at: text('archived_at'),
  description: text('description'),
  // We'll store category name as simple text for offline layout
  category_name: text('category_name'),
  category_color: text('category_color'),
  category_icon: text('category_icon'),
});

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').notNull(),
  color: text('color').notNull(),
  sort_order: integer('sort_order').notNull(),
  shop_id: text('shop_id').notNull(),
  archived_at: text('archived_at'),
});

export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  notes: text('notes'),
  outstanding_balance: real('outstanding_balance').notNull().default(0),
  total_spent: real('total_spent').notNull().default(0),
  visit_count: integer('visit_count').notNull().default(0),
  last_visit: text('last_visit'),
  shop_id: text('shop_id').notNull(),
});

export const sales = sqliteTable('sales', {
  id: text('id').primaryKey(),
  sale_ref: text('sale_ref').notNull(),
  total: real('total').notNull(),
  payment_method: text('payment_method').notNull(),
  voided_at: text('voided_at'),
  created_at: text('created_at').notNull(),
  customer_id: text('customer_id'),
  customer_name: text('customer_name'), // Cached for offline views
  customer_phone: text('customer_phone'),
});

// A sync_queue to track local mutated resources needing upload
export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(), // uuid
  action: text('action', {enum: ['CREATE', 'UPDATE', 'DELETE']}).notNull(),
  entity: text('entity', {enum: ['PRODUCT', 'CUSTOMER', 'SALE']}).notNull(),
  payload: text('payload').notNull(), // JSON
  created_at: text('created_at').notNull(),
  status: text('status', {enum: ['PENDING', 'ERROR']})
    .notNull()
    .default('PENDING'),
  error_message: text('error_message'),
  retry_count: integer('retry_count').notNull().default(0),
});
