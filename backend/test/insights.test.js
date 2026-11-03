const test = require('node:test');
const assert = require('node:assert');
const I = require('../utils/insights');

const NOW = new Date('2026-11-01T12:00:00Z');
const daysAgo = (d) => new Date(NOW.getTime() - d * 86400000);
const rev = (movieTitle, label, d, aspects = []) => ({ movieTitle, label, aspects, rating: 3, createdAt: daysAgo(d) });

test('detectAspects finds aspects in text', () => {
  const a = I.detectAspects('Great acting but the ending was weak and the second half dragged');
  assert.ok(a.includes('acting'));
  assert.ok(a.includes('ending'));
  assert.ok(a.includes('pacing'));
});

test('isMismatch flags contradicting rating and sentiment', () => {
  assert.strictEqual(I.isMismatch(5, 'negative'), true);
  assert.strictEqual(I.isMismatch(1, 'positive'), true);
  assert.strictEqual(I.isMismatch(5, 'positive'), false);
  assert.strictEqual(I.isMismatch(3, 'negative'), false);
});

test('average (rating aggregation) is correct', () => {
  assert.strictEqual(I.average([5, 4, 3]), 4);
  assert.strictEqual(I.average([]), 0);
  assert.strictEqual(I.average([4, 5]), 4.5);
});

test('buildAlerts fires on a spike of negative reviews', () => {
  const reviews = [
    ...Array.from({ length: 6 }, () => rev('Dark Mumbai', 'negative', 2, ['ending'])),
    rev('Dark Mumbai', 'negative', 10, ['story']),
    ...Array.from({ length: 6 }, () => rev('Calm Movie', 'positive', 2)),
  ];
  const alerts = I.buildAlerts(reviews, NOW);
  assert.strictEqual(alerts.length, 1);
  assert.strictEqual(alerts[0].movie, 'Dark Mumbai');
  assert.strictEqual(alerts[0].mainComplaint, 'ending');
});

test('buildAlerts stays quiet for small changes', () => {
  const reviews = [rev('A', 'negative', 2), rev('A', 'negative', 3), rev('A', 'negative', 9)];
  assert.strictEqual(I.buildAlerts(reviews, NOW).length, 0);
});

test('weeklyNegativeTrend returns requested number of weeks', () => {
  const t = I.weeklyNegativeTrend([rev('A', 'negative', 1), rev('A', 'positive', 1)], NOW, 8);
  assert.strictEqual(t.length, 8);
  assert.strictEqual(t[7].negativePct, 50);
});
