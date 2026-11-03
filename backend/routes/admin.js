const router = require('express').Router();
const mongoose = require('mongoose');
const Review = require('../models/Review');
const { auth, adminOnly } = require('../middleware/auth');
const { getOverview, parseFilters, movieSummary } = require('../utils/analytics');
const { str } = require('../utils/validate');

router.use(auth, adminOnly);

router.get('/stats', async (req, res, next) => {
  try { res.json(await getOverview(new Date(), parseFilters(req.query))); } catch (e) { next(e); }
});

router.get('/flagged', async (req, res, next) => {
  try {
    const status = str(req.query.status, 20);
    const filter = { $or: [{ mismatch: true }, { 'sentiment.label': 'negative' }, { 'reportedBy.0': { $exists: true } }] };
    if (['Open', 'In progress', 'Resolved'].includes(status)) filter['ticket.status'] = status;
    const rows = await Review.find(filter).populate('user', 'name').populate('movie', 'title').sort({ createdAt: -1 }).limit(200).lean();
    res.json(rows.map((r) => ({
      _id: r._id, movie: r.movie ? r.movie.title : '-', user: r.user ? r.user.name : '-', rating: r.rating, text: r.text,
      sentiment: r.sentiment, mismatch: r.mismatch, reported: (r.reportedBy || []).length, hidden: r.hidden, ticket: r.ticket, createdAt: r.createdAt,
    })));
  } catch (e) { next(e); }
});

router.patch('/reviews/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Review not found' });
    const status = str(req.body.status, 20);
    if (!['Open', 'In progress', 'Resolved'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const r = await Review.findByIdAndUpdate(req.params.id,
      { 'ticket.status': status, 'ticket.reply': str(req.body.reply, 500), hidden: req.body.hidden === true }, { new: true });
    if (!r) return res.status(404).json({ error: 'Review not found' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/compare', async (req, res, next) => {
  try {
    const { a, b } = req.query;
    if (!mongoose.isValidObjectId(a) || !mongoose.isValidObjectId(b)) return res.status(400).json({ error: 'Pick two movies to compare' });
    if (a === b) return res.status(400).json({ error: 'Pick two different movies' });
    const [x, y] = await Promise.all([movieSummary(a), movieSummary(b)]);
    if (!x || !y) return res.status(404).json({ error: 'Movie not found' });
    res.json({ a: x, b: y });
  } catch (e) { next(e); }
});

module.exports = router;
