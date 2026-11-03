import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ResponsiveContainer } from 'recharts';
import { api, download } from '../api.js';

const COLORS = ['#2e7d32', '#9e9e9e', '#c62828'];

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [f, setF] = useState({ genre: '', language: '', movie: '', days: '' });
  const [err, setErr] = useState('');
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v)).toString();
  useEffect(() => {
    const load = () => api.get('/admin/stats?' + qs).then((x) => { setD(x); setErr(''); }).catch((e) => setErr(e.message));
    load();
    const t = setInterval(load, 15000); // live: refreshes every 15 seconds
    return () => clearInterval(t);
  }, [qs]);
  const dl = (path, name) => download(path + (path.includes('?') ? '&' : '?') + qs, name).catch((e) => setErr(e.message));
  const setFilter = (k, v) => setF((old) => ({ ...old, [k]: v, ...(k !== 'movie' ? { movie: '' } : {}) }));
  const langLabel = (l) => (l === 'Hindi' ? 'Bollywood (Hindi)' : l === 'English' ? 'Hollywood (English)' : l);

  if (err && !d) return <main><div className="alert">{err}</div></main>;
  if (!d) return <main>Loading...</main>;
  const k = d.kpis;
  const sent = [
    { name: 'Positive', value: d.sentiment.positive }, { name: 'Neutral', value: d.sentiment.neutral }, { name: 'Negative', value: d.sentiment.negative },
  ];

  return (
    <main>
      <div className="row">
        <h1>Admin Dashboard <span className="tag positive" style={{ fontSize: 12, verticalAlign: 'middle' }}>● live</span></h1>
        <span className="spacer" />
        <button className="btn alt" onClick={() => dl('/reports/pdf?type=movies', 'movie-report.pdf')}>PDF (movies)</button>
        <button className="btn alt" onClick={() => dl('/reports/pdf?type=genres', 'genre-report.pdf')}>PDF (genres)</button>
        <button className="btn alt" onClick={() => dl('/reports/excel', 'cinefeedback-report.xlsx')}>Excel</button>
      </div>
      {err && <div className="alert">{err}</div>}

      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, alignItems: 'end', margin: '12px 0' }}>
        <div><label>Industry</label>
          <select value={f.language} onChange={(e) => setFilter('language', e.target.value)}>
            <option value="">All</option>{d.options.languages.map((l) => <option key={l} value={l}>{langLabel(l)}</option>)}
          </select></div>
        <div><label>Genre</label>
          <select value={f.genre} onChange={(e) => setFilter('genre', e.target.value)}>
            <option value="">All genres</option>{d.options.genres.map((g) => <option key={g}>{g}</option>)}
          </select></div>
        <div><label>Movie</label>
          <select value={f.movie} onChange={(e) => setFilter('movie', e.target.value)}>
            <option value="">All movies</option>
            {d.options.movies.filter((m) => (!f.genre || m.genre === f.genre) && (!f.language || m.language === f.language))
              .map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
          </select></div>
        <div><label>Time range</label>
          <select value={f.days} onChange={(e) => setFilter('days', e.target.value)}>
            <option value="">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
          </select></div>
        <div><button className="btn alt" onClick={() => setF({ genre: '', language: '', movie: '', days: '' })}>Reset filters</button></div>
      </div>

      <div className="grid g4">
        {[['Total reviews', k.totalReviews], ['Average rating', k.avgRating + ' / 5'], ['Positive', k.positivePct + '%'], ['Open flagged', k.openFlagged]].map((x) => (
          <div className="card kpi" key={x[0]}><div className="n">{x[1]}</div>{x[0]}</div>
        ))}
      </div>

      <h3 style={{ marginTop: 20 }}>Alerts</h3>
      {d.alerts.length ? d.alerts.map((a) => <div className="alert" key={a.movie}>{a.text}</div>) : <div className="insight">No alerts this week.</div>}
      <h3>Insights</h3>
      {d.insights.map((t, i) => <div className="insight" key={i}>{t}</div>)}

      <div className="grid g2" style={{ marginTop: 16 }}>
        <div className="card"><h3>Sentiment distribution</h3>
          <ResponsiveContainer width="100%" height={260}><PieChart>
            <Pie data={sent} dataKey="value" nameKey="name" outerRadius={90} label>{sent.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie>
            <Tooltip /><Legend />
          </PieChart></ResponsiveContainer></div>
        <div className="card"><h3>Negative reviews % (weekly)</h3>
          <ResponsiveContainer width="100%" height={260}><LineChart data={d.weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" /><XAxis dataKey="label" stroke="#9fa8da" /><YAxis stroke="#9fa8da" /><Tooltip />
            <Line type="monotone" dataKey="negativePct" stroke="#ff4d6d" strokeWidth={2} />
          </LineChart></ResponsiveContainer></div>
        <div className="card"><h3>Genre-wise average rating</h3>
          <ResponsiveContainer width="100%" height={260}><BarChart data={d.genreRows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" /><XAxis dataKey="genre" stroke="#9fa8da" /><YAxis domain={[0, 5]} stroke="#9fa8da" /><Tooltip />
            <Bar dataKey="avgRating" fill="#4fc3f7" />
          </BarChart></ResponsiveContainer></div>
        <div className="card"><h3>Rating distribution</h3>
          <ResponsiveContainer width="100%" height={260}><BarChart data={d.ratingDist}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" /><XAxis dataKey="star" stroke="#9fa8da" /><YAxis stroke="#9fa8da" /><Tooltip />
            <Bar dataKey="count" fill="#ffd54f" />
          </BarChart></ResponsiveContainer></div>
        <div className="card"><h3>Top complaints (last 2 weeks)</h3>
          <ResponsiveContainer width="100%" height={260}><BarChart data={d.topComplaints.map((t) => ({ aspect: t[0], reports: t[1] }))} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" /><XAxis type="number" stroke="#9fa8da" /><YAxis type="category" dataKey="aspect" stroke="#9fa8da" /><Tooltip />
            <Bar dataKey="reports" fill="#ff4d6d" />
          </BarChart></ResponsiveContainer></div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Top rated movies</h3>
        <table>
          <thead><tr><th>Movie</th><th>Genre</th><th>Avg rating</th><th>Reviews</th><th>Positive</th><th>Top complaint</th></tr></thead>
          <tbody>{d.topMovies.map((m) => <tr key={m.id}><td>{m.title}</td><td>{m.genre}</td><td>{m.avgRating}</td><td>{m.reviews}</td><td>{m.positivePct}%</td><td>{m.topComplaint}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <h3>Recent activity</h3>
        <table>
          <thead><tr><th>When</th><th>User</th><th>Movie</th><th>Rating</th><th>Sentiment</th></tr></thead>
          <tbody>{d.recent.map((r) => (
            <tr key={r.id}><td>{new Date(r.createdAt).toLocaleString()}</td><td>{r.user}</td><td>{r.movie}</td>
              <td className="stars">{'★'.repeat(r.rating)}</td><td><span className={`tag ${r.label}`}>{r.label}</span></td></tr>
          ))}</tbody>
        </table>
      </div>
    </main>
  );
}
