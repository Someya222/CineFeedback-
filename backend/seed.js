require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Movie = require('./models/Movie');
const Review = require('./models/Review');
const Watchlist = require('./models/Watchlist');
const { detectAspects, isMismatch } = require('./utils/insights');

const rnd = (a, b) => Math.random() * (b - a) + a;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const DAY = 86400000;

const fs = require('fs');
const path = require('path');
const MOVIE_LIST = require('./data/movies'); // 100 real Bollywood + Hollywood movies (works offline)
const CACHE = path.join(__dirname, 'poster-cache.json');
const posterCache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const PLANTED_TITLE = 'Animal'; // movie that gets the demo "ending" complaints spike

const POS = ['Amazing acting and a gripping story, loved it', 'Brilliant direction and the music was fantastic', 'Superb screenplay and great performances all around',
  'Beautiful visuals and a wonderful soundtrack', 'Loved the dialogues, hilarious and well made', 'Excellent movie, a must watch with a great climax'];
const NEG = ['The story was slow and boring, pacing was terrible', 'Weak acting and bad writing, very disappointing', 'Songs were annoying and the second half dragged',
  'Predictable plot and poor dialogues, waste of time', 'Terrible direction, I regret watching this'];
const NEU = ['It was okay, nothing special', 'Average movie, watchable once', 'Decent but forgettable'];
const ENDING_NEG = ['The ending ruined the whole movie, terrible climax', 'Disappointing ending, the climax felt rushed and weak', 'Great first half but the ending was a letdown'];

(async () => {
  const all = MOVIE_LIST.map((m) => ({ ...m, poster: posterCache[m.title] || '', p: Math.round(rnd(0.5, 0.85) * 100) / 100 }));
  // mix Bollywood and Hollywood one after the other, so poster fetching covers both from the start
  const hi = all.filter((m) => m.language === 'Hindi');
  const en = all.filter((m) => m.language !== 'Hindi');
  const defs = [];
  for (let i = 0; i < Math.max(hi.length, en.length); i++) { if (hi[i]) defs.push(hi[i]); if (en[i]) defs.push(en[i]); }
  const pi = defs.findIndex((m) => m.title === PLANTED_TITLE);
  if (pi > 0) defs.unshift(...defs.splice(pi, 1)); // planted movie goes first
  console.log(`Using ${defs.length} real movies (${defs.filter((m) => m.poster).length} with cached posters).`);

  await mongoose.connect(process.env.MONGO_URI);
  await Promise.all([User.deleteMany({}), Movie.deleteMany({}), Review.deleteMany({}), Watchlist.deleteMany({})]);

  const adminHash = await bcrypt.hash('admin123', 10);
  const demoHash = await bcrypt.hash('demo123', 10);
  const fakeHash = await bcrypt.hash('password123', 10);
  await User.create([
    { name: 'Admin', email: 'admin@cinefeedback.com', password: adminHash, role: 'admin' },
    { name: 'Demo User', email: 'demo@cinefeedback.com', password: demoHash, role: 'user' },
  ]);
  const viewers = await User.insertMany(Array.from({ length: 80 }, (_, i) => ({ name: `Viewer ${i + 1}`, email: `viewer${i + 1}@example.com`, password: fakeHash, role: 'user' })));
  const movies = await Movie.insertMany(defs.map(({ p, ...m }) => m));
  const probs = defs.map((d) => d.p);

  const used = new Set();
  const docs = [];
  function add(movie, kind, whenMs, texts) {
    for (let t = 0; t < 30; t++) {
      const user = pick(viewers);
      const key = `${user._id}-${movie._id}`;
      if (used.has(key)) continue;
      used.add(key);
      let rating = kind === 'pos' ? 4 + Math.round(Math.random()) : kind === 'neg' ? 1 + Math.round(Math.random()) : 3;
      if (kind !== 'neu' && Math.random() < 0.04) rating = 6 - rating; // a few rating/text mismatches
      const text = pick(texts || (kind === 'pos' ? POS : kind === 'neg' ? NEG : NEU));
      const label = kind === 'pos' ? 'positive' : kind === 'neg' ? 'negative' : 'neutral';
      const score = kind === 'pos' ? rnd(0.55, 0.92) : kind === 'neg' ? -rnd(0.5, 0.9) : rnd(-0.03, 0.03);
      const mismatch = isMismatch(rating, label);
      const old = whenMs > 14 * DAY;
      const flagged = mismatch || label === 'negative';
      const status = !flagged ? 'None' : old && Math.random() < 0.8 ? 'Resolved' : 'Open';
      const likes = kind === 'pos' ? viewers.slice(0, Math.floor(rnd(0, 7))).map((v) => v._id) : [];
      const when = new Date(Date.now() - whenMs);
      docs.push({
        user: user._id, movie: movie._id, rating, text, sentiment: { label, score: Math.round(score * 1e4) / 1e4 },
        aspects: detectAspects(text), mismatch, likes, hidden: false,
        ticket: { status, reply: status === 'Resolved' ? 'Thanks for the feedback. We have noted this for the content team.' : '' },
        createdAt: when, updatedAt: when,
      });
      return;
    }
  }

  const total = Math.min(1500, movies.length * 15);
  for (let i = 0; i < total; i++) {
    const idx = Math.floor(Math.random() * movies.length);
    const r = Math.random();
    add(movies[idx], r < probs[idx] ? 'pos' : r < probs[idx] + 0.12 ? 'neu' : 'neg', rnd(0, 56) * DAY);
  }
  // Planted story: complaints about the ending of the first movie in the last 9 days (demo alert)
  for (let i = 0; i < 16; i++) add(movies[0], 'neg', rnd(0, 6.5) * DAY, ENDING_NEG);
  for (let i = 0; i < 4; i++) add(movies[0], 'pos', rnd(0, 9) * DAY);

  await Review.insertMany(docs);
  const demo = await User.findOne({ email: 'demo@cinefeedback.com' });
  await Watchlist.insertMany(movies.slice(1, 4).map((m) => ({ user: demo._id, movie: m._id })));
  console.log(`Seeded ${movies.length} movies, ${viewers.length + 2} users, ${docs.length} reviews.`);
  console.log(`Demo alert planted on: ${movies[0].title}`);
  console.log('Admin: admin@cinefeedback.com / admin123   |   User: demo@cinefeedback.com / demo123');
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
