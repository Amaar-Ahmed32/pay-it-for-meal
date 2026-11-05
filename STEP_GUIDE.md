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
