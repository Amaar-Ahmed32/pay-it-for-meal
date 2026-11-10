// server.js — File 3 of the backend. This is the file "npm start" runs.
// It imports the database from db.js and the login checks from auth.js,
// then defines every web address (route) the frontend can call.
// Payment note: PAYMENT_MODE=test by default. No real money moves here.
// Live JazzCash/Easypaisa would need merchant keys in .env — without them,
// the server refuses live payment instead of faking it.

const express = require('express');
const cors = require('cors');
const { db, stats } = require('./db');
const { hashPassword, checkPassword, sign, auth, requireRole, pubUser } = require('./auth');
const { MEAL_PRICE_PKR, createTxnRef, jazzcashCheckoutFields, hasJazzcashSandboxKeys, hasEasypaisaSandboxKeys } = require('./payments');

// Self-healing migration (2026-10-31): if this server.js is copied onto an OLD db.js,
// the Top-3 columns may still be missing and leaderboard/activity/transparency would
// fail with "no such column". Add them here too, so the server fixes its own DB
// on startup instead of returning 500 for those pages. Existing data is untouched.
for (const [table, col] of [['restaurants', 'meal_price_pkr INTEGER DEFAULT 250'], ['users', 'show_name INTEGER DEFAULT 1'], ['users', 'photo TEXT']]) {
  try {
    const name = col.split(' ')[0];
    const has = db.prepare(`SELECT COUNT(*) c FROM pragma_table_info('${table}') WHERE name=?`).get(name).c;
    if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col}`);
  } catch (e) { console.log('Migration skipped for', table, col, '-', e.message); }
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
const PORT = process.env.PORT || 5001;
const PAYMENT_MODE = process.env.PAYMENT_MODE || 'test';

// ---------- Public (no login needed) ----------
app.get('/api/health', (req, res) => res.json({ ok: true, payment_mode: PAYMENT_MODE }));
app.get('/api/stats', (req, res) => res.json({ ...stats(), payment_mode: PAYMENT_MODE }));
app.get('/api/restaurants', (req, res) => {
  // Public list = verified only.
  res.json(db.prepare('SELECT * FROM restaurants WHERE verified=1 ORDER BY id').all());
});
// IMPORTANT — route order matters in Express: first match wins.
// /api/restaurants/all MUST come BEFORE /api/restaurants/:id, otherwise
// Express treats "all" as an :id, looks up a restaurant called "all",
// and returns 404 "Restaurant not found" — which is exactly the bug
// that made the Admin page blank. This route is admin-only.
app.get('/api/restaurants/most-needed', (req, res) => {
  // Verified restaurant with the LOWEST available meals first (tie: most served first).
  // This is a simple rule, not AI — it sends help where the shelf is emptiest.
  const r = db.prepare('SELECT * FROM restaurants WHERE verified=1 ORDER BY available ASC, served DESC LIMIT 1').get();
  if (!r) return res.status(404).json({ error: 'No verified restaurant yet' });
  res.json(r);
});
app.get('/api/restaurants/all', auth, requireRole('admin'), (req, res) => {
  res.json(db.prepare('SELECT * FROM restaurants ORDER BY id').all());
});
app.get('/api/restaurants/:id', (req, res) => {
  const r = db.prepare('SELECT * FROM restaurants WHERE id=? AND verified=1').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Restaurant not found' });
  const d = db.prepare('SELECT COUNT(*) donations, COALESCE(SUM(quantity),0) donated FROM donations WHERE restaurant_id=?').get(r.id);
  res.json({ ...r, donationCount: d.donations, donatedTotal: d.donated });
});
app.get('/api/transparency', (req, res) => {
  // Public audit log: paid donations + serves, recipients NEVER named.
  // Donor name shows only if that donor left show_name on; otherwise 'Anonymous donor'.
  const don = db.prepare(`SELECT 'donated' kind, d.created_at at, CASE WHEN COALESCE(u.show_name,1)=0 THEN 'Anonymous donor' ELSE u.name END donor, r.name restaurant, d.quantity qty, COALESCE(d.amount_pkr, d.quantity*250) amount, d.txn_ref txn FROM donations d JOIN users u ON u.id=d.donor_id JOIN restaurants r ON r.id=d.restaurant_id WHERE d.payment_status IN ('test_paid','sandbox_paid') ORDER BY d.id DESC LIMIT 50`).all();
  const ser = db.prepare(`SELECT 'served' kind, s.served_at at, NULL donor, r.name restaurant, 1 qty, NULL amount, NULL txn FROM served_meals s JOIN restaurants r ON r.id=s.restaurant_id ORDER BY s.id DESC LIMIT 50`).all();
  res.json([...don, ...ser].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 50));
});
app.get('/api/transparency/monthly', (req, res) => {
  // Public graph data: meals donated vs served per month, last 6 months.
  // Counts only — donations are grouped by month, served meals by month;
  // no donor or recipient is ever named here.
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const m = db.prepare("SELECT strftime('%Y-%m', 'now', ?) mk").get(`-${i} months`).mk;
    const donated = db.prepare("SELECT COALESCE(SUM(quantity),0) s FROM donations WHERE payment_status IN ('test_paid','sandbox_paid') AND strftime('%Y-%m', created_at)=?").get(m).s;
    const served = db.prepare("SELECT COUNT(*) c FROM served_meals WHERE strftime('%Y-%m', served_at)=?").get(m).c;
    months.push({ month: m, donated, served });
  }
  res.json(months);
});
app.get('/api/leaderboard', (req, res) => {
  const donors = db.prepare(`SELECT CASE WHEN COALESCE(u.show_name,1)=0 THEN 'Anonymous donor' ELSE u.name END name, COALESCE(SUM(d.quantity),0) donated, COALESCE(SUM(d.served_qty),0) served FROM donations d JOIN users u ON u.id=d.donor_id GROUP BY u.id ORDER BY served DESC, donated DESC LIMIT 10`).all();
  const restaurants = db.prepare('SELECT id, name, area, available, served FROM restaurants WHERE verified=1 ORDER BY served DESC LIMIT 10').all();
  res.json({ donors, restaurants });
});
app.get('/api/activity', (req, res) => {
  // Served entries never name a recipient — donor names are public givers, recipients are not.
  const don = db.prepare(`SELECT 'donation' type, d.created_at at, CASE WHEN COALESCE(u.show_name,1)=0 THEN 'Anonymous donor' ELSE u.name END donor, r.name restaurant, d.quantity qty FROM donations d JOIN users u ON u.id=d.donor_id JOIN restaurants r ON r.id=d.restaurant_id ORDER BY d.id DESC LIMIT 10`).all();
  const ser = db.prepare(`SELECT 'served' type, s.served_at at, NULL donor, r.name restaurant, 1 qty FROM served_meals s JOIN restaurants r ON r.id=s.restaurant_id ORDER BY s.id DESC LIMIT 10`).all();
  res.json([...don, ...ser].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 15));
});
// Anyone can ask a restaurant to join. It starts UNVERIFIED and hidden until admin approves.
app.post('/api/restaurants/request', (req, res) => {
  const { name, area, meal, timings, contact_name, contact_phone } = req.body || {};
  if (!name || !area) return res.status(400).json({ error: 'Restaurant name and area are required' });
  const info = db.prepare('INSERT INTO restaurant_requests (name, area, meal, timings, contact_name, contact_phone) VALUES (?,?,?,?,?,?)')
    .run(name, area, meal || '', timings || '', contact_name || '', contact_phone || '');
  res.json({ request: db.prepare('SELECT * FROM restaurant_requests WHERE id=?').get(info.lastInsertRowid) });
});

// ---------- Accounts ----------
app.post('/api/auth/register', (req, res) => {
  // Public sign-up creates a DONOR only. Staff/admin are created by admin, never here.
  const { name, email, password } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, email and a password of at least 6 characters are required' });
  }
  try {
    const info = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)')
      .run(name, email.toLowerCase(), hashPassword(password), 'donor');
    const user = db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid);
    res.json({ token: sign(user), user: pubUser(user) });
  } catch {
    return res.status(400).json({ error: 'That email is already registered. Please login instead.' });
  }
});
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE email=?').get((email || '').toLowerCase());
  if (!user || !checkPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Wrong email or password' });
  }
  res.json({ token: sign(user), user: pubUser(user) });
});
app.post('/api/me/privacy', auth, (req, res) => {
  const show = req.body.showName ? 1 : 0;
  db.prepare('UPDATE users SET show_name=? WHERE id=?').run(show, req.user.id);
  res.json({ user: pubUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)) });
});
app.get('/api/me', auth, (req, res) => {
  res.json({ user: pubUser(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id)) });
});

// ---------- Donate + Serve (the heart of the app) ----------
app.post('/api/donations', auth, requireRole('donor', 'admin'), (req, res) => {
  const { restaurantId, quantity, method } = req.body || {};
  const r = db.prepare('SELECT * FROM restaurants WHERE id=? AND verified=1').get(restaurantId);
  const qty = parseInt(quantity, 10);
  if (!r) return res.status(400).json({ error: 'Choose a verified restaurant' });
  if (!qty || qty < 1 || qty > 10) return res.status(400).json({ error: 'Quantity must be 1 to 10' });
  if (PAYMENT_MODE !== 'test') {
    return res.status(400).json({ error: `Live payment is not configured. PAYMENT_MODE=${PAYMENT_MODE} needs merchant keys in .env.` });
  }
  const info = db.prepare('INSERT INTO donations (donor_id, restaurant_id, quantity, method, payment_status) VALUES (?,?,?,?,?)')
    .run(req.user.id, r.id, qty, method || 'JazzCash', 'test_paid');
  db.prepare('UPDATE restaurants SET available = available + ? WHERE id=?').run(qty, r.id);
  res.json({ donation: db.prepare('SELECT * FROM donations WHERE id=?').get(info.lastInsertRowid), stats: stats() });
});

// ---------- Sandbox payments ----------
// initiate (PENDING, Available does NOT increase yet) -> sandbox confirm
// (sandbox_paid, Available increases). A cancelled/failed payment never creates meals.
app.post('/api/payments/initiate', auth, requireRole('donor', 'admin'), (req, res) => {
  const { restaurantId, quantity, method } = req.body || {};
  const r = db.prepare('SELECT * FROM restaurants WHERE id=? AND verified=1').get(restaurantId);
  const qty = parseInt(quantity, 10);
  if (!r) return res.status(400).json({ error: 'Choose a verified restaurant' });
  if (!qty || qty < 1 || qty > 10) return res.status(400).json({ error: 'Quantity must be 1 to 10' });
  if (!['JazzCash', 'Easypaisa', 'Card'].includes(method)) return res.status(400).json({ error: 'Choose JazzCash, Easypaisa or Card' });
  const txnRef = createTxnRef();
  const pricePkr = r.meal_price_pkr || MEAL_PRICE_PKR; // per-restaurant price, global Rs 250 only as fallback
  const amountPkr = qty * pricePkr;
  const info = db.prepare('INSERT INTO donations (donor_id, restaurant_id, quantity, method, payment_status, txn_ref, amount_pkr) VALUES (?,?,?,?,?,?,?)')
    .run(req.user.id, r.id, qty, method, 'pending', txnRef, amountPkr);
  res.json({ donation: db.prepare('SELECT * FROM donations WHERE id=?').get(info.lastInsertRowid),
    checkout: { gateway: method, amountPkr, mealPricePkr: pricePkr, txnRef, sandboxSimulator: true,
      realGatewayReady: method === 'JazzCash' ? hasJazzcashSandboxKeys() : method === 'Easypaisa' ? hasEasypaisaSandboxKeys() : false,
      note: 'Sandbox simulator: no real money moves. Real gateway needs merchant sandbox keys in backend/.env (see SANDBOX_SETUP.md).' } });
});
app.post('/api/payments/sandbox/confirm', auth, (req, res) => {
  const d = db.prepare('SELECT * FROM donations WHERE txn_ref=? AND donor_id=?').get(req.body.txnRef, req.user.id);
  if (!d) return res.status(404).json({ error: 'Pending payment not found' });
  if (d.payment_status !== 'pending') return res.status(400).json({ error: 'This payment is already ' + d.payment_status });
  db.prepare("UPDATE donations SET payment_status='sandbox_paid' WHERE id=?").run(d.id);
  db.prepare('UPDATE restaurants SET available = available + ? WHERE id=?').run(d.quantity, d.restaurant_id);
  res.json({ donation: db.prepare('SELECT * FROM donations WHERE id=?').get(d.id), stats: stats() });
});
app.post('/api/payments/sandbox/cancel', auth, (req, res) => {
  const d = db.prepare('SELECT * FROM donations WHERE txn_ref=? AND donor_id=?').get(req.body.txnRef, req.user.id);
  if (!d) return res.status(404).json({ error: 'Pending payment not found' });
  if (d.payment_status === 'pending') db.prepare("UPDATE donations SET payment_status='cancelled' WHERE id=?").run(d.id);
  res.json({ ok: true });
});
app.get('/api/payments/jazzcash/return', (req, res) => {
  if (!hasJazzcashSandboxKeys()) return res.status(400).json({ error: 'JazzCash sandbox keys are not configured in backend/.env. Use the sandbox simulator flow instead (see SANDBOX_SETUP.md).' });
  res.json({ received: req.query, note: 'Verify pp_SecureHash against JAZZCASH_INTEGRITY_SALT before marking any donation paid. Do not trust this callback unchecked.' });
});
app.get('/api/donations/mine', auth, (req, res) => {
  res.json(db.prepare('SELECT d.*, r.name restaurantName FROM donations d JOIN restaurants r ON r.id=d.restaurant_id WHERE d.donor_id=? ORDER BY d.id DESC').all(req.user.id));
});
app.get('/api/notifications/mine', auth, (req, res) => {
  res.json(db.prepare('SELECT n.*, r.name restaurantName FROM notifications n JOIN restaurants r ON r.id=n.restaurant_id WHERE n.donor_id=? ORDER BY n.id DESC').all(req.user.id));
});
app.post('/api/notifications/:id/read', auth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND donor_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});
app.post('/api/serve', auth, requireRole('staff', 'admin'), (req, res) => {
  // Staff serve ONLY their linked restaurant. Admin picks one in the request body.
  const restaurantId = req.user.role === 'staff' ? req.user.restaurant_id : req.body.restaurantId;
  if (!restaurantId) return res.status(400).json({ error: 'Your staff account is not linked to a restaurant yet. Ask admin to link it.' });
  const r = db.prepare('SELECT * FROM restaurants WHERE id=? AND verified=1').get(restaurantId);
  if (!r) return res.status(400).json({ error: 'Restaurant not found or not verified' });
  if (r.available <= 0) return res.status(400).json({ error: 'No available meals at this restaurant today' });
  db.prepare('UPDATE restaurants SET available = available - 1, served = served + 1 WHERE id=?').run(r.id);
  db.prepare('INSERT INTO served_meals (restaurant_id, served_by) VALUES (?,?)').run(r.id, req.user.id);
  // Notify the OLDEST donor who still has an unserved meal here. No recipient is recorded.
  const d = db.prepare('SELECT * FROM donations WHERE restaurant_id=? AND served_qty < quantity ORDER BY id ASC LIMIT 1').get(r.id);
  if (d) {
    db.prepare('UPDATE donations SET served_qty = served_qty + 1 WHERE id=?').run(d.id);
    db.prepare('INSERT INTO notifications (donor_id, restaurant_id, message) VALUES (?,?,?)')
      .run(d.donor_id, r.id, `Good news - your Pay It Forward meal at ${r.name} has been served to someone in need. Thank you!`);
  }
  res.json({ restaurant: db.prepare('SELECT * FROM restaurants WHERE id=?').get(r.id), stats: stats() });
});

// Staff photo: compulsory when a staff/owner account is created (admin form
// and owner form alike). Stored as a data URL on users.photo, max ~500KB.
// Returns an error string, or null when the photo is acceptable.
function validPhoto(p) {
  if (!p || typeof p !== 'string' || !p.startsWith('data:image/')) return 'A photo of the staff member is required';
  if (p.length > 700000) return 'Photo is too large — max 500KB';
  return null;
}

// ---------- Restaurant owner: manage THEIR OWN staff ----------
// An owner is linked to ONE restaurant (restaurant_id on their account).
// Every route below enforces that on the server: an owner can only see,
// add or remove staff whose restaurant_id matches their own. Admin keeps
// full power via /api/admin/users (any restaurant, any role).
app.get('/api/restaurant/staff', auth, requireRole('owner'), (req, res) => {
  if (!req.user.restaurant_id) return res.status(400).json({ error: 'Your owner account is not linked to a restaurant yet. Ask admin to link it.' });
  const staff = db.prepare("SELECT id, name, email, role, staff_role, photo, restaurant_id FROM users WHERE role='staff' AND restaurant_id=? ORDER BY id").all(req.user.restaurant_id);
  const rest = db.prepare('SELECT * FROM restaurants WHERE id=?').get(req.user.restaurant_id);
  res.json({ restaurant: rest || null, staff });
});
app.post('/api/restaurant/staff', auth, requireRole('owner'), (req, res) => {
  if (!req.user.restaurant_id) return res.status(400).json({ error: 'Your owner account is not linked to a restaurant yet. Ask admin to link it.' });
  const { name, email, password, staffRole, photo } = req.body || {};
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Name, email and a password of at least 6 characters are required' });
  }
  const photoErr = validPhoto(photo);
  if (photoErr) return res.status(400).json({ error: photoErr });
  const role = ['Counter', 'Kitchen', 'Manager'].includes(staffRole) ? staffRole : 'Counter';
  try {
    const info = db.prepare("INSERT INTO users (name, email, password_hash, role, restaurant_id, staff_role, photo) VALUES (?,?,?, 'staff', ?, ?, ?)")
      .run(name, email.toLowerCase(), hashPassword(password), req.user.restaurant_id, role, photo);
    res.json({ staff: db.prepare('SELECT id, name, email, role, staff_role, photo, restaurant_id FROM users WHERE id=?').get(info.lastInsertRowid) });
  } catch {
    return res.status(400).json({ error: 'That email is already registered' });
  }
});
app.delete('/api/restaurant/staff/:id', auth, requireRole('owner'), (req, res) => {
  if (!req.user.restaurant_id) return res.status(400).json({ error: 'Your owner account is not linked to a restaurant yet.' });
  const target = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!target || target.role !== 'staff' || target.restaurant_id !== req.user.restaurant_id) {
    return res.status(404).json({ error: 'Staff member not found in your restaurant' });
  }
  db.prepare('DELETE FROM users WHERE id=?').run(target.id);
  res.json({ ok: true });
});

// ---------- Admin only ----------
app.get('/api/admin/overview', auth, requireRole('admin'), (req, res) => {
  res.json({
    users: db.prepare('SELECT COUNT(*) c FROM users').get().c,
    pendingRestaurants: db.prepare('SELECT COUNT(*) c FROM restaurants WHERE verified=0').get().c,
    pendingRequests: db.prepare("SELECT COUNT(*) c FROM restaurant_requests WHERE status='pending'").get().c,
    donations: db.prepare('SELECT COUNT(*) c FROM donations').get().c,
    ...stats(),
  });
});
app.get('/api/admin/report', auth, requireRole('admin'), (req, res) => {
  // Last 7 days, per restaurant, counts only — no recipient data exists to leak.
  const rows = db.prepare(`SELECT r.id, r.name, r.area, r.available, r.served servedTotal,
    COALESCE((SELECT SUM(quantity) FROM donations WHERE restaurant_id=r.id AND payment_status IN ('test_paid','sandbox_paid') AND created_at >= datetime('now','-7 days')),0) donated7,
    COALESCE((SELECT COUNT(*) FROM served_meals WHERE restaurant_id=r.id AND served_at >= datetime('now','-7 days')),0) served7
    FROM restaurants r ORDER BY r.id`).all();
  const totals = rows.reduce((a, r) => ({ donated7: a.donated7 + r.donated7, served7: a.served7 + r.served7, available: a.available + r.available, servedTotal: a.servedTotal + r.servedTotal }), { donated7: 0, served7: 0, available: 0, servedTotal: 0 });
  // Daily series for the Admin graph dashboard: donated vs served per day, last 7 days.
  const daily = [];
  for (let i = 6; i >= 0; i--) {
    const day = db.prepare("SELECT date('now', ?) day").get(`-${i} days`).day;
    const donated = db.prepare("SELECT COALESCE(SUM(quantity),0) s FROM donations WHERE payment_status IN ('test_paid','sandbox_paid') AND date(created_at)=?").get(day).s;
    const served = db.prepare('SELECT COUNT(*) c FROM served_meals WHERE date(served_at)=?').get(day).c;
    daily.push({ day, label: day.slice(5), donated, served });
  }
  res.json({ rows, totals, daily });
});
app.get('/api/admin/users', auth, requireRole('admin'), (req, res) => {
  res.json(db.prepare('SELECT u.id, u.name, u.email, u.role, u.restaurant_id, u.photo, r.name restaurantName FROM users u LEFT JOIN restaurants r ON r.id=u.restaurant_id ORDER BY u.id').all());
});
app.post('/api/admin/users', auth, requireRole('admin'), (req, res) => {
  const { name, email, password, role, restaurant_id, photo } = req.body || {};
  if (!name || !email || !password || !['staff', 'admin', 'donor', 'owner'].includes(role)) {
    return res.status(400).json({ error: 'Name, email, password and a valid role are required' });
  }
  if ((role === 'staff' || role === 'owner') && !restaurant_id) return res.status(400).json({ error: 'A staff/owner account must be linked to a restaurant' });
  if (role === 'staff' || role === 'owner') {
    const photoErr = validPhoto(photo);
    if (photoErr) return res.status(400).json({ error: photoErr });
  }
  try {
    const info = db.prepare('INSERT INTO users (name, email, password_hash, role, restaurant_id, photo) VALUES (?,?,?,?,?,?)')
      .run(name, email.toLowerCase(), hashPassword(password), role, restaurant_id || null, photo || null);
    res.json({ user: pubUser(db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid)) });
  } catch {
    return res.status(400).json({ error: 'That email is already registered' });
  }
});
app.post('/api/admin/verify', auth, requireRole('admin'), (req, res) => {
  const r = db.prepare('SELECT * FROM restaurants WHERE id=?').get(req.body.restaurantId);
  if (!r) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE restaurants SET verified=1 WHERE id=?').run(r.id);
  res.json({ restaurant: db.prepare('SELECT * FROM restaurants WHERE id=?').get(r.id) });
});
app.post('/api/admin/restaurant', auth, requireRole('admin'), (req, res) => {
  const { name, area, meal, timings, contact_person, meal_price_pkr } = req.body || {};
  if (!name || !area) return res.status(400).json({ error: 'Name and area are required' });
  const price = parseInt(meal_price_pkr, 10);
  const info = db.prepare('INSERT INTO restaurants (name, area, meal, timings, contact_person, meal_price_pkr) VALUES (?,?,?,?,?,?)')
    .run(name, area, meal || 'Meal of the day', timings || '12:00 PM - 9:00 PM', contact_person || '', (!price || price < 50 || price > 2000) ? 250 : price);
  res.json({ restaurant: db.prepare('SELECT * FROM restaurants WHERE id=?').get(info.lastInsertRowid) });
});
app.post('/api/admin/restaurants/:id/price', auth, requireRole('admin'), (req, res) => {
  const price = parseInt(req.body.mealPricePkr, 10);
  if (!price || price < 50 || price > 2000) return res.status(400).json({ error: 'Meal price must be Rs 50 to Rs 2000' });
  db.prepare('UPDATE restaurants SET meal_price_pkr=? WHERE id=?').run(price, req.params.id);
  res.json({ restaurant: db.prepare('SELECT * FROM restaurants WHERE id=?').get(req.params.id) });
});
app.get('/api/admin/requests', auth, requireRole('admin'), (req, res) => {
  res.json(db.prepare('SELECT * FROM restaurant_requests ORDER BY id DESC').all());
});
app.post('/api/admin/requests/:id/approve', auth, requireRole('admin'), (req, res) => {
  const q = db.prepare('SELECT * FROM restaurant_requests WHERE id=?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Not found' });
  const info = db.prepare('INSERT INTO restaurants (name, area, meal, timings, verified, contact_person) VALUES (?,?,?,?,1,?)')
    .run(q.name, q.area, q.meal || 'Meal of the day', q.timings || '12:00 PM - 9:00 PM', q.contact_name || '');
  db.prepare("UPDATE restaurant_requests SET status='approved' WHERE id=?").run(q.id);
  res.json({ restaurant: db.prepare('SELECT * FROM restaurants WHERE id=?').get(info.lastInsertRowid) });
});
app.post('/api/admin/requests/:id/reject', auth, requireRole('admin'), (req, res) => {
  db.prepare("UPDATE restaurant_requests SET status='rejected' WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// On Vercel serverless this file is imported by api/index.js — do NOT listen
// there (Vercel owns the port). Locally, "npm start" runs this file directly.
if (require.main === module) {
  app.listen(PORT, () => console.log('Pay It Forward Meal backend on http://localhost:' + PORT + ' payment_mode=' + PAYMENT_MODE));
}
module.exports = app;
