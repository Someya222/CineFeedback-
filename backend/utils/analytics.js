const Review = require('../models/Review');
const Movie = require('../models/Movie');
const User = require('../models/User');
const I = require('./insights');

const DAY = 86400000;

// Reads and cleans the filter values coming from the URL (?genre=&language=&movie=&days=)
function parseFilters(q = {}) {
  const s = (v) => (typeof v === 'string' ? v.trim().slice(0, 60) : '');
  const days = Number(q.days);
  return { genre: s(q.genre), language: s(q.language), movie: s(q.movie), days: [7, 30, 90].includes(days) ? days : 0 };
}

async function loadData(f = {}) {
  const [allMovies, rows] = await Promise.all([
    Movie.find().lean(),
    Review.find({ hidden: false }).select('movie rating sentiment aspects mismatch createdAt').lean(),
  ]);
  const movies = allMovies.filter((m) =>
    (!f.genre || m.genre === f.genre) && (!f.language || m.language === f.language) && (!f.movie || String(m._id) === f.movie));
  const byId = new Map(movies.map((m) => [String(m._id), m]));
  const reviews = rows.filter((r) => byId.has(String(r.movie))).map((r) => {
    const m = byId.get(String(r.movie));
    return {
      movieId: String(r.movie), movieTitle: m.title, genre: m.genre, rating: r.rating,
      label: r.sentiment.label, aspects: r.aspects || [], mismatch: r.mismatch, createdAt: r.createdAt,
    };
  });
  return { allMovies, movies, reviews };
}

function movieRows(movies, reviews) {
  return movies.map((m) => {
    const rs = reviews.filter((r) => r.movieId === String(m._id));
    const neg = I.countAspects(rs, 'negative');
    return {
      id: String(m._id), title: m.title, genre: m.genre, year: m.year, reviews: rs.length,
      avgRating: I.average(rs.map((r) => r.rating)),
      positivePct: I.pct(rs.filter((r) => r.label === 'positive').length, rs.length),
      negativePct: I.pct(rs.filter((r) => r.label === 'negative').length, rs.length),
      topComplaint: neg[0] ? neg[0][0] : '-',
    };
  });
}

function genreRows(movies, reviews) {
  const genres = [...new Set(movies.map((m) => m.genre))];
  return genres.map((g) => {
    const rs = reviews.filter((r) => r.genre === g);
    return {
      genre: g, reviews: rs.length, avgRating: I.average(rs.map((r) => r.rating)),
      positivePct: I.pct(rs.filter((r) => r.label === 'positive').length, rs.length),
    };
  });
}

async function getOverview(now = new Date(), f = {}) {
  const { allMovies, movies, reviews } = await loadData(f);
  // Time-range filter applies to KPIs and charts; alerts and the weekly trend always look at the full history
  const since = f.days ? new Date(now.getTime() - f.days * DAY) : null;
  const scoped = since ? reviews.filter((r) => new Date(r.createdAt) >= since) : reviews;
  const mrows = movieRows(movies, scoped);
  const grows = genreRows(movies, scoped);
  const [openFlagged, users] = await Promise.all([
    Review.countDocuments({ 'ticket.status': { $in: ['Open', 'In progress'] }, movie: { $in: movies.map((m) => m._id) } }),
    User.countDocuments(),
  ]);
  const count = (l) => scoped.filter((r) => r.label === l).length;
  const titleById = new Map(movies.map((m) => [String(m._id), m.title]));
  const recentRows = await Review.find({ hidden: false, movie: { $in: movies.map((m) => m._id) } })
    .sort({ createdAt: -1 }).limit(8).populate('user', 'name').lean();
  return {
    kpis: {
      totalReviews: scoped.length, movies: movies.length, users, openFlagged,
      avgRating: I.average(scoped.map((r) => r.rating)),
      positivePct: I.pct(count('positive'), scoped.length),
      mismatchCount: scoped.filter((r) => r.mismatch).length,
    },
    sentiment: { positive: count('positive'), neutral: count('neutral'), negative: count('negative') },
    movieRows: mrows,
    genreRows: grows,
    topMovies: mrows.filter((m) => m.reviews >= 3).sort((a, b) => b.avgRating - a.avgRating).slice(0, 5),
    weekly: I.weeklyNegativeTrend(reviews, now),
    topComplaints: I.countAspects(scoped.filter((r) => new Date(r.createdAt) >= new Date(now - 14 * DAY)), 'negative').slice(0, 6),
    alerts: I.buildAlerts(reviews, now),
    insights: I.buildInsights(scoped, mrows, grows, now),
    ratingDist: [5, 4, 3, 2, 1].map((n) => ({ star: n + ' star', count: scoped.filter((r) => r.rating === n).length })),
    recent: recentRows.map((r) => ({
      id: String(r._id), user: r.user ? r.user.name : '-', movie: titleById.get(String(r.movie)) || '-',
      rating: r.rating, label: r.sentiment.label, createdAt: r.createdAt,
    })),
    filters: f,
    options: {
      genres: [...new Set(allMovies.map((m) => m.genre))].sort(),
      languages: [...new Set(allMovies.map((m) => m.language))].sort(),
      movies: allMovies.map((m) => ({ id: String(m._id), title: m.title, genre: m.genre, language: m.language }))
        .sort((a, b) => a.title.localeCompare(b.title)),
    },
  };
}

async function movieSummary(id) {
  const { movies, reviews } = await loadData({ movie: id });
  if (!movies.length) return null;
  const m = movies[0];
  return {
    ...movieRows(movies, reviews)[0], poster: m.poster, language: m.language, director: m.director,
    distribution: [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.rating === n).length),
    praised: I.countAspects(reviews, 'positive').slice(0, 3),
    criticized: I.countAspects(reviews, 'negative').slice(0, 3),
  };
}

module.exports = { getOverview, loadData, movieRows, genreRows, parseFilters, movieSummary };
