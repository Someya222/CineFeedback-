const router = require('express').Router();
const mongoose = require('mongoose');
const Watchlist = require('../models/Watchlist');
const Movie = require('../models/Movie');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/', async (req, res, next) => {
  try {
    const items = await Watchlist.find({ user: req.user.id }).populate('movie').sort({ createdAt: -1 }).lean();
    res.json(items.filter((i) => i.movie).map((i) => i.movie));
  } catch (e) { next(e); }
});

router.post('/:movieId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.movieId) || !(await Movie.exists({ _id: req.params.movieId }))) return res.status(404).json({ error: 'Movie not found' });
    await Watchlist.updateOne({ user: req.user.id, movie: req.params.movieId }, { $setOnInsert: { user: req.user.id, movie: req.params.movieId } }, { upsert: true });
    res.status(201).json({ ok: true });
  } catch (e) { next(e); }
});

router.delete('/:movieId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.movieId)) return res.status(404).json({ error: 'Movie not found' });
    await Watchlist.deleteOne({ user: req.user.id, movie: req.params.movieId });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
