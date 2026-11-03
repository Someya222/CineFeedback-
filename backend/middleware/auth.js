const jwt = require('jsonwebtoken');

function readToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

function auth(req, res, next) {
  const t = readToken(req);
  if (!t) return res.status(401).json({ error: 'Login required' });
  try {
    req.user = jwt.verify(t, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, res, next) {
  const t = readToken(req);
  if (t) {
    try { req.user = jwt.verify(t, process.env.JWT_SECRET); } catch { /* ignore */ }
  }
  next();
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access only' });
  next();
}

module.exports = { auth, optionalAuth, adminOnly };
