# Pay It Forward Meal — Step-by-Step Learning Build

School: Jeejal Aman Public School, Bhittaibad
Goal: rebuild the same working site, one file at a time, so every file is understood.

The finished prototype you already have stays untouched at:
`~/workspace/pay-it-forward-meal/`

This learning copy lives at:
`~/workspace/pay-it-forward-meal-step-by-step/`

## New order — FRONTEND FIRST (changed on your say-so)
- [x] backend/package.json — already done earlier, kept for later, not wasted
- [x] Frontend Step 1: frontend setup — package, vite config, index.html (DONE)
- [x] Frontend Step 2: frontend main + styles (DONE — build verified, temporary App shows a page)
- [x] Frontend Step 3: frontend App part 1 — login, Home, Finder (DONE — build verified, backend API on 5001 returns stats 2/1/1)
- [x] Frontend Step 4: frontend App part 2 — Donate, Staff, My Donations, Admin, Leaderboard (DONE — PDF design applied: cream/teal/orange, hero+dashboard, big Serve button, Daily Check; build + preview verified, donate 2 + serve 1 tested: stats 4/2/2)
- [x] Backend file 1: backend/db.js — database tables + seed data (DONE, tested)
- [x] Backend file 2: backend/auth.js — passwords, login token, role checks (DONE)
- [x] Backend file 3: backend/server.js — so npm start works (DONE, tested: register -> donate 2 -> serve 1 -> notification)
- [ ] Final: run frontend + backend together, test, and contest-day reset

Say "next" when you are ready for the next step. Do not skip ahead — each file builds on the previous one.


## Sandbox payments (2026-10-31, done)
- backend/payments.js: meal price Rs 250 (MEAL_PRICE_PKR), txn refs, JazzCash hash helper (verify vs portal).
- backend/server.js: POST /api/payments/initiate (PENDING, Available NOT increased), POST /api/payments/sandbox/confirm (sandbox_paid, Available increased), POST /api/payments/sandbox/cancel, GET /api/payments/jazzcash/return (refuses without keys).
- frontend Donate: Continue to Sandbox Checkout -> Pay Rs amount in Sandbox (simulator, clearly labelled) -> My Donations.
- Tested: initiate 2 JazzCash meals Rs 500 pending (available stayed 2), confirm -> sandbox_paid, available 4, donated 6.
- Signup guide: SANDBOX_SETUP.md. Keys template: backend/.env.example. Never send keys in chat.

