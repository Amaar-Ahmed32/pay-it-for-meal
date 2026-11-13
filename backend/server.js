// server.js — File 3 of the backend. This is the file "npm start" runs.
// It imports the database from db.js and the login checks from auth.js,
// then defines every web address (route) the frontend can call.
// Payment note: PAYMENT_MODE=test by default. No real money moves here.
// Live JazzCash/Easypaisa would need merchant keys in .env — without them,
// the server refuses live payment instead of faking it.

const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { db, stats } = require('./db');
const { hashPassword, checkPassword, sign, auth, requireRole, pubUser } = require('./auth');
const { MEAL_PRICE_PKR, createTxnRef, jazzcashCheckoutFields, hasJazzcashSandboxKeys, hasEasypaisaSandboxKeys } = require('./payments');

// Self-healing migration (2026-10-31): if this server.js is copied onto an OLD db.js,
// the Top-3 columns may still be missing and leaderboard/activity/transparency would
// fail with "no such column". Add them here too, so the server fixes its own DB
// on startup instead of returning 500 for those pages. Existing data is untouched.
for (const [table, col] of [['restaurants', 'meal_price_pkr INTEGER DEFAULT 250'], ['users', 'show_name INTEGER DEFAULT 1'], ['users', 'photo TEXT'], ['restaurants', 'is_open INTEGER DEFAULT 1']]) {
  try {
    const name = col.split(' ')[0];
    const has = db.prepare(`SELECT COUNT(*) c FROM pragma_table_info('${table}') WHERE name=?`).get(name).c;
    if (!has) db.exec(`ALTER TABLE ${table} ADD COLUMN ${col}`);
  } catch (e) { console.log('Migration skipped for', table, col, '-', e.message); }
}

