const router = require('express').Router();
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Movie = require('../models/Movie');
const { auth, optionalAuth } = require('../middleware/auth');
const { analyzeReview } = require('../utils/sentiment');
const { str } = require('../utils/validate');

const validId = (id) => mongoose.isValidObjectId(id);

function parseBody(b) {
  const rating = Number(b.rating);
  const text = str(b.text, 1000);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Rating must be a whole number from 1 to 5' };
  if (text.length < 3) return { error: 'Review must be at least 3 characters' };
  return { rating, text };
}

const result = (r) => ({ id: r._id, sentiment: r.sentiment, aspects: r.aspects, mismatch: r.mismatch, flagged: r.ticket.status !== 'None' });

router.get('/movies/:movieId/reviews', optionalAuth, async (req, res, next) => {
  try {
    if (!validId(req.params.movieId)) return res.status(404).json({ error: 'Movie not found' });
    const reviews = (await Review.find({ movie: req.params.movieId, hidden: false }).populate('user', 'name').sort({ createdAt: -1 }).limit(100).lean())
      .map((r) => ({
        _id: r._id, user: r.user ? r.user.name : 'User', userId: r.user ? String(r.user._id) : null,
        rating: r.rating, text: r.text, sentiment: r.sentiment, aspects: r.aspects,
        likes: r.likes.length, liked: req.user ? r.likes.some((l) => String(l) === req.user.id) : false, createdAt: r.createdAt,
      }));
    if (req.query.sort === 'likes') reviews.sort((a, b) => b.likes - a.likes);
    let mine = null;
    if (req.user) {
      const m = await Review.findOne({ movie: req.params.movieId, user: req.user.id }).lean();
      if (m) mine = { _id: m._id, rating: m.rating, text: m.text, hidden: m.hidden };
    }
    res.json({ reviews, mine });
  } catch (e) { next(e); }
});

router.post('/movies/:movieId/reviews', auth, async (req, res, next) => {
  try {
    if (!validId(req.params.movieId) || !(await Movie.exists({ _id: req.params.movieId }))) return res.status(404).json({ error: 'Movie not found' });
    const p = parseBody(req.body);
    if (p.error) return res.status(400).json({ error: p.error });
    const a = await analyzeReview(p.text, p.rating);
    try {
      const r = await Review.create({
        user: req.user.id, movie: req.params.movieId, rating: p.rating, text: p.text,
        sentiment: a.sentiment, aspects: a.aspects, mismatch: a.mismatch, ticket: { status: a.ticketStatus },
      });
      res.status(201).json(result(r));
    } catch (e) {
      if (e.code === 11000) return res.status(409).json({ error: 'You already reviewed this movie. Edit your review instead.' });
      throw e;
    }
  } catch (e) { next(e); }
});

router.put('/reviews/:id', auth, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Review not found' });
    const r = await Review.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Review not found' });
    if (String(r.user) !== req.user.id) return res.status(403).json({ error: 'You can only edit your own review' });
    const p = parseBody(req.body);
    if (p.error) return res.status(400).json({ error: p.error });
    const a = await analyzeReview(p.text, p.rating);
    r.rating = p.rating; r.text = p.text; r.sentiment = a.sentiment; r.aspects = a.aspects; r.mismatch = a.mismatch;
    r.ticket.status = a.ticketStatus === 'None' ? 'None' : (r.ticket.status === 'In progress' ? 'In progress' : 'Open');
    await r.save();
    res.json(result(r));
  } catch (e) { next(e); }
});

router.delete('/reviews/:id', auth, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Review not found' });
    const r = await Review.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Review not found' });
    if (String(r.user) !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not allowed' });
    await r.deleteOne();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/reviews/:id/like', auth, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Review not found' });
    const r = await Review.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Review not found' });
    const i = r.likes.findIndex((l) => String(l) === req.user.id);
    if (i >= 0) r.likes.splice(i, 1); else r.likes.push(req.user.id);
    await r.save();
    res.json({ likes: r.likes.length, liked: i < 0 });
  } catch (e) { next(e); }
});

router.post('/reviews/:id/report', auth, async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(404).json({ error: 'Review not found' });
    const r = await Review.findById(req.params.id);
    if (!r) return res.status(404).json({ error: 'Review not found' });
    if (String(r.user) === req.user.id) return res.status(400).json({ error: 'You cannot report your own review' });
    if (r.reportedBy.some((u) => String(u) === req.user.id)) return res.status(409).json({ error: 'You already reported this review' });
    r.reportedBy.push(req.user.id);
    if (r.ticket.status === 'None' || r.ticket.status === 'Resolved') r.ticket.status = 'Open';
    await r.save();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/me/reviews', auth, async (req, res, next) => {
  try {
    const rows = await Review.find({ user: req.user.id }).populate('movie', 'title poster genre year').sort({ createdAt: -1 }).lean();
    res.json(rows.filter((r) => r.movie).map((r) => ({
      _id: r._id, rating: r.rating, text: r.text, sentiment: r.sentiment, hidden: r.hidden, createdAt: r.createdAt, movie: r.movie,
    })));
  } catch (e) { next(e); }
});

module.exports = router;
