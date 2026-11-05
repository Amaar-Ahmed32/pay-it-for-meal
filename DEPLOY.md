# Deploy — Pay It Forward Meal (step-by-step copy)

## Order matters: backend first, frontend second

The frontend is built with `VITE_API_URL` baked in at build time. If Vercel builds
it before the Render backend exists, it bakes in `http://localhost:5001/api` and
the public site will be broken (it would try to call your own PC). So:

1. Render backend first → get its URL, e.g. `https://pay-it-forward-meal-backend.onrender.com`
2. Vercel frontend second, with `VITE_API_URL=<that URL>/api`

## 1. GitHub repo (needed by both Render and Vercel)

This code is not in git yet. Create a repo, e.g. `pay-it-forward-meal`, under
Amaar-Ahmed32, and push THIS folder (`pay-it-forward-meal-step-by-step/`) as the
repo root. Do not push `node_modules/`, `dist/`, `backend/data/*.db`, or `.env`
— `.gitignore` already excludes them. Do not push your PC's test database
(Testing Restaurant, test donations) — Render will seed a fresh, clean one.

## 2. Render — backend

- Render Dashboard → New → Blueprint → connect the repo → Render reads `render.yaml`.
- Free plan. Start command `npm start`, health check `/api/stats`.
- Render sets `JWT_SECRET` automatically (generateValue). `PAYMENT_MODE=sandbox`.
- First start seeds a clean database: 0/0/0, 3 verified restaurants, admin only.
- **Free-plan warning:** Render's disk is ephemeral and free services sleep after
  inactivity. The database resets on redeploy/restart, and the first request after
  sleep can take ~50 seconds to wake up. That is fine for a contest demo, not for
  real data. Never treat the Render database as the real record.
- After pgw@jazz.com.pk replies with sandbox keys, add them in the Render
  dashboard (Environment), and set `JAZZCASH_RETURN_URL` to
  `https://<your-render-service>.onrender.com/api/payments/jazzcash/return`.
  Never commit keys to git, chat, or email.

## 3. Vercel — frontend

- Vercel team `amaar-dev1` is already connected. New project from the same repo,
  root directory `frontend/`, framework Vite.
- Environment variable (Production + Preview): `VITE_API_URL=<render-url>/api`
- **After setting the variable, redeploy** — changing it needs a rebuild.
- New Vercel projects default to SSO / deployment protection ON. For a public
  contest demo, turn it OFF for production (Project Settings → Deployment
  Protection), then curl-check the URL in a private window: it must return the
  site without a Vercel login page. Previous projects (clipforge, stericx-demo)
  hit exactly this trap.

## 4. Verify the public site end to end

Finder (no login) → sign up a test donor → Donate 2 (sandbox) → admin creates
staff linked to Sindh Biryani House → staff Serve 1 → donor sees
"Your meal was served" → Transparency shows it. Then reset the Render database
for contest day (redeploy the service, or delete and re-seed via a fresh deploy)
so the demo starts clean.