// ---------- Shared validators + helpers (2026-11-12) ----------
// Email: simple format check. Phone: Pakistani mobile 03XX-XXXXXXX
// (dashes/spaces allowed, 03 + 9 digits). Both are checked on the server
// too — the frontend check alone is never trusted.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const validEmail = (e) => typeof e === 'string' && EMAIL_RE.test(e.trim());
const validPhonePK = (p) => /^03\d{9}$/.test(String(p || '').replace(/[\s-]/g, ''));
const MEAL_OPTIONS = ['Chicken Biryani', 'Beef Biryani', 'Daal', 'Chicken Karahi', 'Vegetable', 'Roti/Naan'];
// Accept meals as an array of names or {name, price} objects; returns a
// cleaned [{name, price}] list (price defaults to the restaurant price).
function parseMeals(input, defaultPrice) {
  // Accepts an array of names / {name, price} objects (admin form) or a
  // comma-separated string (public join form). Anything else → [].
  if (typeof input === 'string') input = input.split(',').map((s) => s.trim()).filter(Boolean);
  if (!Array.isArray(input)) return [];
  const out = [];
  for (const m of input) {
    const name = typeof m === 'string' ? m : m && m.name;
    const price = typeof m === 'object' && m !== null ? parseInt(m.price, 10) : NaN;
    if (typeof name !== 'string' || !name.trim()) continue;
    out.push({ name: name.trim().slice(0, 60), price: (!price || price < 10 || price > 2000) ? (defaultPrice || 250) : price });
  }
  return out;
}
const restMeals = (rid) => db.prepare('SELECT * FROM restaurant_meals WHERE restaurant_id=? ORDER BY id').all(rid);
function firstMeal(r) {
  const m = restMeals(r.id)[0];
  return m ? { name: m.name, price: m.price_pkr } : { name: r.meal || 'Meal of the day', price: r.meal_price_pkr || 250 };
}
// One shared serve: counts + notification + saved receipt. Used by the
// Staff Serve button, the admin serve, and fulfilling a meal request.
// Returns { restaurant, receipt }. Throws an Error when nothing is available.
function serveMeal(r, staffUserId, meal) {
  if (!r || r.available <= 0) throw new Error('No available meals at this restaurant today');
  const qty = 1;
  const total = qty * meal.price;
  db.prepare('UPDATE restaurants SET available = available - 1, served = served + 1 WHERE id=?').run(r.id);
  db.prepare('INSERT INTO served_meals (restaurant_id, served_by, meal_name, quantity) VALUES (?,?,?,?)').run(r.id, staffUserId || null, meal.name, qty);
  // Notify the OLDEST donor who still has an unserved meal here. No recipient is recorded.
  const d = db.prepare('SELECT * FROM donations WHERE restaurant_id=? AND served_qty < quantity ORDER BY id ASC LIMIT 1').get(r.id);
  if (d) {
    db.prepare('UPDATE donations SET served_qty = served_qty + 1 WHERE id=?').run(d.id);
    db.prepare('INSERT INTO notifications (donor_id, restaurant_id, message) VALUES (?,?,?)')
      .run(d.donor_id, r.id, `Good news - your Pay It Forward meal at ${r.name} has been served to someone in need. Thank you!`);
  }
  const info = db.prepare('INSERT INTO serve_receipts (restaurant_id, staff_user_id, meal_name, quantity, price_pkr, total_pkr) VALUES (?,?,?,?,?,?)')
    .run(r.id, staffUserId || null, meal.name, qty, meal.price, total);
  const receipt = db.prepare('SELECT * FROM serve_receipts WHERE id=?').get(info.lastInsertRowid);
  return { restaurant: db.prepare('SELECT * FROM restaurants WHERE id=?').get(r.id), receipt };
}
// Opening times: the forms send Start/End as 24-hour "HH:MM" (<input type="time">).
// Stored as "9:00 AM - 10:00 PM" to match the existing seed data style.
// End must be after start, same day — overnight hours are not supported yet.
const validTime = (s) => typeof s === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
function to12h(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}
function composeTimings(start, end) {
  if (!validTime(start) || !validTime(end)) return null;
  if (end <= start) return null; // string compare works for HH:MM 24-hour times
  return `${to12h(start)} - ${to12h(end)}`;
}
// A request row must never leak its owner password hash to any client.
const stripReqHash = (q) => { if (!q) return q; const { owner_password_hash, ...rest } = q; return rest; };
// Public-safe staff list for one restaurant (photo, name, role only — no email).
const publicStaff = (rid) => db.prepare("SELECT id, name, staff_role, photo FROM users WHERE role='staff' AND restaurant_id=? ORDER BY id").all(rid);
// A request older than 24h counts as Expired (computed, no background job).
const reqExpired = (row) => row.status === 'pending' && (Date.now() - new Date(String(row.created_at).replace(' ', 'T') + 'Z').getTime() > 24 * 3600 * 1000);

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
const PORT = process.env.PORT || 5001;
const PAYMENT_MODE = process.env.PAYMENT_MODE || 'test';

