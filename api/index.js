// api/index.js — Vercel serverless entry point for the whole Express backend.
// Vercel routes /api/* here (see vercel.json rewrites). The Express app is
// exported, not listened on — Vercel owns the port. The DB lives in /tmp on
// Vercel (see backend/db.js): per-instance, resets on new instances/redeploys.
// Contest demo only — do not treat it as permanent storage.
const app = require('../backend/server');

module.exports = app;
