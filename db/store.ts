import { env } from 'cloudflare:workers';

export type Book = {
  id: number; title: string; author: string; price: number; condition: string;
  status: 'available' | 'reserved' | 'sold'; tone: string; description: string;
};

export type Order = {
  id: string; code: string; customer_name: string; facebook_profile: string;
  phone: string; delivery_method: string; address: string; notes: string;
  total: number; status: string; created_at: string; books: string;
};

const starterBooks = [
  ['The Seven Husbands of Evelyn Hugo','Taylor Jenkins Reid',320,'Very good','coral','Clean copy with light shelf wear. No annotations.'],
  ['Before the Coffee Gets Cold','Toshikazu Kawaguchi',280,'Like new','blue','Almost new with a crisp spine and clean pages.'],
  ['The Midnight Library','Matt Haig',300,'Very good','ochre','A tidy copy with a small crease on the back cover.'],
  ['Convenience Store Woman','Sayaka Murata',240,'Good','mint','Loved but well-kept. Minor tanning along page edges.'],
] as const;

let initialized = false;

export async function ensureDatabase() {
  if (initialized) return;
  const db = env.DB;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      price INTEGER NOT NULL CHECK (price >= 0),
      condition TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','reserved','sold')),
      tone TEXT NOT NULL DEFAULT 'coral',
      description TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      facebook_profile TEXT NOT NULL,
      phone TEXT NOT NULL,
      delivery_method TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      total INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment','paid','shipped','completed','cancelled')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT NOT NULL REFERENCES orders(id),
      book_id INTEGER NOT NULL UNIQUE REFERENCES books(id),
      price INTEGER NOT NULL
    )`),
    db.prepare(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_books_status_created ON books(status, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(status, created_at)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id)`),
  ]);
  const count = await db.prepare('SELECT COUNT(*) AS count FROM books').first<{ count: number }>();
  if (!count?.count) {
    await db.batch(starterBooks.map((book) => db.prepare(
      'INSERT INTO books (title,author,price,condition,tone,description) VALUES (?,?,?,?,?,?)'
    ).bind(...book)));
  }
  initialized = true;
}

export async function listBooks(includeUnavailable = true): Promise<Book[]> {
  await ensureDatabase();
  const where = includeUnavailable ? '' : "WHERE status = 'available'";
  const result = await env.DB.prepare(`SELECT id,title,author,price,condition,status,tone,description FROM books ${where} ORDER BY created_at DESC, id DESC`).all<Book>();
  return result.results;
}

export async function createClaim(input: { bookIds: number[]; name: string; facebook: string; phone: string; delivery: string; address: string; notes: string; }) {
  await ensureDatabase();
  const ids = [...new Set(input.bookIds)].filter(Number.isInteger);
  if (!ids.length || ids.length > 20) throw new Error('Choose between 1 and 20 books.');
  const orderId = crypto.randomUUID();
  const code = `READ-${Date.now().toString(36).slice(-5).toUpperCase()}${Math.random().toString(36).slice(2,4).toUpperCase()}`;
  const db = env.DB;
  const statements = [
    db.prepare(`INSERT INTO orders (id,code,customer_name,facebook_profile,phone,delivery_method,address,notes) VALUES (?,?,?,?,?,?,?,?)`).bind(orderId, code, input.name, input.facebook, input.phone, input.delivery, input.address, input.notes),
    ...ids.map((id) => db.prepare(`INSERT INTO order_items (order_id,book_id,price) VALUES (?, (SELECT id FROM books WHERE id = ? AND status = 'available'), (SELECT price FROM books WHERE id = ? AND status = 'available'))`).bind(orderId, id, id)),
    ...ids.map((id) => db.prepare("UPDATE books SET status = 'reserved' WHERE id = ? AND status = 'available'").bind(id)),
    db.prepare('UPDATE orders SET total = (SELECT COALESCE(SUM(price),0) FROM order_items WHERE order_id = ?) WHERE id = ?').bind(orderId, orderId),
  ];
  try { await db.batch(statements); }
  catch { throw new Error('One of those books was just claimed. Refresh and try again.'); }
  return env.DB.prepare('SELECT code,total FROM orders WHERE id = ?').bind(orderId).first<{code:string;total:number}>();
}

export async function ownerEmail() {
  await ensureDatabase();
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'owner_email'").first<{value:string}>();
  return row?.value ?? null;
}

export async function claimOwnership(email: string, code: string) {
  await ensureDatabase();
  const expected = env.OWNER_SETUP_CODE ?? (process.env.NODE_ENV !== 'production' ? 'bookdrop-demo' : '');
  if (!expected || code !== expected) throw new Error('That setup code is not correct.');
  await env.DB.prepare("INSERT OR IGNORE INTO settings (key,value) VALUES ('owner_email',?)").bind(email.toLowerCase()).run();
  return (await ownerEmail()) === email.toLowerCase();
}

export async function listOrders(): Promise<Order[]> {
  await ensureDatabase();
  const result = await env.DB.prepare(`SELECT o.*, GROUP_CONCAT(b.title, ' · ') AS books FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN books b ON b.id = oi.book_id GROUP BY o.id ORDER BY o.created_at DESC`).all<Order>();
  return result.results;
}

export async function addBook(input: Omit<Book,'id'|'status'>) {
  await ensureDatabase();
  await env.DB.prepare(`INSERT INTO books (title,author,price,condition,tone,description) VALUES (?,?,?,?,?,?)`).bind(input.title,input.author,input.price,input.condition,input.tone,input.description).run();
}

export async function setBookStatus(id: number, status: Book['status']) {
  await ensureDatabase();
  await env.DB.prepare('UPDATE books SET status = ? WHERE id = ?').bind(status,id).run();
}

export async function setOrderStatus(id: string, status: string) {
  await ensureDatabase();
  const db = env.DB;
  const bookStatus = status === 'cancelled' ? 'available' : status === 'pending_payment' ? 'reserved' : 'sold';
  await db.batch([
    db.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(status,id),
    db.prepare('UPDATE books SET status = ? WHERE id IN (SELECT book_id FROM order_items WHERE order_id = ?)').bind(bookStatus,id),
  ]);
}
