# Contest-day demo plan — Pay It Forward Meal

Do this close to contest day, not weeks early — the data will change again before then.

## 1. Public demo link (so a judge can open it on their phone)

Right now the frontend talks to `http://localhost:5001/api`. That only works on your own PC.
The code is now ready for a public link: `frontend/src/App.jsx` reads `VITE_API_URL`
if it is set, and falls back to localhost if it is not. So:

1. **Backend — free host (e.g. Render, free web service):**
   - New Web Service from this project's `backend/` folder, start command `node server.js`.
   - Environment: `PORT` (the host sets it), `PAYMENT_MODE=sandbox`.
   - Note: the free host's disk is throwaway — that is fine for a demo, it is NOT for real data.
   - You get a URL like `https://pay-it-forward-meal.onrender.com` — the API is at that URL + `/api`.
2. **Frontend — free host (e.g. Vercel):**
   - Import the `frontend/` folder, build command `npm run build`.
   - Environment variable: `VITE_API_URL=https://pay-it-forward-meal.onrender.com/api`
     (use YOUR backend URL, not this example).
   - Redeploy after setting that variable — changing it needs a rebuild, it is baked in at build time.
3. **Test the public link end to end before contest day:**
   Finder (no login) → sign up a test donor → Donate 2 (sandbox) → admin creates staff
   → staff Serve 1 → donor sees "Your meal was served" → Transparency shows it.
4. **After the contest, take the demo down or reset it.** The seeded admin password
   (`admin@payitforward.school / Admin123!`) is in the code, so a public demo database
   must never be reused for real restaurants or real donors.

If you cannot deploy in time, the fallback is: demo on your own laptop, judges watch
over your shoulder, plus the backup video below. A local-only demo still works — a
public link is better, not required.

## 2. Contest-day reset (clean start, no test history)

On the machine / host you will demo from:

1. Stop the backend (`Ctrl+C` in its terminal).
2. Delete the demo database file: `backend/data/payitforward.db`
3. Restart the backend (`npm start`) — it re-seeds clean: 0 donated / 0 served / 0 available,
   3 verified restaurants (Sindh Rs 300, Mehran Rs 250, Al-Madina Rs 280) + 1 unverified,
   admin account only.
4. Create fresh demo accounts: one donor (sign up on the site), one staff (admin creates,
   linked to Sindh Biryani House).
5. Do ONE full test donation + serve, then decide: keep that one as your live demo
   history, or reset once more and demo it live in front of the judges (better).

## 3. Backup video (2 minutes, record on your phone / screen recorder)

Record this in one take, no editing needed, in case the venue has no internet:

- 0:00–0:15 — Home: hero, live dashboard, pilot goal bar.
- 0:15–0:45 — Donate 2 meals at Sindh Biryani House, Sandbox Checkout, Pay → Available +2.
- 0:45–1:15 — Staff page: big Serve button → Serve 1 → available drops, served rises.
- 1:15–1:45 — My Donations: "Your meal was served" message + Print receipt.
- 1:45–2:00 — Transparency page + close: "SDG 1 + SDG 2, no recipient data ever stored."

Save the video on the laptop AND on your phone. If the live demo fails, play the video
and talk over it — that still proves the flow works.

## 4. Judge try-it card (print this, put it next to the laptop)

- Public demo link (or: "ask me, I will open it on this laptop").
- Try it yourself: sign up as a donor (any name/email, min 6-char password) → Donate.
- Admin (demo only): admin@payitforward.school / Admin123!
- Staff: created by admin during the demo, linked to one restaurant.
- Payment is sandbox/test mode in the pilot — no real money moves, by design.

## Still Phase 2 — mention on a slide, do NOT build before the contest

Real WhatsApp/SMS "your meal was served" messages, full Urdu/Sindhi paragraph
translation, and a Disputes system. Mentioning them as "next step" is honest and safe;
building them now risks breaking the working demo.
