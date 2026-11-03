import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Stars, SentTag } from '../components.jsx';

export default function MyReviews() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState('');
  const load = () => api.get('/me/reviews').then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!window.confirm('Delete this review?')) return;
    await api.del(`/reviews/${id}`);
    load();
  }

  const avg = rows.length ? (rows.reduce((a, r) => a + r.rating, 0) / rows.length).toFixed(1) : '-';
  const pos = rows.filter((r) => r.sentiment.label === 'positive').length;

  return (
    <main>
      <h1>My Reviews</h1>
      {err && <div className="alert">{err}</div>}
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <div className="card kpi"><div className="n">{rows.length}</div>Reviews written</div>
        <div className="card kpi"><div className="n">{avg}</div>Your average rating</div>
        <div className="card kpi"><div className="n">{pos}</div>Positive reviews</div>
      </div>
      {rows.length === 0 && <p className="muted">You have not reviewed any movie yet. <Link to="/movies">Browse movies</Link></p>}
      {rows.map((r) => (
        <div className="card review" key={r._id}>
          <div><Link to={`/movies/${r.movie._id}`}><b>{r.movie.title}</b></Link> <Stars value={r.rating} /> <SentTag label={r.sentiment.label} />
            {r.hidden && <span className="tag mismatch">hidden by admin</span>}</div>
          <p>{r.text}</p>
          <div className="muted">{new Date(r.createdAt).toLocaleDateString()} ·{' '}
            <Link to={`/movies/${r.movie._id}`}>Edit</Link> ·{' '}
            <a href="#delete" onClick={(e) => { e.preventDefault(); remove(r._id); }}>Delete</a></div>
        </div>
      ))}
    </main>
  );
}
