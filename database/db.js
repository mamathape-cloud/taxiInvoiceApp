import * as SQLite from 'expo-sqlite';

const DB_NAME = 'taxi_invoice.db';

let dbInstance = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbInstance;
}

export async function initDB() {
  const db = await getDb();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS company (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      company_name TEXT NOT NULL,
      logo TEXT,
      signature TEXT,
      address TEXT,
      phone TEXT,
      email TEXT
    );
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT
    );
    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_number TEXT NOT NULL UNIQUE,
      date TEXT NOT NULL,
      customer_id INTEGER,
      customer_name TEXT NOT NULL,
      driver_name TEXT,
      description TEXT,
      amount REAL NOT NULL,
      received_amount REAL NOT NULL,
      balance_amount REAL NOT NULL,
      payment_status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (customer_id) REFERENCES customers (id)
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices (date);
    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers (name);
  `);
}

export async function hasCompanySetup() {
  const db = await getDb();
  const row = await db.getFirstAsync(
    'SELECT COUNT(*) AS c FROM company WHERE id = 1 AND company_name IS NOT NULL AND TRIM(company_name) != ""'
  );
  return (row?.c ?? 0) > 0;
}

export async function getCompany() {
  const db = await getDb();
  return await db.getFirstAsync('SELECT * FROM company WHERE id = 1');
}

export async function saveCompany({ company_name, logo, signature, address, phone, email }) {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO company (id, company_name, logo, signature, address, phone, email)
     VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       company_name = excluded.company_name,
       logo = excluded.logo,
       signature = excluded.signature,
       address = excluded.address,
       phone = excluded.phone,
       email = excluded.email`,
    company_name,
    logo ?? null,
    signature ?? null,
    address ?? '',
    phone ?? '',
    email ?? ''
  );
}

export async function insertCustomer({ name, address, phone }) {
  const db = await getDb();
  const r = await db.runAsync(
    'INSERT INTO customers (name, address, phone) VALUES (?, ?, ?)',
    name.trim(),
    (address ?? '').trim(),
    (phone ?? '').trim()
  );
  return r.lastInsertRowId;
}

export async function updateCustomer(id, { name, address, phone }) {
  const db = await getDb();
  await db.runAsync(
    'UPDATE customers SET name = ?, address = ?, phone = ? WHERE id = ?',
    name.trim(),
    (address ?? '').trim(),
    (phone ?? '').trim(),
    id
  );
}

export async function deleteCustomer(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM customers WHERE id = ?', id);
}

export async function getCustomers(search = '') {
  const db = await getDb();
  const q = `%${search.trim()}%`;
  if (!search.trim()) {
    return await db.getAllAsync(
      'SELECT * FROM customers ORDER BY name COLLATE NOCASE ASC'
    );
  }
  return await db.getAllAsync(
    `SELECT * FROM customers
     WHERE name LIKE ? OR phone LIKE ? OR address LIKE ?
     ORDER BY name COLLATE NOCASE ASC`,
    q,
    q,
    q
  );
}

export async function getCustomerById(id) {
  const db = await getDb();
  return await db.getFirstAsync('SELECT * FROM customers WHERE id = ?', id);
}

async function nextInvoiceNumber(db) {
  const row = await db.getFirstAsync(
    `SELECT invoice_number FROM invoices
     ORDER BY CAST(SUBSTR(invoice_number, 5) AS INTEGER) DESC, id DESC LIMIT 1`
  );
  if (!row?.invoice_number) return 'INV-0001';
  const m = String(row.invoice_number).match(/INV-(\d+)/i);
  const n = m ? parseInt(m[1], 10) : 0;
  const next = n + 1;
  return `INV-${String(next).padStart(4, '0')}`;
}

