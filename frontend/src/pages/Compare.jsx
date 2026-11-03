import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../api.js';
import { Poster, Stars } from '../components.jsx';

function Side({ m }) {
  return (
    <div className="card">
      <Poster movie={m} h={220} />
      <h2>{m.title}</h2>
      <p className="muted">{m.genre} · {m.language} · {m.year || '-'}</p>
      <div className="big"><Stars value={m.avgRating} /> {m.avgRating} / 5</div>
      <table>
        <tbody>
          <tr><td>Reviews</td><td>{m.reviews}</td></tr>
          <tr><td>Positive</td><td>{m.positivePct}%</td></tr>
          <tr><td>Negative</td><td>{m.negativePct}%</td></tr>
          <tr><td>Top complaint</td><td>{m.topComplaint}</td></tr>
        </tbody>
      </table>
      <div style={{ marginTop: 8 }}>
        {m.praised.map((a) => <span key={a[0]} className="chip good">{a[0]} ({a[1]})</span>)}
        {m.criticized.map((a) => <span key={a[0]} className="chip bad">{a[0]} ({a[1]})</span>)}
      </div>
    </div>
  );
}

export default function Compare() {
  const [movies, setMovies] = useState([]);
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [res, setRes] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api.get('/movies?sort=title').then(setMovies).catch((e) => setErr(e.message)); }, []);

  async function run() {
    setErr(''); setRes(null);
    try { setRes(await api.get(`/admin/compare?a=${a}&b=${b}`)); } catch (e) { setErr(e.message); }
  }

  let verdict = '';
  if (res) {
    const d = Math.round((res.a.avgRating - res.b.avgRating) * 100) / 100;
    verdict = d === 0 ? 'Both movies have the same average rating.'
      : `${d > 0 ? res.a.title : res.b.title} leads by ${Math.abs(d)} rating points, and ${res.a.positivePct >= res.b.positivePct ? res.a.title : res.b.title} has the higher share of positive reviews.`;
  }
  const chart = res ? [0, 1, 2, 3, 4].map((i) => ({ star: `${5 - i} star`, a: res.a.distribution[i], b: res.b.distribution[i] })) : [];

  return (
    <main>
      <h1>Compare Movies</h1>
      <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, alignItems: 'end' }}>
        <div><label>Movie A</label>
          <select value={a} onChange={(e) => setA(e.target.value)}><option value="">Select...</option>{movies.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}</select></div>
        <div><label>Movie B</label>
          <select value={b} onChange={(e) => setB(e.target.value)}><option value="">Select...</option>{movies.map((m) => <option key={m._id} value={m._id}>{m.title}</option>)}</select></div>
        <div><button className="btn" onClick={run} disabled={!a || !b}>Compare</button></div>
      </div>
      {err && <div className="alert">{err}</div>}
      {res && (
        <>
          <div className="insight" style={{ marginTop: 16 }}>{verdict}</div>
          <div className="grid g2" style={{ marginTop: 8 }}><Side m={res.a} /><Side m={res.b} /></div>
          <div className="card" style={{ marginTop: 16 }}>
            <h3>Rating distribution</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a3050" /><XAxis dataKey="star" stroke="#9fa8da" /><YAxis stroke="#9fa8da" /><Tooltip /><Legend />
                <Bar dataKey="a" name={res.a.title} fill="#4fc3f7" /><Bar dataKey="b" name={res.b.title} fill="#ff4d6d" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </main>
  );
}
