import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const books = sqliteTable('books', {
  id: integer('id').primaryKey({ autoIncrement: true }), title: text('title').notNull(), author: text('author').notNull(),
  price: integer('price').notNull(), condition: text('condition').notNull(), status: text('status').notNull().default('available'),
  tone: text('tone').notNull().default('coral'), description: text('description').notNull().default(''), createdAt: text('created_at').notNull(),
});
export const orders = sqliteTable('orders', {
  id: text('id').primaryKey(), code: text('code').notNull().unique(), customerName: text('customer_name').notNull(), facebookProfile: text('facebook_profile').notNull(),
  phone: text('phone').notNull(), deliveryMethod: text('delivery_method').notNull(), address: text('address').notNull().default(''), notes: text('notes').notNull().default(''),
  total: integer('total').notNull().default(0), status: text('status').notNull().default('pending_payment'), createdAt: text('created_at').notNull(),
});
export const orderItems = sqliteTable('order_items', { id: integer('id').primaryKey({ autoIncrement:true }), orderId: text('order_id').notNull(), bookId: integer('book_id').notNull().unique(), price: integer('price').notNull() });
export const settings = sqliteTable('settings', { key: text('key').primaryKey(), value: text('value').notNull() });
