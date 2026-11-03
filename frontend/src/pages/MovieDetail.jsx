import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { Poster, Stars, SentTag } from '../components.jsx';

export default function MovieDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [mine, setMine] = useState(null);
  const [inWatch, setInWatch] = useState(false);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [sort, setSort] = useState('newest');
  const [sent, setSent] = useState('all');

  useEffect(() => { setText(''); setRating(5); setMsg(''); setErr(''); setData(null); setSent('all'); }, [id]);

  const load = useCallback(async () => {
    try {
      const [d, r] = await Promise.all([api.get(`/movies/${id}`), api.get(`/movies/${id}/reviews`)]);
      setData(d);
      setReviews(r.reviews);
      setMine(r.mine);
      if (r.mine) { setRating(r.mine.rating); setText(r.mine.text); }
      if (user) {
        const w = await api.get('/watchlist');
        setInWatch(w.some((m) => m._id === id));
      }
    } catch (e) { setErr(e.message); }
  }, [id, user]);

  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      const r = mine ? await api.put(`/reviews/${mine._id}`, { rating, text }) : await api.post(`/movies/${id}/reviews`, { rating, text });
      setMsg(`Review saved. Detected sentiment: ${r.sentiment.label}.` + (r.mismatch ? ' Your rating and text seem to disagree, so it was flagged for verification.' : ''));
      load();
    } catch (e2) { setErr(e2.message); }
  }

  async function like(rid) {
    try { await api.post(`/reviews/${rid}/like`); load(); } catch (e) { setErr(e.message); }
  }

  async function report(rid) {
    if (!window.confirm('Report this review to the moderators?')) return;
    try { await api.post(`/reviews/${rid}/report`); setMsg('Thanks, the review was sent to the moderators.'); setErr(''); } catch (e) { setErr(e.message); }
  }

  async function removeMine() {
    if (!window.confirm('Delete your review?')) return;
    await api.del(`/reviews/${mine._id}`);
    setText(''); setRating(5); setMsg('Review deleted.');
    load();
  }

  async function toggleWatch() {
    try {
      if (inWatch) await api.del(`/watchlist/${id}`); else await api.post(`/watchlist/${id}`);
      setInWatch(!inWatch);
    } catch (e) { setErr(e.message); }
  }

  if (err && !data) return <main><div className="alert">{err}</div></main>;
  if (!data) return <main>Loading...</main>;
  const { movie, stats, aspects, distribution, similar } = data;
  const s = stats.sentiment;
  const maxD = Math.max(1, ...distribution);

  const sorters = {
    newest: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    helpful: (a, b) => b.likes - a.likes,
    highest: (a, b) => b.rating - a.rating,
    lowest: (a, b) => a.rating - b.rating,
  };
  const shown = reviews.filter((r) => sent === 'all' || r.sentiment.label === sent).sort(sorters[sort]);

  return (
    <main>
      <div className="detail">
        <Poster movie={movie} h={330} />
        <div>
          <h1>{movie.title}</h1>
          <p className="muted">{movie.genre} · {movie.language} · {movie.year || '-'} · Directed by {movie.director || '-'}</p>
          <p>{movie.synopsis}</p>
          <p className="muted">Cast: {(movie.cast || []).join(', ') || '-'}</p>
          <div className="big"><Stars value={stats.avgRating} /> {stats.avgRating || '-'} / 5 <span className="muted">({stats.count} reviews)</span></div>
          <div className="dist">
            {[5, 4, 3, 2, 1].map((n, i) => (
              <div className="barrow" key={n}>
                <span>{n} ★</span>
                <div className="barbg"><div className="barfill" style={{ width: `${(100 * distribution[i]) / maxD}%` }} /></div>
                <span className="muted">{distribution[i]}</span>
              </div>
            ))}
          </div>
          <div className="sentbar">
            <div style={{ width: `${stats.count ? (100 * s.positive) / stats.count : 0}%` }} className="positive" />
            <div style={{ width: `${stats.count ? (100 * s.neutral) / stats.count : 0}%` }} className="neutral" />
            <div style={{ width: `${stats.count ? (100 * s.negative) / stats.count : 0}%` }} className="negative" />
          </div>
          <div className="muted">{s.positive} positive · {s.neutral} neutral · {s.negative} negative</div>
          <div style={{ marginTop: 10 }}>
            {aspects.praised.length > 0 && <div>Viewers praise: {aspects.praised.map((a) => <span key={a[0]} className="chip good">{a[0]} ({a[1]})</span>)}</div>}
            {aspects.criticized.length > 0 && <div>Viewers criticise: {aspects.criticized.map((a) => <span key={a[0]} className="chip bad">{a[0]} ({a[1]})</span>)}</div>}
          </div>
          {user && <button className="btn alt" style={{ marginTop: 12 }} onClick={toggleWatch}>{inWatch ? '✓ In Watchlist (remove)' : '+ Add to Watchlist'}</button>}
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 24 }}>
        <div className="card">
          <h2>{mine ? 'Edit your review' : 'Write a review'}</h2>
          {!user ? <p className="muted">Please login to rate and review.</p> : (
            <form onSubmit={submit}>
              <label>Rating</label>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} - {'★'.repeat(n)}</option>)}
              </select>
              <label>Review</label>
              <textarea rows="4" value={text} onChange={(e) => setText(e.target.value)} placeholder="What did you think?" required />
              <button className="btn" type="submit">{mine ? 'Update review' : 'Submit review'}</button>{' '}
              {mine && <button type="button" className="btn alt" onClick={removeMine}>Delete</button>}
            </form>
          )}
          {msg && <div className="insight">{msg}</div>}
          {err && <div className="alert">{err}</div>}
        </div>
        <div>
          <h2>Reviews ({shown.length})</h2>
          <div className="row" style={{ marginBottom: 10 }}>
            {['all', 'positive', 'neutral', 'negative'].map((x) => (
              <button key={x} className={`btn ${sent === x ? '' : 'alt'}`} onClick={() => setSent(x)}>{x}</button>
            ))}
            <span className="spacer" />
            <select style={{ width: 160, margin: 0 }} value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest</option><option value="helpful">Most helpful</option>
              <option value="highest">Highest rated</option><option value="lowest">Lowest rated</option>
            </select>
          </div>
          {shown.length === 0 && <p className="muted">No reviews to show.</p>}
          {shown.map((r) => (
            <div className="card review" key={r._id}>
              <div><b>{r.user}</b> <Stars value={r.rating} /> <SentTag label={r.sentiment.label} /></div>
              <p>{r.text}</p>
              <div className="muted">
                {new Date(r.createdAt).toLocaleDateString()} ·{' '}
                <a href="#like" onClick={(e) => { e.preventDefault(); if (user) like(r._id); }}>{r.liked ? '👍 Liked' : '👍 Helpful'} ({r.likes})</a>
                {user && r.userId !== user.id && (<> · <a href="#report" onClick={(e) => { e.preventDefault(); report(r._id); }}>Report</a></>)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {similar.length > 0 && (
        <>
          <h2 style={{ marginTop: 28 }}>More {movie.genre} movies</h2>
          <div className="grid g4">
            {similar.map((m) => (
              <Link key={m._id} to={`/movies/${m._id}`} className="card movie">
                <Poster movie={m} h={160} />
                <h3>{m.title}</h3>
                <div className="muted">{m.genre} · {m.year || '-'}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