// ---------- Public (no login needed) ----------
app.get('/api/health', (req, res) => res.json({ ok: true, payment_mode: PAYMENT_MODE }));
app.get('/api/stats', (req, res) => res.json({ ...stats(), payment_mode: PAYMENT_MODE }));
app.get('/api/restaurants', (req, res) => {
  // Public list = verified only, each with its menu and its staff
  // (photo + name + role only — no emails, no recipient data).
  const list = db.prepare('SELECT * FROM restaurants WHERE verified=1 ORDER BY id').all();
  res.json(list.map((r) => ({ ...r, meals: restMeals(r.id), staff: publicStaff(r.id) })));
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
  res.json({ ...r, donationCount: d.donations, donatedTotal: d.donated, meals: restMeals(r.id), staff: publicStaff(r.id) });
});
// Anonymous meal request (public, no login, no identity): a person who needs
// a meal picks a restaurant and how many meals (1-3). NO name/phone/email
// is asked for or stored — the table has no identity columns at all.
app.post('/api/requests', (req, res) => {
  const { restaurantId, mealsNeeded, note } = req.body || {};
  const r = db.prepare('SELECT * FROM restaurants WHERE id=? AND verified=1').get(restaurantId);
  if (!r) return res.status(400).json({ error: 'Choose a verified restaurant' });
  if (r.is_open === 0) return res.status(400).json({ error: 'This restaurant is closed today — please request a meal at another restaurant or try tomorrow' });
  const n = parseInt(mealsNeeded, 10);
  if (!n || n < 1 || n > 3) return res.status(400).json({ error: 'Number of meals must be 1 to 3' });
  const cleanNote = typeof note === 'string' ? note.trim().slice(0, 200) : '';
  const info = db.prepare('INSERT INTO meal_requests (restaurant_id, meals_needed, note) VALUES (?,?,?)').run(r.id, n, cleanNote);
  res.json({ request: db.prepare('SELECT * FROM meal_requests WHERE id=?').get(info.lastInsertRowid) });
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
// Email and phone are required and validated (Pakistani mobile 03XX-XXXXXXX),
// the restaurant picks which meals it serves (checkboxes + Other), picks
// opening Start/End times, and sets a password for its owner dashboard.
// The password is hashed with bcrypt — never stored in plain text — and
// on approval the owner account is created from that hash automatically.
// contact_name/contact_phone/meal are no longer sent by the forms; they are
// accepted and ignored here so an old cached page still works.
app.post('/api/restaurants/request', (req, res) => {
  const { name, area, meal, timings, start_time, end_time, contact_name, contact_phone, contact_email, meals, owner_password } = req.body || {};
  if (!name || !area) return res.status(400).json({ error: 'Restaurant name and area are required' });
  if (!validEmail(contact_email)) return res.status(400).json({ error: 'A valid email address is required (e.g. name@example.com)' });
  if (!validPhonePK(contact_phone)) return res.status(400).json({ error: 'A valid Pakistani mobile is required (e.g. 0300-1234567)' });
  let timingsText = (timings || '').trim();
  if (start_time || end_time) {
    const composed = composeTimings(start_time, end_time);
    if (!composed) return res.status(400).json({ error: 'Pick a start time and an end time — the end time must be after the start time' });
    timingsText = composed;
  }
  if (!owner_password || String(owner_password).length < 8) return res.status(400).json({ error: 'A dashboard password of at least 8 characters is required' });
  const mealList = parseMeals(meals, 250);
  const info = db.prepare('INSERT INTO restaurant_requests (name, area, meal, timings, contact_name, contact_phone, contact_email, meals, owner_password_hash) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(name, area, meal || '', timingsText, contact_name || '', String(contact_phone).trim(), String(contact_email).trim().toLowerCase(), JSON.stringify(mealList), hashPassword(String(owner_password)));
  res.json({ request: stripReqHash(db.prepare('SELECT * FROM restaurant_requests WHERE id=?').get(info.lastInsertRowid)) });
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
  if (r.is_open === 0) return res.status(400).json({ error: 'This restaurant is closed today — please donate to another restaurant or try tomorrow' });
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
  const { restaurantId, quantity, method, mealId } = req.body || {};
  const r = db.prepare('SELECT * FROM restaurants WHERE id=? AND verified=1').get(restaurantId);
  const qty = parseInt(quantity, 10);
  if (!r) return res.status(400).json({ error: 'Choose a verified restaurant' });
  if (r.is_open === 0) return res.status(400).json({ error: 'This restaurant is closed today — please donate to another restaurant or try tomorrow' });
  if (!qty || qty < 1 || qty > 10) return res.status(400).json({ error: 'Quantity must be 1 to 10' });
  if (!['JazzCash', 'Easypaisa', 'Card'].includes(method)) return res.status(400).json({ error: 'Choose JazzCash, Easypaisa or Card' });
  // Price comes from the chosen meal on the restaurant's menu; the
  // restaurant's own meal price is the fallback when it has no menu yet.
  let meal = null;
  if (mealId) {
    meal = db.prepare('SELECT * FROM restaurant_meals WHERE id=? AND restaurant_id=?').get(mealId, r.id);
    if (!meal) return res.status(400).json({ error: 'That meal is not on this restaurant’s menu' });
  }
  const txnRef = createTxnRef();
  const pricePkr = meal ? meal.price_pkr : (r.meal_price_pkr || MEAL_PRICE_PKR);
  const amountPkr = qty * pricePkr;
  const info = db.prepare('INSERT INTO donations (donor_id, restaurant_id, quantity, method, payment_status, txn_ref, amount_pkr) VALUES (?,?,?,?,?,?,?)')
    .run(req.user.id, r.id, qty, method, 'pending', txnRef, amountPkr);
  res.json({ donation: db.prepare('SELECT * FROM donations WHERE id=?').get(info.lastInsertRowid),
    checkout: { gateway: method, amountPkr, mealPricePkr: pricePkr, mealName: meal ? meal.name : null, txnRef, sandboxSimulator: true,
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
  // The meal served can be picked from the restaurant's menu (mealId); the
  // first menu meal is the default. A receipt is generated and returned.
  const restaurantId = req.user.role === 'staff' ? req.user.restaurant_id : req.body.restaurantId;
  if (!restaurantId) return res.status(400).json({ error: 'Your staff account is not linked to a restaurant yet. Ask admin to link it.' });
  const r = db.prepare('SELECT * FROM restaurants WHERE id=? AND verified=1').get(restaurantId);
  if (!r) return res.status(400).json({ error: 'Restaurant not found or not verified' });
  if (r.is_open === 0) return res.status(400).json({ error: 'This restaurant is closed today — serving is paused until it reopens' });
  let meal = null;
  if (req.body.mealId) {
    meal = db.prepare('SELECT * FROM restaurant_meals WHERE id=? AND restaurant_id=?').get(req.body.mealId, r.id);
    if (!meal) return res.status(400).json({ error: 'That meal is not on this restaurant’s menu' });
    meal = { name: meal.name, price: meal.price_pkr };
  } else {
    meal = firstMeal(r);
  }
  try {
    const out = serveMeal(r, req.user.id, meal);
    res.json({ restaurant: out.restaurant, receipt: out.receipt, stats: stats() });
  } catch (e) { return res.status(400).json({ error: e.message }); }
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

// ---------- Restaurant owner: manage THEIR OWN menu ----------
// Same rule as staff: the owner only ever touches their own restaurant.
app.get('/api/restaurant/meals', auth, requireRole('owner'), (req, res) => {
  if (!req.user.restaurant_id) return res.status(400).json({ error: 'Your owner account is not linked to a restaurant yet.' });
  res.json({ meals: restMeals(req.user.restaurant_id) });
});
app.post('/api/restaurant/meals', auth, requireRole('owner'), (req, res) => {
  if (!req.user.restaurant_id) return res.status(400).json({ error: 'Your owner account is not linked to a restaurant yet.' });
  const { name, price } = req.body || {};
  const p = parseInt(price, 10);
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Meal name is required' });
  if (!p || p < 10 || p > 2000) return res.status(400).json({ error: 'Meal price must be Rs 10 to Rs 2000' });
  const info = db.prepare('INSERT INTO restaurant_meals (restaurant_id, name, price_pkr) VALUES (?,?,?)')
    .run(req.user.restaurant_id, String(name).trim().slice(0, 60), p);
  res.json({ meal: db.prepare('SELECT * FROM restaurant_meals WHERE id=?').get(info.lastInsertRowid) });
});
app.put('/api/restaurant/meals/:id', auth, requireRole('owner'), (req, res) => {
  if (!req.user.restaurant_id) return res.status(400).json({ error: 'Your owner account is not linked to a restaurant yet.' });
  const m = db.prepare('SELECT * FROM restaurant_meals WHERE id=? AND restaurant_id=?').get(req.params.id, req.user.restaurant_id);
  if (!m) return res.status(404).json({ error: 'Meal not found in your restaurant' });
  const name = req.body.name !== undefined ? String(req.body.name).trim().slice(0, 60) : m.name;
  const p = req.body.price !== undefined ? parseInt(req.body.price, 10) : m.price_pkr;
  if (!name) return res.status(400).json({ error: 'Meal name is required' });
  if (!p || p < 10 || p > 2000) return res.status(400).json({ error: 'Meal price must be Rs 10 to Rs 2000' });
  db.prepare('UPDATE restaurant_meals SET name=?, price_pkr=? WHERE id=?').run(name, p, m.id);
  res.json({ meal: db.prepare('SELECT * FROM restaurant_meals WHERE id=?').get(m.id) });
});
app.delete('/api/restaurant/meals/:id', auth, requireRole('owner'), (req, res) => {
  if (!req.user.restaurant_id) return res.status(400).json({ error: 'Your owner account is not linked to a restaurant yet.' });
  const m = db.prepare('SELECT * FROM restaurant_meals WHERE id=? AND restaurant_id=?').get(req.params.id, req.user.restaurant_id);
  if (!m) return res.status(404).json({ error: 'Meal not found in your restaurant' });
  db.prepare('DELETE FROM restaurant_meals WHERE id=?').run(m.id);
  res.json({ ok: true });
});

// Open / Closed for the day: the owner toggles their own restaurant.
// A closed restaurant shows "Closed today" on the Finder, takes no new
// meal requests, takes no donations, and its staff Serve button is disabled.
app.post('/api/restaurant/toggle-open', auth, requireRole('owner'), (req, res) => {
  if (!req.user.restaurant_id) return res.status(400).json({ error: 'Your owner account is not linked to a restaurant yet.' });
  const r = db.prepare('SELECT * FROM restaurants WHERE id=?').get(req.user.restaurant_id);
  if (!r) return res.status(404).json({ error: 'Restaurant not found' });
  const next = r.is_open === 0 ? 1 : 0;
  db.prepare('UPDATE restaurants SET is_open=? WHERE id=?').run(next, r.id);
  res.json({ restaurant: db.prepare('SELECT * FROM restaurants WHERE id=?').get(r.id) });
});
// ---------- Meal requests: owner / manager see their own restaurant's ----------
// Who may do what: owner sees all of their restaurant's requests; staff with
// staff_role Manager or Counter may see and fulfil them (Kitchen may only
// see them on the Staff page, not fulfil). Fulfil serves 1 meal and creates
// a receipt; with no meals available it is rejected with a clear message.
// Requests older than 24h are labelled Expired by the frontend (computed
// from created_at) — no background job is needed.
function ownRestaurantId(user) {
  return user.role === 'owner' ? user.restaurant_id : (user.role === 'staff' ? user.restaurant_id : null);
}
function canSeeRequests(user) {
  if (user.role === 'owner') return !!user.restaurant_id;
  if (user.role === 'staff') return !!user.restaurant_id;
  return false;
}
function canFulfil(user) {
  if (user.role === 'owner') return !!user.restaurant_id;
  if (user.role === 'staff') {
    const me = db.prepare('SELECT staff_role FROM users WHERE id=?').get(user.id);
    return !!user.restaurant_id && me && ['Manager', 'Counter'].includes(me.staff_role);
  }
  return false;
}
app.get('/api/restaurant/requests', auth, requireRole('owner', 'staff'), (req, res) => {
  const rid = ownRestaurantId(req.user);
  if (!rid || !canSeeRequests(req.user)) return res.status(400).json({ error: 'Your account is not linked to a restaurant yet.' });
  const rows = db.prepare('SELECT * FROM meal_requests WHERE restaurant_id=? ORDER BY id DESC LIMIT 50').all(rid);
  res.json(rows.map((r) => ({ ...r, expired: reqExpired(r) })));
});
app.post('/api/restaurant/requests/:id/fulfil', auth, requireRole('owner', 'staff'), (req, res) => {
  const rid = ownRestaurantId(req.user);
  if (!rid || !canFulfil(req.user)) return res.status(403).json({ error: 'Only the owner, manager or counter staff of this restaurant can fulfil a request' });
  const q = db.prepare('SELECT * FROM meal_requests WHERE id=? AND restaurant_id=?').get(req.params.id, rid);
  if (!q) return res.status(404).json({ error: 'Request not found' });
  if (q.status !== 'pending') return res.status(400).json({ error: 'This request is already ' + q.status });
  if (reqExpired(q)) return res.status(400).json({ error: 'This request has expired (older than 24 hours)' });
  const r = db.prepare('SELECT * FROM restaurants WHERE id=? AND verified=1').get(rid);
  if (!r) return res.status(400).json({ error: 'Restaurant not found or not verified' });
  if (r.is_open === 0) return res.status(400).json({ error: 'This restaurant is closed today — serving is paused until it reopens' });
  try {
    const out = serveMeal(r, req.user.id, firstMeal(r));
    db.prepare("UPDATE meal_requests SET status='fulfilled' WHERE id=?").run(q.id);
    res.json({ restaurant: out.restaurant, receipt: out.receipt, stats: stats() });
  } catch (e) { return res.status(400).json({ error: e.message }); }
});
app.post('/api/restaurant/requests/:id/cancel', auth, requireRole('owner', 'staff'), (req, res) => {
  const rid = ownRestaurantId(req.user);
  if (!rid) return res.status(400).json({ error: 'Your account is not linked to a restaurant yet.' });
  if (req.user.role === 'staff') {
    const me = db.prepare('SELECT staff_role FROM users WHERE id=?').get(req.user.id);
    if (!me || me.staff_role !== 'Manager') return res.status(403).json({ error: 'Only the owner or manager can cancel a request' });
  }
  const q = db.prepare('SELECT * FROM meal_requests WHERE id=? AND restaurant_id=?').get(req.params.id, rid);
  if (!q) return res.status(404).json({ error: 'Request not found' });
  if (q.status !== 'pending') return res.status(400).json({ error: 'This request is already ' + q.status });
  db.prepare("UPDATE meal_requests SET status='cancelled' WHERE id=?").run(q.id);
  res.json({ ok: true });
});
// Serve receipts for one restaurant: owner + its own staff (admin uses /api/admin/receipts).
app.get('/api/restaurant/receipts', auth, requireRole('owner', 'staff'), (req, res) => {
  const rid = ownRestaurantId(req.user);
  if (!rid) return res.status(400).json({ error: 'Your account is not linked to a restaurant yet.' });
  res.json(db.prepare(`SELECT sr.*, u.name servedBy FROM serve_receipts sr LEFT JOIN users u ON u.id=sr.staff_user_id WHERE sr.restaurant_id=? ORDER BY sr.id DESC LIMIT 50`).all(rid));
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
  const { name, area, meal, timings, start_time, end_time, contact_person, contact_email, contact_phone, meal_price_pkr, meals, owner_password } = req.body || {};
  if (!name || !area) return res.status(400).json({ error: 'Name and area are required' });
  if (!validEmail(contact_email)) return res.status(400).json({ error: 'A valid email address is required (e.g. name@example.com)' });
  if (!validPhonePK(contact_phone)) return res.status(400).json({ error: 'A valid Pakistani mobile is required (e.g. 0300-1234567)' });
  let timingsText = (timings || '').trim() || '12:00 PM - 9:00 PM';
  if (start_time || end_time) {
    const composed = composeTimings(start_time, end_time);
    if (!composed) return res.status(400).json({ error: 'Pick a start time and an end time — the end time must be after the start time' });
    timingsText = composed;
  }
  if (!owner_password || String(owner_password).length < 8) return res.status(400).json({ error: 'A dashboard password of at least 8 characters is required for the owner' });
  const email = String(contact_email).trim().toLowerCase();
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) return res.status(400).json({ error: 'That email already has an account — pick a different owner email' });
  const price = parseInt(meal_price_pkr, 10);
  const finalPrice = (!price || price < 50 || price > 2000) ? 250 : price;
  const info = db.prepare('INSERT INTO restaurants (name, area, meal, timings, contact_person, contact_email, contact_phone, meal_price_pkr) VALUES (?,?,?,?,?,?,?,?)')
    .run(name, area, meal || 'Meal of the day', timingsText, contact_person || '', email, String(contact_phone).trim(), finalPrice);
  const mealList = parseMeals(meals, finalPrice);
  for (const m of mealList) db.prepare('INSERT INTO restaurant_meals (restaurant_id, name, price_pkr) VALUES (?,?,?)').run(info.lastInsertRowid, m.name, m.price);
  // The restaurant's owner account is created at the same time, so the
  // owner can log in with this email + password straight away.
  const ownerInfo = db.prepare("INSERT INTO users (name, email, password_hash, role, restaurant_id) VALUES (?,?,?, 'owner', ?)")
    .run(name, email, hashPassword(String(owner_password)), info.lastInsertRowid);
  res.json({ restaurant: db.prepare('SELECT * FROM restaurants WHERE id=?').get(info.lastInsertRowid), meals: restMeals(info.lastInsertRowid), owner: pubUser(db.prepare('SELECT * FROM users WHERE id=?').get(ownerInfo.lastInsertRowid)) });
});
// Admin deletes: restaurant (with its meals, meal requests, receipts and
// staff), a user account, or a single meal. Every delete is confirmed in
// the UI first. The seeded admin account can never be deleted, and the
// last owner of a restaurant cannot be deleted either.
app.delete('/api/admin/restaurants/:id', auth, requireRole('admin'), (req, res) => {
  const r = db.prepare('SELECT * FROM restaurants WHERE id=?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Restaurant not found' });
  db.prepare('DELETE FROM restaurant_meals WHERE restaurant_id=?').run(r.id);
  db.prepare('DELETE FROM meal_requests WHERE restaurant_id=?').run(r.id);
  db.prepare('DELETE FROM serve_receipts WHERE restaurant_id=?').run(r.id);
  db.prepare("DELETE FROM users WHERE role='staff' AND restaurant_id=?").run(r.id);
  db.prepare("DELETE FROM users WHERE role='owner' AND restaurant_id=?").run(r.id);
  db.prepare('DELETE FROM restaurants WHERE id=?').run(r.id);
  res.json({ ok: true });
});
app.delete('/api/admin/users/:id', auth, requireRole('admin'), (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.email === 'admin@payitforward.school') return res.status(400).json({ error: 'The main admin account cannot be deleted' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'You cannot delete your own account' });
  if (target.role === 'owner' && target.restaurant_id) {
    const others = db.prepare("SELECT COUNT(*) c FROM users WHERE role='owner' AND restaurant_id=? AND id<>?").get(target.restaurant_id, target.id).c;
    if (!others) return res.status(400).json({ error: 'Cannot delete the last owner of a restaurant' });
  }
  db.prepare('DELETE FROM users WHERE id=?').run(target.id);
  res.json({ ok: true });
});
app.delete('/api/admin/meals/:id', auth, requireRole('admin'), (req, res) => {
  const m = db.prepare('SELECT * FROM restaurant_meals WHERE id=?').get(req.params.id);
  if (!m) return res.status(404).json({ error: 'Meal not found' });
  db.prepare('DELETE FROM restaurant_meals WHERE id=?').run(m.id);
  res.json({ ok: true });
});
app.get('/api/admin/meals', auth, requireRole('admin'), (req, res) => {
  res.json(db.prepare('SELECT rm.*, r.name restaurantName FROM restaurant_meals rm JOIN restaurants r ON r.id=rm.restaurant_id ORDER BY r.id, rm.id').all());
});
app.get('/api/admin/receipts', auth, requireRole('admin'), (req, res) => {
  res.json(db.prepare(`SELECT sr.*, r.name restaurantName, u.name servedBy FROM serve_receipts sr JOIN restaurants r ON r.id=sr.restaurant_id LEFT JOIN users u ON u.id=sr.staff_user_id ORDER BY sr.id DESC LIMIT 50`).all());
});
app.get('/api/admin/meal-requests', auth, requireRole('admin'), (req, res) => {
  const rows = db.prepare('SELECT mr.*, r.name restaurantName FROM meal_requests mr JOIN restaurants r ON r.id=mr.restaurant_id ORDER BY mr.id DESC LIMIT 50').all();
  res.json(rows.map((x) => ({ ...x, expired: reqExpired(x) })));
});
app.post('/api/admin/restaurants/:id/price', auth, requireRole('admin'), (req, res) => {
  const price = parseInt(req.body.mealPricePkr, 10);
  if (!price || price < 50 || price > 2000) return res.status(400).json({ error: 'Meal price must be Rs 50 to Rs 2000' });
  db.prepare('UPDATE restaurants SET meal_price_pkr=? WHERE id=?').run(price, req.params.id);
  res.json({ restaurant: db.prepare('SELECT * FROM restaurants WHERE id=?').get(req.params.id) });
});
app.post('/api/admin/restaurants/:id/toggle-open', auth, requireRole('admin'), (req, res) => {
  const r = db.prepare('SELECT * FROM restaurants WHERE id=?').get(req.params.id);
  if (!r) return res.status(404).json({ error: 'Restaurant not found' });
  const next = r.is_open === 0 ? 1 : 0;
  db.prepare('UPDATE restaurants SET is_open=? WHERE id=?').run(next, r.id);
  res.json({ restaurant: db.prepare('SELECT * FROM restaurants WHERE id=?').get(r.id) });
});
app.get('/api/admin/requests', auth, requireRole('admin'), (req, res) => {
  res.json(db.prepare('SELECT * FROM restaurant_requests ORDER BY id DESC').all().map(stripReqHash));
});
app.post('/api/admin/requests/:id/approve', auth, requireRole('admin'), (req, res) => {
  const q = db.prepare('SELECT * FROM restaurant_requests WHERE id=?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Not found' });
  const info = db.prepare('INSERT INTO restaurants (name, area, meal, timings, verified, contact_person, contact_email, contact_phone) VALUES (?,?,?,?,1,?,?,?)')
    .run(q.name, q.area, q.meal || 'Meal of the day', q.timings || '12:00 PM - 9:00 PM', q.contact_name || '', q.contact_email || '', q.contact_phone || '');
  // Copy the meals the restaurant picked on its join form onto its menu.
  let mealList = [];
  try { mealList = JSON.parse(q.meals || '[]'); } catch {}
  mealList = parseMeals(mealList, 250);
  for (const m of mealList) db.prepare('INSERT INTO restaurant_meals (restaurant_id, name, price_pkr) VALUES (?,?,?)').run(info.lastInsertRowid, m.name, m.price);
  // The owner account is created automatically, so the owner can log in
  // with the email from the request + the password they chose on the form.
  let ownerCreated = false, tempPassword = null, ownerEmail = (q.contact_email || '').trim().toLowerCase(), ownerNote = '';
  if (!ownerEmail) {
    ownerNote = 'No email on the request, so no owner account was created';
  } else if (db.prepare('SELECT id FROM users WHERE email=?').get(ownerEmail)) {
    ownerNote = 'An account with that email already exists — no new owner account was created';
  } else {
    let hash = q.owner_password_hash;
    if (!hash) {
      // Request from before passwords existed: make a temporary one and
      // show it to the admin, who passes it to the owner.
      tempPassword = crypto.randomBytes(6).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 10);
      hash = hashPassword(tempPassword);
    }
    db.prepare("INSERT INTO users (name, email, password_hash, role, restaurant_id) VALUES (?,?,?, 'owner', ?)")
      .run(q.name, ownerEmail, hash, info.lastInsertRowid);
    ownerCreated = true;
  }
  db.prepare("UPDATE restaurant_requests SET status='approved' WHERE id=?").run(q.id);
  res.json({ restaurant: db.prepare('SELECT * FROM restaurants WHERE id=?').get(info.lastInsertRowid), meals: restMeals(info.lastInsertRowid), ownerCreated, tempPassword, ownerEmail, ownerNote });
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
