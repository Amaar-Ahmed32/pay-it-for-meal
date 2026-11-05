// auth.js — File 2 of the backend. Only job: prove who you are.
// 1) hashPassword: scramble a password before saving it (bcrypt, never plain text).
// 2) checkPassword: compare a login attempt with the scrambled version.
// 3) sign: after a correct login, give the user a JWT token — a signed digital ID card.
//    The token carries id, name, email, role, restaurant_id, and expires in 7 days.
// 4) auth: middleware — every protected route runs this first. No valid token = 401.
// 5) requireRole: middleware — e.g. only 'admin' can verify, only 'staff'/'admin' can Serve.
//    A donor trying to Serve gets 403 even if they guess the URL. This check is on the
//    server, not just hidden buttons in the frontend.

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In production set JWT_SECRET in the environment. The fallback is only for school demo.
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me-before-real-use';

function hashPassword(password) {
  return bcrypt.hashSync(password, 10);
}

function checkPassword(password, hash) {
  return bcrypt.compareSync(password || '', hash);
}

function sign(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, restaurant_id: user.restaurant_id },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Login required' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expired, please login again' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (roles.includes(req.user.role)) return next();
    return res.status(403).json({ error: 'Not allowed for your account type' });
  };
}

// Never send the password hash to the frontend.
function pubUser(u) {
  return u ? { id: u.id, name: u.name, email: u.email, role: u.role, restaurant_id: u.restaurant_id, language: u.language, show_name: u.show_name === undefined || u.show_name === null ? 1 : u.show_name } : null;
}

module.exports = { hashPassword, checkPassword, sign, auth, requireRole, pubUser };
