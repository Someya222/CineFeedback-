// Pure functions (no database) so they can be unit tested.
const DAY = 86400000;

const ASPECTS = {
  acting: ['acting', 'actor', 'actress', 'performance'],
  story: ['story', 'plot', 'screenplay', 'writing', 'script'],
  direction: ['direction', 'director'],
  music: ['music', 'song', 'soundtrack'],
  pacing: ['slow', 'pacing', 'boring', 'dragged', 'second half'],
  ending: ['ending', 'climax'],
  visuals: ['visuals', 'cinematography', 'vfx'],
  dialogues: ['dialogue'],
};

function detectAspects(text = '') {
  const t = String(text).toLowerCase();
  return Object.keys(ASPECTS).filter((a) => ASPECTS[a].some((w) => t.includes(w)));
}

function isMismatch(rating, label) {
  return (rating >= 4 && label === 'negative') || (rating <= 2 && label === 'positive');
}

function average(nums) {
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

function pct(part, total) {
  return total ? Math.round((100 * part) / total) : 0;
}

function countAspects(reviews, label) {
  const c = {};
  for (const r of reviews) {
    if (label && r.label !== label) continue;
    for (const a of r.aspects || []) c[a] = (c[a] || 0) + 1;
  }
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

function inWindow(r, start, end) {
  const t = new Date(r.createdAt).getTime();
  return t >= start && t < end;
}

function weeklyNegativeTrend(reviews, now = new Date(), weeks = 8) {
  const n = now.getTime() + 60000;
  const out = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const end = n - w * 7 * DAY;
    const items = reviews.filter((r) => inWindow(r, end - 7 * DAY, end));
    const d = new Date(end - 60000);
    out.push({
      label: `${String(d.getDate()).padStart(2, '0')} ${d.toLocaleString('en', { month: 'short' })}`,
      negativePct: pct(items.filter((r) => r.label === 'negative').length, items.length),
      total: items.length,
    });
  }
  return out;
}

function buildAlerts(reviews, now = new Date()) {
  const n = now.getTime() + 60000;
  const alerts = [];
  const titles = [...new Set(reviews.map((r) => r.movieTitle))];
  for (const t of titles) {
    const neg = reviews.filter((r) => r.movieTitle === t && r.label === 'negative');
    const cur = neg.filter((r) => inWindow(r, n - 7 * DAY, n));
    const prev = neg.filter((r) => inWindow(r, n - 14 * DAY, n - 7 * DAY));
    if (cur.length >= 5 && (prev.length === 0 || cur.length >= prev.length * 1.3)) {
      const top = countAspects(cur)[0];
      const by = prev.length ? ` by ${Math.round((100 * (cur.length - prev.length)) / prev.length)}%` : ' sharply';
      alerts.push({
        movie: t, current: cur.length, previous: prev.length, mainComplaint: top ? top[0] : null,
        text: `${t}: negative reviews rose${by} this week (${prev.length} -> ${cur.length}).${top ? ` Main complaint: ${top[0]}.` : ''}`,
      });
    }
  }
  return alerts.sort((a, b) => b.current - a.current);
}

function buildInsights(reviews, movieRows, genreRows, now = new Date()) {
  const out = [];
  const n = now.getTime() + 60000;
  const rated = movieRows.filter((m) => m.reviews >= 5).sort((a, b) => b.avgRating - a.avgRating);
  if (rated.length) {
    const b = rated[0];
    out.push(`Best rated movie: ${b.title} (${b.avgRating}/5, ${b.positivePct}% positive).`);
    if (rated.length > 1) {
      const w = rated[rated.length - 1];
      out.push(`Lowest rated movie: ${w.title} (${w.avgRating}/5). Most common complaint: ${w.topComplaint}.`);
    }
  }
  const g = genreRows.filter((x) => x.reviews > 0).sort((a, b) => b.avgRating - a.avgRating);
  if (g.length) out.push(`${g[0].genre} is the highest rated genre (${g[0].avgRating}/5).`);
  const recent = reviews.filter((r) => inWindow(r, n - 14 * DAY, n));
  const crit = countAspects(recent, 'negative');
  if (crit.length) out.push(`Most criticised aspect in the last 2 weeks: ${crit[0][0]} (${crit[0][1]} reviews).`);
  const praise = countAspects(recent, 'positive');
  if (praise.length) out.push(`Most praised aspect in the last 2 weeks: ${praise[0][0]} (${praise[0][1]} reviews).`);
  if (reviews.length) {
    const mm = reviews.filter((r) => r.mismatch).length;
    out.push(`${mm} reviews (${pct(mm, reviews.length)}%) have a star rating that contradicts the review text and need verification.`);
  }
  return out;
}

module.exports = { ASPECTS, detectAspects, isMismatch, average, pct, countAspects, weeklyNegativeTrend, buildAlerts, buildInsights };
