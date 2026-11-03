const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { str } = require('../utils/validate');

const sign = (u) => jwt.sign({ id: String(u._id), role: u.role, name: u.name }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: String(u._id), name: u.name, email: u.email, role: u.role });

router.post('/register', async (req, res, next) => {
  try {
    const name = str(req.body.name, 50), email = str(req.body.email, 100).toLowerCase(), password = str(req.body.password, 100);
    if (name.length < 2) return res.status(400).json({ error: 'Name must be at least 2 characters' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    if (await User.findOne({ email })) return res.status(409).json({ error: 'Email already registered' });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10), role: 'user' });
    res.status(201).json({ token: sign(user), user: pub(user) });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = str(req.body.email, 100).toLowerCase(), password = str(req.body.password, 100);
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Invalid email or password' });
    res.json({ token: sign(user), user: pub(user) });
  } catch (e) { next(e); }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(pub(user));
  } catch (e) { next(e); }
});

module.exports = router;
