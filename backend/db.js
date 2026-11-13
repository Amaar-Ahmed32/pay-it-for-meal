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
  role TEXT NOT NULL CHECK(role IN ('donor','staff','admin','owner')),
  restaurant_id INTEGER, staff_role TEXT, photo TEXT, language TEXT DEFAULT 'en', show_name INTEGER DEFAULT 1,
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
  contact_name TEXT, contact_phone TEXT, contact_email TEXT, meals TEXT DEFAULT '[]',
  owner_password_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS restaurant_meals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  name TEXT NOT NULL, price_pkr INTEGER NOT NULL DEFAULT 250,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS meal_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  meals_needed INTEGER NOT NULL DEFAULT 1,
  note TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS serve_receipts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  staff_user_id INTEGER REFERENCES users(id),
  meal_name TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 1,
  price_pkr INTEGER NOT NULL, total_pkr INTEGER NOT NULL,
  served_at TEXT DEFAULT (datetime('now'))
);
`);

// Seed only once: if restaurants already exist, do nothing (so restarts keep your data).
function seed() {
  const count = db.prepare('SELECT COUNT(*) c FROM restaurants').get().c;
  if (count > 0) return;
  const ins = db.prepare('INSERT INTO restaurants (name, area, meal, timings, verified, contact_person) VALUES (?,?,?,?,?,?)');
  ins.run('Sindh Biryani House', 'Bhittaibad', 'Chicken Biryani + Raita', '12:00 PM - 10:00 PM', 1, 'Restaurant owner');
  ins.run('Mehran Restaurant', 'Sukkur', 'Daal + Roti + Salad', '11:00 AM - 9:00 PM', 1, 'Restaurant owner');
  ins.run('Al-Madina Foods', 'Karachi', 'Vegetable Curry + Rice', '1:00 PM - 11:00 PM', 1, 'Restaurant owner');
  ins.run('New Taste Point', 'Bhittaibad', 'Chicken Karahi + Naan', '12:00 PM - 10:00 PM', 0, 'Restaurant owner');
  // Prices AFTER the inserts (an UPDATE before its INSERT silently does nothing —
  // that is why Al-Madina used to seed at Rs 250 instead of Rs 280).
  db.prepare('UPDATE restaurants SET meal_price_pkr=300 WHERE name=?').run('Sindh Biryani House');
  db.prepare('UPDATE restaurants SET meal_price_pkr=280 WHERE name=?').run('Al-Madina Foods');
  db.prepare('UPDATE restaurants SET meal_price_pkr=200 WHERE name=?').run('New Taste Point');
  // School admin. Change this password before any real use.
  const hash = bcrypt.hashSync('Admin123!', 10);
  db.prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?, 'admin')")
    .run('School Admin', 'admin@payitforward.school', hash);
  // Demo restaurant owner for Sindh Biryani House (restaurant id 1).
  // Owners add/remove their own staff from the Restaurant page.
  const ownerHash = bcrypt.hashSync('Owner123!', 10);
  db.prepare("INSERT INTO users (name, email, password_hash, role, restaurant_id) VALUES (?,?,?, 'owner', 1)")
    .run('Sindh Biryani House', 'owner@payitforward.school', ownerHash);
  console.log('Seeded 4 restaurants + admin: admin@payitforward.school / Admin123!');
  console.log('Seeded demo owner: owner@payitforward.school / Owner123! (Sindh Biryani House)');
}
seed();

// Migration for sandbox payments (2026-10-31): older databases created before
// this step have no txn_ref / amount_pkr columns on donations. Add them if missing.
// This runs BEFORE seed() — the demo seed below inserts txn_ref values.
for (const col of ['txn_ref TEXT', 'amount_pkr INTEGER DEFAULT 0']) {
  const name = col.split(' ')[0];
  const has = db.prepare("SELECT COUNT(*) c FROM pragma_table_info('donations') WHERE name=?").get(name).c;
  if (!has) db.exec(`ALTER TABLE donations ADD COLUMN ${col}`);
}

// Demo data (2026-11-10): the contest demo needs realistic numbers, not 0/0/0.
// Target from the teacher's design PDF: 42 donated, 31 served, 11 available.
// Split: Sindh Biryani House 25/18/7, Mehran Restaurant 12/9/3, Al-Madina
// Foods 5/4/1. Demo donors are plain demo names; the school name, Bhittaibad
// and SDG 1 + SDG 2 stay REAL — no fake school, area or SDG data is seeded.
// Runs ONLY when the DB has zero donations AND zero serves, so live data is
// never overwritten. Reset: delete backend/data/payitforward.db and restart.
function seedDemoData() {
  try {
    if (db.prepare('SELECT COUNT(*) c FROM donations').get().c > 0) return;
    if (db.prepare('SELECT COUNT(*) c FROM served_meals').get().c > 0) return;
    const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
    const demoPass = bcrypt.hashSync('Demo123!', 10);
    const donorIds = {};
    for (const [name, email, show] of [
      ['Ahmed Raza', 'ahmed.raza@demo.school', 1],
      ['Sana Khan', 'sana.khan@demo.school', 1],
      ['Fatima Memon', 'fatima.memon@demo.school', 1],
      ['Bilal Ahmed', 'bilal.ahmed@demo.school', 1],
      ['A kind neighbour', 'kind.neighbour@demo.school', 0],
    ]) {
      const info = db.prepare('INSERT INTO users (name, email, password_hash, role, show_name) VALUES (?,?,?,\'donor\',?)')
        .run(name, email, demoPass, show);
      donorIds[email] = info.lastInsertRowid;
    }
    // [donor, restaurantId, qty, servedQty, method, ISO date, txnRef, amountPkr]
    // Dates spread over Jun-Nov 2026 so the Transparency monthly chart has
    // 6 real months (Jun 8, Jul 7, Aug 6, Sep 9, Oct 4, Nov 8 = 42 donated),
    // with a cluster in the last 7 days (Nov 4 + 9 + 10 = 8) so the Admin
    // 7-day chart still has recent data. Same rows, same totals as before.
    const donations = [
      ['ahmed.raza@demo.school', 1, 8, 6, 'JazzCash', '2026-06-14T12:00:00.000Z', 'PIFM-DEMO-0001', 2400],
      ['sana.khan@demo.school', 1, 7, 5, 'Easypaisa', '2026-07-10T12:00:00.000Z', 'PIFM-DEMO-0002', 2100],
      ['fatima.memon@demo.school', 1, 6, 4, 'JazzCash', '2026-09-08T12:00:00.000Z', 'PIFM-DEMO-0003', 1800],
      ['bilal.ahmed@demo.school', 1, 4, 3, 'Card', '2026-11-09T12:00:00.000Z', 'PIFM-DEMO-0004', 1200],
      ['ahmed.raza@demo.school', 2, 6, 5, 'JazzCash', '2026-08-12T12:00:00.000Z', 'PIFM-DEMO-0005', 1500],
      ['sana.khan@demo.school', 2, 4, 3, 'Easypaisa', '2026-10-06T12:00:00.000Z', 'PIFM-DEMO-0006', 1000],
      ['kind.neighbour@demo.school', 2, 2, 1, 'JazzCash', '2026-11-10T12:00:00.000Z', 'PIFM-DEMO-0007', 500],
      ['fatima.memon@demo.school', 3, 3, 2, 'JazzCash', '2026-09-21T12:00:00.000Z', 'PIFM-DEMO-0008', 840],
      ['bilal.ahmed@demo.school', 3, 2, 2, 'Card', '2026-11-04T12:00:00.000Z', 'PIFM-DEMO-0009', 560],
    ];
    for (const [email, rid, qty, servedQty, method, iso, txn, amount] of donations) {
      db.prepare(`INSERT INTO donations (donor_id, restaurant_id, quantity, served_qty, method, payment_status, txn_ref, amount_pkr, created_at)
        VALUES (?,?,?,?,?,'sandbox_paid',?,?,?)`)
        .run(donorIds[email], rid, qty, servedQty, method, txn, amount, iso);
    }
    // Served meals, spread over Jun-Nov 2026 so the Transparency monthly
    // chart has 6 real months (Jun 6, Jul 5, Aug 4, Sep 6, Oct 2, Nov 8 = 31),
    // with 8 serves in the last 7 days so the Admin 7-day chart still has
    // recent data. Per restaurant: Sindh 18, Mehran 9, Al-Madina 4.
    // Counts only — no recipient is ever recorded.
    const adminId = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get()?.id || null;
    const servedRows = [
      // [restaurantId, date] — Sindh Biryani House (18)
      [1, '2026-06-14'], [1, '2026-06-15'], [1, '2026-06-16'], [1, '2026-06-17'],
      [1, '2026-07-10'], [1, '2026-07-11'], [1, '2026-07-12'],
      [1, '2026-08-12'], [1, '2026-08-13'],
      [1, '2026-09-08'], [1, '2026-09-09'], [1, '2026-09-21'],
      [1, '2026-10-06'],
      [1, '2026-11-04'], [1, '2026-11-06'], [1, '2026-11-08'], [1, '2026-11-09'], [1, '2026-11-10'],
      // Mehran Restaurant (9)
      [2, '2026-06-15'], [2, '2026-07-11'], [2, '2026-08-13'],
      [2, '2026-09-09'], [2, '2026-09-22'], [2, '2026-10-07'],
      [2, '2026-11-05'], [2, '2026-11-09'], [2, '2026-11-10'],
      // Al-Madina Foods (4)
      [3, '2026-06-16'], [3, '2026-07-12'], [3, '2026-08-14'], [3, '2026-09-22'],
    ];
    for (const [rid, d] of servedRows) {
      db.prepare('INSERT INTO served_meals (restaurant_id, served_by, served_at) VALUES (?,?,?)')
        .run(rid, adminId, d + 'T12:00:00.000Z');
    }
    // Restaurant counters must match the rows above (donated = served + available).
    db.prepare('UPDATE restaurants SET available=7, served=18 WHERE id=1').run();
    db.prepare('UPDATE restaurants SET available=3, served=9 WHERE id=2').run();
    db.prepare('UPDATE restaurants SET available=1, served=4 WHERE id=3').run();
    // Two "Your meal was served" messages so My Donations has demo content.
    db.prepare('INSERT INTO notifications (donor_id, restaurant_id, message, created_at) VALUES (?,?,?,?)')
      .run(donorIds['ahmed.raza@demo.school'], 1, 'Good news - your Pay It Forward meal at Sindh Biryani House has been served to someone in need. Thank you!', daysAgo(0));
    db.prepare('INSERT INTO notifications (donor_id, restaurant_id, message, created_at) VALUES (?,?,?,?)')
      .run(donorIds['sana.khan@demo.school'], 2, 'Good news - your Pay It Forward meal at Mehran Restaurant has been served to someone in need. Thank you!', daysAgo(1));
    console.log('Seeded demo data: 42 donated, 31 served, 11 available (demo donors: Demo123!)');
  } catch (e) { console.log('Demo data seed skipped -', e.message); }
}
// Existing DBs that are still empty (no donations, no serves) get the demo
// numbers too — a DB with any real donation or serve is never touched.
seedDemoData();

// Seed a menu for each restaurant (2026-11-12): only for restaurants that
// have no meals yet — never overwrites a menu the owner edited. Prices are
// the per-meal prices donors pay and staff serve from.
function seedMeals() {
  try {
    const menus = {
      'Sindh Biryani House': [['Chicken Biryani', 300], ['Beef Biryani', 350]],
      'Mehran Restaurant': [['Chicken Biryani', 250], ['Daal', 200]],
      'Al-Madina Foods': [['Chicken Karahi', 280], ['Roti', 50]],
      'New Taste Point': [['Vegetable', 200], ['Daal', 180]],
    };
    for (const [name, meals] of Object.entries(menus)) {
      const r = db.prepare('SELECT id FROM restaurants WHERE name=?').get(name);
      if (!r) continue;
      const count = db.prepare('SELECT COUNT(*) c FROM restaurant_meals WHERE restaurant_id=?').get(r.id).c;
      if (count > 0) continue;
      for (const [meal, price] of meals) {
        db.prepare('INSERT INTO restaurant_meals (restaurant_id, name, price_pkr) VALUES (?,?,?)').run(r.id, meal, price);
      }
    }
  } catch (e) { console.log('Menu seed skipped -', e.message); }
}
seedMeals();

// Seed one demo staff member per verified restaurant (2026-11-12): the
// Finder shows staff as photo icons on each card, and a fresh demo with no
// staff at all would show none. Only for restaurants that have no staff yet
// — never overwrites staff the owner added. No photo seeded, so the card
// shows the initials fallback. Password Demo123! like the other demo users.
function seedStaff() {
  try {
    const bcrypt = require('bcryptjs');
    const staff = {
      'Sindh Biryani House': ['Ali Khan', 'ali.khan@demo.school', 'Manager'],
      'Mehran Restaurant': ['Sara Bibi', 'sara.bibi@demo.school', 'Counter'],
      'Al-Madina Foods': ['Usman Ali', 'usman.ali@demo.school', 'Counter'],
    };
    for (const [name, [sname, semail, srole]] of Object.entries(staff)) {
      const r = db.prepare('SELECT id FROM restaurants WHERE name=?').get(name);
      if (!r) continue;
      const count = db.prepare("SELECT COUNT(*) c FROM users WHERE restaurant_id=? AND role='staff'").get(r.id).c;
      if (count > 0) continue;
      const exists = db.prepare('SELECT id FROM users WHERE email=?').get(semail);
      if (exists) continue;
      db.prepare("INSERT INTO users (name, email, password_hash, role, restaurant_id, staff_role, photo) VALUES (?,?,?,?,?,?,NULL)")
        .run(sname, semail, bcrypt.hashSync('Demo123!', 10), 'staff', r.id, srole);
    }
  } catch (e) { console.log('Staff seed skipped -', e.message); }
}
seedStaff();

// Migrations for restaurant contact details + meal-request data (2026-11-12):
// older DBs have no contact_email/contact_phone on restaurants, no
// contact_email/meals on restaurant_requests, and no meal_name/quantity on
// served_meals. Add them if missing; existing rows are untouched.
for (const [table, col] of [
  ['restaurants', 'contact_email TEXT'],
  ['restaurants', 'contact_phone TEXT'],
  ['restaurants', 'is_open INTEGER DEFAULT 1'],
  ['restaurant_requests', 'contact_email TEXT'],
  ['restaurant_requests', 'meals TEXT DEFAULT \'[]\''],
  ['restaurant_requests', 'owner_password_hash TEXT'],
  ['served_meals', 'meal_name TEXT'],
  ['served_meals', 'quantity INTEGER DEFAULT 1'],
]) {
  try {
    const name = col.split(' ')[0];
    const has = db.prepare(`SELECT COUNT(*) c FROM pragma_table_info('${table}') WHERE name=?`).get(name).c;
    if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col}`);
  } catch (e) { console.log('Migration skipped for', table, col, '-', e.message); }
}

