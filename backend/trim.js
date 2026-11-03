// Keeps only movies that have a poster (optionally only N of them) and removes the rest.
// Usage:  npm run trim            -> keep all movies that have posters
//         npm run trim -- 20      -> keep 20 movies with posters (mix of Bollywood and Hollywood)
require('dotenv').config();
const mongoose = require('mongoose');
const Movie = require('./models/Movie');
const Review = require('./models/Review');
const Watchlist = require('./models/Watchlist');

(async () => {
  const keep = Number(process.argv[2]) || Infinity;
  await mongoose.connect(process.env.MONGO_URI);
  const movies = await Movie.find().sort({ _id: 1 });
  const withPoster = movies.filter((m) => m.poster);
  const hi = withPoster.filter((m) => m.language === 'Hindi');
  const en = withPoster.filter((m) => m.language !== 'Hindi');
  const chosen = [];
  for (let i = 0; chosen.length < keep && (i < hi.length || i < en.length); i++) {
    if (hi[i] && chosen.length < keep) chosen.push(hi[i]);
    if (en[i] && chosen.length < keep) chosen.push(en[i]);
  }
  if (chosen.length === 0) { console.log('No movie has a poster yet. Run "npm run posters" first.'); await mongoose.disconnect(); return; }
  const keepIds = new Set(chosen.map((m) => String(m._id)));
  const removeIds = movies.filter((m) => !keepIds.has(String(m._id))).map((m) => m._id);
  await Promise.all([
    Movie.deleteMany({ _id: { $in: removeIds } }),
    Review.deleteMany({ movie: { $in: removeIds } }),
    Watchlist.deleteMany({ movie: { $in: removeIds } }),
  ]);
  console.log(`Kept ${chosen.length} movies with posters, removed ${removeIds.length} movies.`);
  console.log('Kept: ' + chosen.map((m) => m.title).join(', '));
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
