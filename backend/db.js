// db.js — File 1 of the backend. Only job: the database.
// It creates the file backend/data/payitforward.db (SQLite, real, saved on disk),
// creates the tables, and seeds 4 restaurants + 1 admin account the first time.
// It does NOT serve web pages. server.js will import { db } from here.

const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// Make sure backend/data/ exists, then open (or create) the database file.
// On Vercel serverless the disk is read-only except /tmp, and each function
// instance gets its own /tmp — so the DB there is per-instance and resets
// when Vercel spins a new instance. Fine for a contest demo, NOT for real
// multi-user data. Locally it stays in backend/data/ as before.
const dataDir = process.env.VERCEL ? '/tmp/pifm-data' : path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'payitforward.db'));

// users: one row per account. password_hash is scrambled, never the real password.
// role: 'donor' | 'staff' | 'admin'. staff rows also carry restaurant_id (their one restaurant).
// restaurants: verified = 1 means public on the Finder, 0 means hidden until admin approves.
// donations: one row per donation. served_qty counts how many of them have been served.
// served_meals: ONLY restaurant + time. Deliberately NO recipient name/photo/CNIC/reason.
// notifications: one row per "Your meal was served" message, linked to the donor.
// restaurant_requests: public "Join as Restaurant" forms, status pending/approved/rejected.
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('donor','staff','admin')),
  restaurant_id INTEGER, language TEXT DEFAULT 'en', show_name INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS restaurants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, area TEXT NOT NULL, meal TEXT, timings TEXT,
  verified INTEGER DEFAULT 0, available INTEGER DEFAULT 0, served INTEGER DEFAULT 0, meal_price_pkr INTEGER DEFAULT 250,
  contact_person TEXT, created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS donations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_id INTEGER NOT NULL REFERENCES users(id),
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  quantity INTEGER NOT NULL, served_qty INTEGER DEFAULT 0,
  method TEXT, payment_status TEXT DEFAULT 'test_paid',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS served_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  served_by INTEGER REFERENCES users(id),
  served_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  donor_id INTEGER NOT NULL REFERENCES users(id),
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  message TEXT NOT NULL, is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS restaurant_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL, area TEXT NOT NULL, meal TEXT, timings TEXT,
  contact_name TEXT, contact_phone TEXT, status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);
`);

// Seed only once: if restaurants already exist, do nothing (so restarts keep your data).
function seed() {
  const count = db.prepare('SELECT COUNT(*) c FROM restaurants').get().c;
  if (count > 0) return;
  const ins = db.prepare('INSERT INTO restaurants (name, area, meal, timings, verified, contact_person) VALUES (?,?,?,?,?,?)');
  ins.run('Sindh Biryani House', 'Bhittaibad', 'Chicken Biryani + Raita', '12:00 PM - 10:00 PM', 1, 'Restaurant owner');
  db.prepare('UPDATE restaurants SET meal_price_pkr=300 WHERE name=?').run('Sindh Biryani House');
  db.prepare('UPDATE restaurants SET meal_price_pkr=280 WHERE name=?').run('Al-Madina Foods');
  db.prepare('UPDATE restaurants SET meal_price_pkr=200 WHERE name=?').run('New Taste Point');
  ins.run('Mehran Restaurant', 'Sukkur', 'Daal + Roti + Salad', '11:00 AM - 9:00 PM', 1, 'Restaurant owner');
  ins.run('Al-Madina Foods', 'Karachi', 'Vegetable Curry + Rice', '1:00 PM - 11:00 PM', 1, 'Restaurant owner');
  ins.run('New Taste Point', 'Bhittaibad', 'Chicken Karahi + Naan', '12:00 PM - 10:00 PM', 0, 'Restaurant owner');
  // School admin. Change this password before any real use.
  const hash = bcrypt.hashSync('Admin123!', 10);
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?, 'admin')")
    .run('School Admin', 'admin@payitforward.school', hash);
  console.log('Seeded 4 restaurants + admin: admin@payitforward.school / Admin123!');
}
seed();

// Migration for sandbox payments (2026-10-31): older databases created before
// this step have no txn_ref / amount_pkr columns on donations. Add them if missing,
// so a pending sandbox payment can be tracked without deleting existing data.
for (const col of ['txn_ref TEXT', 'amount_pkr INTEGER DEFAULT 0']) {
  const name = col.split(' ')[0];
  const has = db.prepare("SELECT COUNT(*) c FROM pragma_table_info('donations') WHERE name=?").get(name).c;
  if (!has) db.exec(`ALTER TABLE donations ADD COLUMN ${col}`);
}

// Migration for Top-3 features (2026-10-31): per-restaurant price + donor privacy.
// Older DBs have no meal_price_pkr / show_name columns — add them, keep existing data.
for (const [table, col] of [['restaurants', 'meal_price_pkr INTEGER DEFAULT 250'], ['users', 'show_name INTEGER DEFAULT 1']]) {
  const name = col.split(' ')[0];
  const has = db.prepare(`SELECT COUNT(*) c FROM pragma_table_info('${table}') WHERE name=?`).get(name).c;
  if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col}`);
}

// Small helper used by server.js for the Home dashboard.
function stats() {
  const r = db.prepare('SELECT COALESCE(SUM(available),0) available, COALESCE(SUM(served),0) served, COUNT(*) total FROM restaurants WHERE verified=1').get();
  return { donated: r.available + r.served, served: r.served, available: r.available, restaurants: r.total };
}

module.exports = { db, stats };

// If you run "node db.js" on its own, it just proves the database works.
if (require.main === module) {
  console.log('Database OK:', stats());
  console.log('Restaurants:', db.prepare('SELECT id, name, verified FROM restaurants').all());
}
