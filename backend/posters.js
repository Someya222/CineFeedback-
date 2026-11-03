// Fetches movie posters (Apple iTunes first, Wikipedia as backup) and saves them to the database.
// Safe to stop (Ctrl+C) and run again: finished movies are remembered, the rest are retried.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Movie = require('./models/Movie');

const CACHE = path.join(__dirname, 'poster-cache.json');
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const LIMIT = Number(process.argv[2]) || Infinity; // e.g. npm run posters -- 30
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');

async function search(title, year) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&media=movie&entity=movie&country=us&limit=10`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (r.status === 403 || r.status === 429) return { rateLimited: true };
    if (!r.ok) throw new Error('status ' + r.status);
    const d = await r.json();
    const cands = (d.results || []).filter((x) => norm(x.trackName).startsWith(norm(title)));
    const hit = cands.find((x) => !year || Math.abs(new Date(x.releaseDate).getFullYear() - year) <= 1) || cands[0];
    return { url: hit && hit.artworkUrl100 ? hit.artworkUrl100.replace(/\d+x\d+bb/, '400x600bb') : '' };
  } finally {
    clearTimeout(timer);
  }
}

// Wikipedia call with a pause after every request and automatic waiting when it says "429 slow down"
async function wikiGet(params) {
  for (let i = 0; i < 4; i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    let r;
    try {
      r = await fetch('https://en.wikipedia.org/w/api.php?format=json&' + params, {
        signal: ctrl.signal, headers: { 'User-Agent': 'CineFeedback-college-project/1.0' },
      });
    } finally {
      clearTimeout(timer);
    }
    if (r.status === 429) {
      const wait = Math.min((Number(r.headers.get('retry-after')) || 20) * 1000, 60000);
      console.log(`   Wikipedia says slow down, waiting ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }
    if (!r.ok) throw new Error('wikipedia status ' + r.status);
    const j = await r.json();
    await sleep(1200);
    return j;
  }
  throw new Error('wikipedia is busy, run "npm run posters" again in a few minutes');
}

// Film posters on Wikipedia are "non-free" images, so we look for the poster file on the film's page
async function wikiPoster(title, year) {
  const q = encodeURIComponent(`${title} ${year || ''} film`);
  const s1 = await wikiGet(`action=query&list=search&srlimit=5&srsearch=${q}`);
  const hit = ((s1.query && s1.query.search) || []).find((x) => norm(x.title).startsWith(norm(title)));
  if (!hit) return '';
  const s2 = await wikiGet(`action=query&prop=images&imlimit=max&titles=${encodeURIComponent(hit.title)}`);
  const page = Object.values((s2.query && s2.query.pages) || {})[0];
  const bad = /logo|icon|soundtrack|symbol|flag|commons|ambox|edit-|question|wiki/i;
  const files = ((page && page.images) || []).map((i) => i.title).filter((t) => /\.(jpe?g|png)$/i.test(t) && !bad.test(t));
  const file = files.find((f) => /poster/i.test(f)) || files.find((f) => norm(f).includes(norm(title)));
  if (!file) return '';
  const s3 = await wikiGet(`action=query&prop=imageinfo&iiprop=url&iiurlwidth=400&titles=${encodeURIComponent(file)}`);
  const info = Object.values((s3.query && s3.query.pages) || {})[0];
  const ii = info && info.imageinfo && info.imageinfo[0];
  return ii ? ii.thumburl || ii.url || '' : '';
}

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const movies = (await Movie.find().sort({ _id: 1 })).slice(0, LIMIT);
  let fails = 0, found = 0, n = 0;
  console.log(`Fetching posters for ${movies.length} movies. This takes several minutes, please keep this window open...`);
  for (const m of movies) {
    n++;
    if (m.poster) continue;
    let url = cache[m.title] || '';
    if (!url) {
      try {
        const r = await search(m.title, m.year);
        if (r.rateLimited) {
          console.log('   Apple asked us to slow down, waiting 60 seconds...');
          await sleep(60000);
        } else {
          url = r.url || '';
        }
        if (!url) url = await wikiPoster(m.title, m.year);
        if (url) { cache[m.title] = url; fs.writeFileSync(CACHE, JSON.stringify(cache, null, 1)); }
        fails = 0;
      } catch (e) {
        fails++;
        console.log(`   Problem with ${m.title}: ${e.message}`);
        if (fails >= 5) { console.log('Too many problems in a row. Stopping. Wait a few minutes and run "npm run posters" again (finished movies are kept).'); break; }
        continue;
      }
      await sleep(2000);
    }
    if (url) { await Movie.updateOne({ _id: m._id }, { poster: url }); found++; }
    console.log(`[${n}/${movies.length}] ${m.title}: ${url ? 'poster added' : 'no poster found'}`);
  }
  console.log(`Done. ${found} new posters added in this run.`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
