const router = require('express').Router();
const Movie = require('../models/Movie');
const Review = require('../models/Review');
const User = require('../models/User');

router.get('/summary', async (req, res, next) => {
  try {
    const [movies, reviews, users, avg] = await Promise.all([
      Movie.countDocuments(), Review.countDocuments({ hidden: false }), User.countDocuments(),
      Review.aggregate([{ $match: { hidden: false } }, { $group: { _id: null, avg: { $avg: '$rating' } } }]),
    ]);
    const since = new Date(Date.now() - 30 * 86400000);
    const agg = await Review.aggregate([
      { $match: { hidden: false, createdAt: { $gte: since } } },
      { $group: { _id: '$movie', n: { $sum: 1 }, avg: { $avg: '$rating' } } },
      { $sort: { n: -1 } }, { $limit: 6 },
    ]);
    const docs = await Movie.find({ _id: { $in: agg.map((a) => a._id) } }).select('title poster genre year').lean();
    const byId = new Map(docs.map((d) => [String(d._id), d]));
    const trending = agg.filter((a) => byId.has(String(a._id)))
      .map((a) => ({ ...byId.get(String(a._id)), recentReviews: a.n, avgRating: Math.round(a.avg * 100) / 100 }));
    res.json({ movies, reviews, users, avgRating: avg[0] ? Math.round(avg[0].avg * 100) / 100 : 0, trending });
  } catch (e) { next(e); }
});

module.exports = router;