## Chunky 3D dark-blue rebuild (2026-11-10, done — approved visuals board)
- Restyle: frontend/src/styles.css + frontend/src/App.jsx rewritten to the approved look —
  deep navy page (#0A1E4A), warm cream cards, 3px ink borders, hard offset shadows,
  press-down pill buttons (tomato red Donate, turmeric yellow highlights, leaf green
  go/served), Fredoka headings + Nunito body (Google Fonts, system fallbacks offline),
  turmeric scrolling ticker under the hero, floating chips, tilting step cards.
  Hamburger menu + 600px/800px mobile fixes kept. All features kept working.
- Hero: new headline "One meal forward, one plate filled today." (old line
  "A normal dinner becomes someone else's dinner." kept underneath) + cartoon
  illustration frontend/public/hero-cartoon.webp (local file, served as
  /hero-cartoon.webp — no external hotlink) of a server handing a hot plate to a
  seated guest, with floating chips "Your meal was served!" and "N meals available today".
- FULL translation: every UI string lives in the T dictionaries in App.jsx
  (en / ur / sd, 253 keys each, verified equal). The language switcher translates
  the whole site and flips dir to rtl for Urdu/Sindhi. Restaurant names,
  "Pay It Forward Meal" and SDG 1/2 stay in English inside translations.
- Restaurant owners add their OWN staff (new): backend role 'owner' linked to one
  restaurant. Routes (server-side enforced, owner = own restaurant only):
  GET /api/restaurant/staff, POST /api/restaurant/staff (name/email/password,
  staffRole Counter/Kitchen/Manager — stored as staff_role on the staff user),
  DELETE /api/restaurant/staff/:id. Admin still creates owners/staff for any
  restaurant via /api/admin/users (now also accepts role 'owner').
  Demo owner seeded: owner@payitforward.school / Owner123! (Sindh Biryani House).
  Frontend: new "Restaurant" page — Dashboard button for owners, team list with
  role badges + Remove, Add-staff form, role-permissions list. Owner login
  redirects to the Restaurant page.
  Old databases are migrated on startup (db.js): users table rebuilt to allow the
  'owner' role (foreign keys off during rebuild, all rows kept), staff_role column
  added, demo owner seeded if none exists.
- NOT built (deliberately): counter QR, meal wallet, slow-connection mode.
  Donor "Your meal was served" notifications were already built — kept.
- Verified 2026-11-10: frontend build clean; owner login + list/add/remove staff
  tested locally; staff/donor get 403 on owner routes; cross-restaurant delete
  returns 404 and the staff member stays; full flow register → sandbox donate 2
  → admin serve → stats consistent.

## Simple like the PDF + dummy data + Admin graphs + logo (2026-11-10, done)
- Hero KEPT exactly as the chunky dark-blue rebuild (cartoon server handing a
  plate, floating chips). The scrolling ticker strip is REMOVED (decoration) and
  the three trust chips are now one plain line — simple, like the teacher's PDF.
- LOGO: header now shows an inline SVG logo mark (gold heart over a serving
  plate in a green ring, file: LogoMark in frontend/src/App.jsx) + the school
  line underneath. The big "Pay It Forward Meal" text title is gone from the
  header (it stays in the footer and on receipts).
- DUMMY DATA (backend/db.js, seedDemoData): fresh/empty DBs seed 42 donated,
  31 served, 11 available — Sindh Biryani House 25/18/7 (Rs 300), Mehran
  Restaurant 12/9/3 (Rs 250), Al-Madina Foods 5/4/1 (Rs 280, price bug fixed —
  its price UPDATE used to run before its INSERT). Demo donors (password
  Demo123!): Ahmed Raza, Sana Khan, Fatima Memon, Bilal Ahmed, plus
  "A kind neighbour" (anonymous). 9 demo donations (txn refs PIFM-DEMO-0001…
  0009), 31 served_meals spread over the last 7 days, 2 "Your meal was served"
  notifications. School name, Bhittaibad and SDG 1 + SDG 2 stay REAL — no fake
  school/area/SDG data. Seed runs ONLY when the DB has zero donations AND zero
  serves, so live data is never overwritten. Reset: stop backend, delete
  backend/data/payitforward.db, restart — it re-seeds 42/31/11.
- ADMIN GRAPH DASHBOARD (Admin page only, never public): summary tiles
  (donated / served / available / served %), SVG bar chart of donated vs
  served per day for the last 7 days, and available-meals bars per restaurant.
  Pure SVG/CSS, no new dependencies. Backend GET /api/admin/report now also
  returns a `daily` series. The report loads automatically with the Admin page.
- SANDBOX verified 2026-11-10 (fresh DB): register donor → initiate 2 JazzCash
  (pending, available stays 11) → confirm → sandbox_paid, 44/31/13 → admin
  serve 1 → 44/32/12 → oldest donor (Ahmed Raza) got the "Your meal was
  served" notification. Restart does NOT re-seed.

## Design audit + redesign (2026-11-10, done — full audit of every colour/button/text)
Audit found and fixed in frontend/src/styles.css + App.jsx:
- 5 greens -> ONE teal #17765f (+ dark #0f5a46, deep text #14532d, served green #2e9e6b); 3 light-green surfaces -> ONE #dcf5ec; legend swatch now matches its bar colour (#f4c35e gold / #2e9e6b green).
- 2 muted greys -> ONE muted #4b5563; one border #e5e7eb (+ #d1d5db for inputs/buttons); one card radius 20px (24px hero/banner, 12px inputs, 999px pills).
- One button system: same height/padding/radius everywhere, one disabled opacity (.6), dark text on orange/yellow, white text only on dark teal/green; inputs now have a focus ring too.
- One heading scale (page h2 28px, card h2 24px, card h3 20px). Dead code removed: .btn.green, .trustbar, .card.dark-panel, header h1 rules, 13 unused translation keys (ticker x6, donatedChip, gRestaurants, transServed/transDonated/transAt/transNone, usersOnFile).
- Inline styles that duplicated CSS moved into classes: .callout, .sandbox-card, .goal-track/.goal-fill, .badge-right, .legend/.dot, .served-number, .staff-row, .avatar.
- Design tokens live in :root in styles.css. Translation parity re-checked: 111 keys in en/ur/sd, no gaps.
- Nothing else changed: dummy data, sandbox, Admin graphs, logo, staff manager, hamburger all kept. Ticker strip still NOT re-added.

## Transparency monthly graph (2026-11-10, done — replaces the anonymous donation feed)
- Transparency page now shows a graph dashboard instead of the "Anonymous donor donated X meals" feed: a bar chart of meals donated vs served per month (last 6 months, grouped bars, value axis, legend below — like the example image), plus per-restaurant available-meals bars and totals. Donor names stay on the Leaderboard only.
- Backend: GET /api/transparency/monthly (public) returns [{month:'2026-06', donated, served}, ...] for the last 6 months. Frontend draws it with pure SVG (MonthlyBars in App.jsx, no new dependencies).
- Demo seed dates spread over Jun-Nov 2026 so the chart has 6 real months: donated Jun 8, Jul 7, Aug 6, Sep 9, Oct 4, Nov 8 = 42; served Jun 6, Jul 5, Aug 4, Sep 6, Oct 2, Nov 8 = 31. A cluster stays in the last 7 days (8 donated, 8 served) so the Admin 7-day chart still has recent data. Totals still exactly 42/31/11. Served rows are counts only — no recipient is ever named.

## Staff photo — compulsory (2026-11-10, done)
- Both staff forms (Admin "Create staff/admin account" AND Restaurant "Add a staff member") REQUIRE a photo of the staff member: image file input (JPG/PNG, max 500KB) with a preview before submitting. The form does not submit without a photo (checked in the browser AND on the server — missing photo = 400, oversized = 400).
- Backend: users.photo TEXT holds the photo as a data URL (migration adds the column to old DBs; the owner-rebuild keeps it). POST /api/restaurant/staff and POST /api/admin/users (staff/owner roles) reject without a valid photo. GET /api/restaurant/staff and GET /api/admin/users return the photo; pubUser includes it.
- Team/staff lists show the photo as a round avatar; staff without a photo (old seeded rows) fall back to teal initials.
- Note: express.json limit raised to 1mb so a ~500KB photo (base64 text) is accepted.
- Demo accounts (all in this file's earlier sections still apply): admin admin@payitforward.school / Admin123!, owner owner@payitforward.school / Owner123! (Sindh Biryani House), demo donors ahmed.raza@demo.school, sana.khan@demo.school, fatima.memon@demo.school, bilal.ahmed@demo.school, kind.neighbour@demo.school — all Demo123!.
- Testing lesson (2026-11-10): NEVER run two backend servers at once on the same port/DB. A stale server from an earlier test kept port 5005 and its DB file; deleting the DB file while it was open caused "disk I/O error" mid-seed (partial demo data) and EADDRINUSE for the new server. Always kill old servers by PID first (never `pkill -f` with the command text — it SIGTERMs your own shell), delete the DB + -journal files, then start ONE server.

## 6 features + low-stock + open/closed (2026-11-12, done)
- **Restaurant form validation + meals:** Join-as-Restaurant AND Admin "Add a restaurant" both require a valid email and a Pakistani mobile 03XX-XXXXXXX (checked in the browser AND on the server, 400 otherwise) plus checkboxes for Chicken Biryani / Beef Biryani / Daal / Chicken Karahi / Vegetable / Roti-Naan and an "Other" free-text meal. New table `restaurant_meals` (id, restaurant_id, name, price_pkr); checked meals are saved there at the restaurant's meal_price_pkr. Seed (only where a restaurant has no meals yet): Sindh Chicken Biryani 300 + Beef Biryani 350, Mehran Chicken Biryani 250 + Daal 200, Al-Madina Chicken Karahi 280 + Roti 50, New Taste Point Vegetable 200 + Daal 180.
- **Owner edits meals + prices:** Restaurant (owner) page lists the menu, edits each meal's price, adds a meal, deletes a meal (confirm first). Routes GET/POST /api/restaurant/meals, PUT/DELETE /api/restaurant/meals/:id — owner-only, own restaurant only. Donate page: after picking a restaurant the donor picks a meal from its menu; price comes from the meal (falls back to meal_price_pkr if the restaurant has no menu yet).
- **Staff on Finder + clickable cards:** Finder cards show staff as small round photo icons (users.photo, initials fallback) in the corner; clicking a card opens a detail view (name, area, timings, menu with prices, available meals, STAFF list with photo/name/role). Claiming is unchanged — ask staff at the restaurant, no login, no form. Demo staff seeded (only where a restaurant has no staff yet): Ali Khan / Manager at Sindh, Sara Bibi / Counter at Mehran, Usman Ali / Counter at Al-Madina — all Demo123!, no photo (initials fallback).
- **Anonymous meal requests:** "Request a meal" form on Home and on the Finder — pick a restaurant, 1–3 meals, optional note. NO name/phone fields anywhere. New table `meal_requests` (id, restaurant_id, meals_needed, note, status pending/fulfilled/cancelled, created_at) — no recipient identity columns. POST /api/requests (public), GET /api/restaurant/requests (owner + own staff), POST /api/restaurant/requests/:id/fulfil (serves 1 meal, decrements available, increments served, creates a serve receipt; rejects if no meals available), POST /api/restaurant/requests/:id/cancel. Pending requests show on the Restaurant (owner) page and the Staff page with a "Requested X meals • HH:MM" line; pending requests older than 24h show as Expired (computed from created_at, no background job).
- **Serve receipt / slip:** after ANY serve (staff Serve, admin serve, fulfilling a request) a receipt is generated — restaurant, date/time (Asia/Karachi), served-by staff name, meal, quantity, price per meal, total Rs, meals served today at that restaurant, meals available remaining. Shown immediately to the staff member as a printable slip (print button, same style as the donor receipt) AND saved: new table `serve_receipts` (id, restaurant_id, staff_user_id, meal_name, quantity, price_pkr, total_pkr, served_at); GET /api/restaurant/receipts (owner + own staff); Admin overview has a "Served receipts" list. Staff serve lets staff pick WHICH meal was served (select from the menu, default first meal).
- **Add / delete authority:** Admin can DELETE a restaurant (confirm first — deletes its meals, requests, receipts, and its staff accounts), DELETE a staff/user account (Admin users list), DELETE a meal (Admin "All menus" area). Owner deletes own staff (already existed) and own meals. All deletes confirm in the UI + server-side role checks. The seeded admin account and the last owner of a restaurant cannot be deleted.
- **Low-stock alert (approved "for later" suggestion):** when a restaurant's available meals drop to 2 or fewer, a warning shows on the Restaurant (owner) page and on the Staff page ("Only X meals left — ask for donations"), and the Finder card shows a low-stock state (≤1 keeps the urgent badge, 2 shows "Low stock — 2 left"). On-screen alerts only — no email/SMS.
- **Open / Closed toggle (approved "for later" suggestion):** new `is_open` flag on restaurants (default open). The owner toggles it from the Restaurant page; admin can toggle it too (Admin prices area). A closed restaurant shows "Closed today" on its Finder card and detail view, takes no new meal requests, takes no donations (both blocked with a clear message), and its staff Serve button is disabled with a clear message. Toggle back to open and everything works again. Server-enforced on POST /api/requests, POST /api/payments/initiate, POST /api/donations (test), POST /api/serve, and request fulfil.
- Translation keys added in en/ur/sd for every new string (menu, request form, receipt, low-stock, closed, deletes). No new npm dependencies; no chart changes. Dummy data still exactly 42/31/11 on a fresh DB. All verified locally 2026-11-12 (see the commit message for the test list) and live after the push.
