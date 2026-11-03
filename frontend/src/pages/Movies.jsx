import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Poster, Stars, GENRES } from '../components.jsx';

export default function Movies() {
  const [movies, setMovies] = useState([]);
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState('');
  const [sort, setSort] = useState('rating');
  const [err, setErr] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      api.get(`/movies?search=${encodeURIComponent(q)}&genre=${encodeURIComponent(genre)}&sort=${sort}`)
        .then((d) => { setMovies(d); setErr(''); })
        .catch((e) => setErr(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [q, genre, sort]);

  return (
    <main>
      <h1>Movies</h1>
      <div className="filters">
        <input placeholder="Search movies..." value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={genre} onChange={(e) => setGenre(e.target.value)}>
          <option value="">All genres</option>
          {GENRES.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="rating">Top rated</option>
          <option value="reviews">Most reviewed</option>
          <option value="newest">Newest</option>
          <option value="title">Title A-Z</option>
        </select>
      </div>
      {err && <div className="alert">{err}</div>}
      <div className="grid g4">
        {movies.map((m) => (
          <Link key={m._id} to={`/movies/${m._id}`} className="card movie">
            <Poster movie={m} />
            <h3>{m.title}</h3>
            <div className="muted">{m.genre} · {m.year || '-'}</div>
            <div><Stars value={m.avgRating} /> {m.avgRating || '-'}</div>
            <div className="muted">{m.reviewCount} reviews · {m.positivePct}% positive</div>
          </Link>
        ))}
      </div>
      {!movies.length && !err && <p className="muted">No movies found.</p>}
    </main>
  );
}
