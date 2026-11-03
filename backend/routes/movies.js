const router = require('express').Router();
const mongoose = require('mongoose');
const Movie = require('../models/Movie');
const Review = require('../models/Review');
const Watchlist = require('../models/Watchlist');
const { auth, adminOnly } = require('../middleware/auth');
const { str, escapeRegex } = require('../utils/validate');
const I = require('../utils/insights');

function movieBody(b) {
  const year = Number(b.year);
  return {
    title: str(b.title, 120), genre: str(b.genre, 40), language: str(b.language, 40) || 'Hindi',
    year: Number.isInteger(year) && year > 1890 && year < 2100 ? year : undefined,
    director: str(b.director, 80),
    cast: str(b.cast, 300).split(',').map((s) => s.trim()).filter(Boolean),
    poster: str(b.poster, 500), synopsis: str(b.synopsis, 1500),
  };
}

router.get('/', async (req, res, next) => {
  try {
    const search = str(req.query.search, 60), genre = str(req.query.genre, 40), sort = str(req.query.sort, 20);
    const filter = {};
    if (search) filter.title = { $regex: escapeRegex(search), $options: 'i' };
    if (genre) filter.genre = genre;
    const movies = await Movie.find(filter).lean();
    const stats = await Review.aggregate([
      { $match: { hidden: false } },
      { $group: { _id: '$movie', avg: { $avg: '$rating' }, count: { $sum: 1 },
          pos: { $sum: { $cond: [{ $eq: ['$sentiment.label', 'positive'] }, 1, 0] } } } },
    ]);
    const map = new Map(stats.map((s) => [String(s._id), s]));
    const out = movies.map((m) => {
      const s = map.get(String(m._id));
      return { ...m, avgRating: s ? Math.round(s.avg * 100) / 100 : 0, reviewCount: s ? s.count : 0, positivePct: s ? I.pct(s.pos, s.count) : 0 };
    });
    if (sort === 'title') out.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'reviews') out.sort((a, b) => b.reviewCount - a.reviewCount);
    else if (sort === 'newest') out.sort((a, b) => (b.year || 0) - (a.year || 0));
    else out.sort((a, b) => b.avgRating - a.avgRating);
    res.json(out);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Movie not found' });
    const movie = await Movie.findById(req.params.id).lean();
    if (!movie) return res.status(404).json({ error: 'Movie not found' });
    const rs = (await Review.find({ movie: movie._id, hidden: false }).select('rating sentiment aspects').lean())
      .map((r) => ({ rating: r.rating, label: r.sentiment.label, aspects: r.aspects }));
    const count = (l) => rs.filter((r) => r.label === l).length;
    const distribution = [5, 4, 3, 2, 1].map((n) => rs.filter((r) => r.rating === n).length);
    const similar = await Movie.find({ genre: movie.genre, _id: { $ne: movie._id } }).select('title poster genre year').limit(4).lean();
    res.json({
      movie, distribution, similar,
      stats: {
        avgRating: I.average(rs.map((r) => r.rating)), count: rs.length, positivePct: I.pct(count('positive'), rs.length),
        sentiment: { positive: count('positive'), neutral: count('neutral'), negative: count('negative') },
      },
      aspects: { praised: I.countAspects(rs, 'positive').slice(0, 5), criticized: I.countAspects(rs, 'negative').slice(0, 5) },
    });
  } catch (e) { next(e); }
});

router.post('/', auth, adminOnly, async (req, res, next) => {
  try {
    const b = movieBody(req.body);
    if (!b.title || !b.genre) return res.status(400).json({ error: 'Title and genre are required' });
    res.status(201).json(await Movie.create(b));
  } catch (e) { next(e); }
});

router.put('/:id', auth, adminOnly, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Movie not found' });
    const b = movieBody(req.body);
    if (!b.title || !b.genre) return res.status(400).json({ error: 'Title and genre are required' });
    const m = await Movie.findByIdAndUpdate(req.params.id, b, { new: true });
    if (!m) return res.status(404).json({ error: 'Movie not found' });
    res.json(m);
  } catch (e) { next(e); }
});

router.delete('/:id', auth, adminOnly, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Movie not found' });
    await Promise.all([Review.deleteMany({ movie: req.params.id }), Watchlist.deleteMany({ movie: req.params.id })]);
    await Movie.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
