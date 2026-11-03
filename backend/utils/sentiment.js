const { detectAspects, isMismatch } = require('./insights');

const POS = ['good', 'great', 'amazing', 'love', 'loved', 'brilliant', 'superb', 'wonderful', 'fantastic', 'excellent', 'beautiful', 'awesome'];
const NEG = ['bad', 'boring', 'terrible', 'awful', 'worst', 'poor', 'weak', 'disappointing', 'disappointed', 'slow', 'waste', 'predictable', 'annoying'];

// Used only if the Python service is down, so the app keeps working.
function fallback(text) {
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  const p = words.filter((w) => POS.includes(w)).length;
  const n = words.filter((w) => NEG.includes(w)).length;
  const score = Math.round(((p - n) / Math.max(1, p + n)) * 0.8 * 1e4) / 1e4;
  return { label: score >= 0.05 ? 'positive' : score <= -0.05 ? 'negative' : 'neutral', score };
}

async function classify(text) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const url = (process.env.SENTIMENT_URL || 'http://127.0.0.1:8000') + '/analyze';
    const r = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }), signal: ctrl.signal,
    });
    if (!r.ok) throw new Error('status ' + r.status);
    const d = await r.json();
    return { label: d.label, score: d.score };
  } catch (e) {
    console.warn('Sentiment service unavailable, using fallback:', e.message);
    return fallback(text);
  } finally {
    clearTimeout(timer);
  }
}

async function analyzeReview(text, rating) {
  const sentiment = await classify(text);
  const mismatch = isMismatch(rating, sentiment.label);
  const aspects = detectAspects(text);
  const flagged = mismatch || sentiment.label === 'negative';
  return { sentiment, mismatch, aspects, ticketStatus: flagged ? 'Open' : 'None' };
}

module.exports = { analyzeReview, classify, fallback };
