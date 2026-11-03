const router = require('express').Router();
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const Review = require('../models/Review');
const { auth, adminOnly } = require('../middleware/auth');
const { getOverview, parseFilters } = require('../utils/analytics');
const { safeCell } = require('../utils/validate');

router.use(auth, adminOnly);

router.get('/pdf', async (req, res, next) => {
  try {
    const type = req.query.type === 'genres' ? 'genres' : 'movies';
    const o = await getOverview(new Date(), parseFilters(req.query));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=cinefeedback-${type}-report.pdf`);
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);
    doc.fontSize(20).text(`CineFeedback - ${type === 'genres' ? 'Genre-wise' : 'Movie-wise'} Report`);
    doc.fontSize(10).fillColor('#555').text('Generated: ' + new Date().toLocaleString());
    doc.moveDown().fillColor('#000').fontSize(12)
      .text(`Total reviews: ${o.kpis.totalReviews}   Average rating: ${o.kpis.avgRating}/5   Positive: ${o.kpis.positivePct}%   Open flagged: ${o.kpis.openFlagged}`);
    doc.moveDown();
    if (type === 'movies') {
      doc.fontSize(14).text('Top Rated Movies').moveDown(0.5).fontSize(10);
      [...o.movieRows].filter((m) => m.reviews > 0).sort((a, b) => b.avgRating - a.avgRating).forEach((m, i) =>
        doc.text(`${i + 1}. ${m.title} (${m.genre}) - ${m.avgRating}/5 | ${m.reviews} reviews | ${m.positivePct}% positive | top complaint: ${m.topComplaint}`));
    } else {
      doc.fontSize(14).text('Genre-wise Feedback').moveDown(0.5).fontSize(10);
      [...o.genreRows].sort((a, b) => b.avgRating - a.avgRating).forEach((g, i) =>
        doc.text(`${i + 1}. ${g.genre} - ${g.avgRating}/5 | ${g.reviews} reviews | ${g.positivePct}% positive`));
    }
    doc.moveDown().fontSize(14).text('Key Insights').moveDown(0.5).fontSize(10);
    o.insights.forEach((t) => doc.text('- ' + t));
    if (o.alerts.length) {
      doc.moveDown().fontSize(14).text('Alerts').moveDown(0.5).fontSize(10);
      o.alerts.forEach((a) => doc.text('- ' + a.text));
    }
    doc.end();
  } catch (e) { next(e); }
});

router.get('/excel', async (req, res, next) => {
  try {
    const o = await getOverview(new Date(), parseFilters(req.query));
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Movies');
    ws.columns = [
      { header: 'Title', key: 'title', width: 28 }, { header: 'Genre', key: 'genre', width: 14 }, { header: 'Year', key: 'year', width: 8 },
      { header: 'Reviews', key: 'reviews', width: 10 }, { header: 'Avg Rating', key: 'avgRating', width: 12 },
      { header: 'Positive %', key: 'positivePct', width: 12 }, { header: 'Negative %', key: 'negativePct', width: 12 }, { header: 'Top Complaint', key: 'topComplaint', width: 16 },
    ];
    o.movieRows.forEach((m) => ws.addRow({ ...m, title: safeCell(m.title) }));
    const gs = wb.addWorksheet('Genres');
    gs.columns = [{ header: 'Genre', key: 'genre', width: 16 }, { header: 'Reviews', key: 'reviews', width: 10 }, { header: 'Avg Rating', key: 'avgRating', width: 12 }, { header: 'Positive %', key: 'positivePct', width: 12 }];
    o.genreRows.forEach((g) => gs.addRow(g));
    const fs = wb.addWorksheet('Flagged Reviews');
    fs.columns = [
      { header: 'Date', key: 'date', width: 12 }, { header: 'Movie', key: 'movie', width: 24 }, { header: 'Rating', key: 'rating', width: 8 },
      { header: 'Sentiment', key: 'sentiment', width: 12 }, { header: 'Mismatch', key: 'mismatch', width: 10 }, { header: 'Status', key: 'status', width: 12 }, { header: 'Review', key: 'text', width: 70 },
    ];
    const flagged = await Review.find({ $or: [{ mismatch: true }, { 'sentiment.label': 'negative' }] }).populate('movie', 'title').sort({ createdAt: -1 }).limit(500).lean();
    flagged.forEach((r) => fs.addRow({
      date: r.createdAt.toISOString().slice(0, 10), movie: safeCell(r.movie ? r.movie.title : '-'), rating: r.rating,
      sentiment: r.sentiment.label, mismatch: r.mismatch ? 'Yes' : 'No', status: r.ticket.status, text: safeCell(r.text),
    }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=cinefeedback-report.xlsx');
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { next(e); }
});

module.exports = router;