export async function insertInvoice({
  date,
  customer_id,
  customer_name,
  driver_name,
  description,
  amount,
  received_amount,
}) {
  const db = await getDb();
  const amt = Number(amount);
  const rec = Number(received_amount);
  const balance = Math.max(0, amt - rec);
  const payment_status = rec < amt ? 'PARTIAL' : 'FULL';
  const created_at = new Date().toISOString();

  return await db.withExclusiveTransactionAsync(async (txn) => {
    const invoice_number = await nextInvoiceNumber(txn);
    const r = await txn.runAsync(
      `INSERT INTO invoices (
        invoice_number, date, customer_id, customer_name, driver_name, description,
        amount, received_amount, balance_amount, payment_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      invoice_number,
      date,
      customer_id ?? null,
      customer_name.trim(),
      (driver_name ?? '').trim(),
      description ?? '',
      amt,
      rec,
      balance,
      payment_status,
      created_at
    );
    const id = r.lastInsertRowId;
    return { id, invoice_number };
  });
}

export async function getInvoiceById(id) {
  const db = await getDb();
  return await db.getFirstAsync('SELECT * FROM invoices WHERE id = ?', id);
}

/** Invoice row plus customer phone for preview (from customers when linked). */
export async function getInvoiceByIdWithDetails(id) {
  const db = await getDb();
  return await db.getFirstAsync(
    `SELECT i.*, c.phone AS customer_phone
     FROM invoices i
     LEFT JOIN customers c ON i.customer_id = c.id
     WHERE i.id = ?`,
    id
  );
}

export async function getAllInvoices() {
  const db = await getDb();
  return await db.getAllAsync('SELECT * FROM invoices ORDER BY date DESC, id DESC');
}

export async function getInvoicesByDate(date) {
  const db = await getDb();
  return await db.getAllAsync(
    'SELECT * FROM invoices WHERE date = ? ORDER BY id DESC',
    date
  );
}

export async function getInvoicesInRange(startDate, endDate) {
  const db = await getDb();
  return await db.getAllAsync(
    'SELECT * FROM invoices WHERE date >= ? AND date <= ? ORDER BY date ASC, id ASC',
    startDate,
    endDate
  );
}

async function aggregatePeriod(db, startDate, endDate) {
  const summary = await db.getFirstAsync(
    `SELECT
       IFNULL(SUM(amount), 0) AS total_revenue,
       COUNT(*) AS trip_count
     FROM invoices WHERE date >= ? AND date <= ?`,
    startDate,
    endDate
  );
  const byDriver = await db.getAllAsync(
    `SELECT
       COALESCE(NULLIF(TRIM(driver_name), ''), 'Unspecified') AS driver_name,
       IFNULL(SUM(amount), 0) AS revenue,
       COUNT(*) AS trips
     FROM invoices
     WHERE date >= ? AND date <= ?
     GROUP BY COALESCE(NULLIF(TRIM(driver_name), ''), 'Unspecified')
     ORDER BY revenue DESC`,
    startDate,
    endDate
  );
  return {
    total_revenue: summary?.total_revenue ?? 0,
    trip_count: summary?.trip_count ?? 0,
    by_driver: byDriver ?? [],
  };
}

export async function getDailyReport(date) {
  const db = await getDb();
  return aggregatePeriod(db, date, date);
}

export async function getMonthlyReport(year, month) {
  const db = await getDb();
  const m = String(month).padStart(2, '0');
  const start = `${year}-${m}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${m}-${String(lastDay).padStart(2, '0')}`;
  return aggregatePeriod(db, start, end);
}

export async function getYearlyReport(year) {
  const db = await getDb();
  const start = `${year}-01-01`;
  const end = `${year}-12-31`;
  return aggregatePeriod(db, start, end);
}

export async function updateInvoice(id, fields) {
  const db = await getDb();
  const {
    date,
    customer_id,
    customer_name,
    driver_name,
    description,
    amount,
    received_amount,
  } = fields;
  const amt = Number(amount);
  const rec = Number(received_amount);
  const balance = Math.max(0, amt - rec);
  const payment_status = rec < amt ? 'PARTIAL' : 'FULL';
  await db.runAsync(
    `UPDATE invoices SET
      date = ?, customer_id = ?, customer_name = ?, driver_name = ?, description = ?,
      amount = ?, received_amount = ?, balance_amount = ?, payment_status = ?
     WHERE id = ?`,
    date,
    customer_id ?? null,
    customer_name.trim(),
    (driver_name ?? '').trim(),
    description ?? '',
    amt,
    rec,
    balance,
    payment_status,
    id
  );
}

export async function deleteInvoice(id) {
  const db = await getDb();
  await db.runAsync('DELETE FROM invoices WHERE id = ?', id);
}