// Migration for restaurant owners (2026-11-10): older DBs have no owner account
// and no staff_role column. Two steps, existing data untouched:
// 1) Old users tables were created with CHECK(role IN ('donor','staff','admin')),
//    which rejects 'owner' rows. Rebuild the table with 'owner' allowed.
// 2) Add the staff_role column, then seed the demo owner for restaurant 1
//    if no owner exists yet.
try {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (row && row.sql && row.sql.includes("role IN ('donor','staff','admin')")) {
    // Foreign keys point at users (donations/notifications/served_meals),
    // so switch them off while the table is rebuilt, then back on.
    db.exec('PRAGMA foreign_keys=OFF;');
    db.exec('DROP TABLE IF EXISTS users_new;');
    db.exec(`
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('donor','staff','admin','owner')),
        restaurant_id INTEGER, staff_role TEXT, photo TEXT, language TEXT DEFAULT 'en', show_name INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now'))
      );
      INSERT INTO users_new (id, name, email, password_hash, role, restaurant_id, staff_role, photo, language, show_name, created_at)
        SELECT id, name, email, password_hash, role, restaurant_id, NULL, NULL, language, show_name, created_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
    `);
    db.exec('PRAGMA foreign_keys=ON;');
    console.log('users table rebuilt: owner role now allowed, data kept');
  }
} catch (e) { console.log('owner CHECK migration skipped -', e.message); }
try {
  const hasRole = db.prepare("SELECT COUNT(*) c FROM pragma_table_info('users') WHERE name='staff_role'").get().c;
  if (!hasRole) db.exec('ALTER TABLE users ADD COLUMN staff_role TEXT');
} catch (e) { console.log('staff_role migration skipped -', e.message); }
try {
  const ownerCount = db.prepare("SELECT COUNT(*) c FROM users WHERE role='owner'").get().c;
  if (!ownerCount) {
    const r1 = db.prepare('SELECT id FROM restaurants WHERE id=1').get();
    if (r1) {
      const ownerHash = bcrypt.hashSync('Owner123!', 10);
      db.prepare("INSERT INTO users (name, email, password_hash, role, restaurant_id) VALUES (?,?,?, 'owner', 1)")
        .run('Sindh Biryani House', 'owner@payitforward.school', ownerHash);
      console.log('Seeded demo owner: owner@payitforward.school / Owner123! (Sindh Biryani House)');
    }
  }
  // Rename the seeded demo owner (2026-11-13): the header shows the
  // registered name, and the owner's registered name IS the restaurant
  // name — 'Sindh Biryani House', not '... Owner'. Only touches the
  // seeded demo account, nothing else.
  db.prepare("UPDATE users SET name='Sindh Biryani House' WHERE email='owner@payitforward.school' AND name='Sindh Biryani House Owner'").run();
} catch (e) { console.log('owner seed migration skipped -', e.message); }

// Migration for sandbox payments (2026-10-31): older databases created before
// this step have no txn_ref / amount_pkr columns on donations. Add them if missing,
// so a pending sandbox payment can be tracked without deleting existing data.
for (const col of ['txn_ref TEXT', 'amount_pkr INTEGER DEFAULT 0']) {
  const name = col.split(' ')[0];
  const has = db.prepare("SELECT COUNT(*) c FROM pragma_table_info('donations') WHERE name=?").get(name).c;
  if (!has) db.exec(`ALTER TABLE donations ADD COLUMN ${col}`);
}

// Migration for staff photos (2026-11-10): users.photo TEXT holds the staff
// member's photo as a data URL (JPG/PNG, max ~500KB). Old rows keep NULL
// photo and show initials instead. Runs after the owner rebuild above so
// the column is not lost when an old users table is rebuilt.
try {
  const has = db.prepare("SELECT COUNT(*) c FROM pragma_table_info('users') WHERE name='photo'").get().c;
  if (!has) db.exec('ALTER TABLE users ADD COLUMN photo TEXT');
} catch (e) { console.log('photo migration skipped -', e.message); }

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
