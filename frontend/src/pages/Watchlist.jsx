import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Poster } from '../components.jsx';

export default function Watchlist() {
  const [movies, setMovies] = useState([]);
  const load = () => api.get('/watchlist').then(setMovies);
  useEffect(() => { load(); }, []);
  async function remove(id) { await api.del(`/watchlist/${id}`); load(); }
  return (
    <main>
      <h1>My Watchlist</h1>
      {movies.length === 0 && <p className="muted">Nothing here yet. Open a movie and click "Add to Watchlist".</p>}
      <div className="grid g4">
        {movies.map((m) => (
          <div key={m._id} className="card movie">
            <Link to={`/movies/${m._id}`}><Poster movie={m} h={180} /><h3>{m.title}</h3></Link>
            <div className="muted">{m.genre} · {m.year || '-'}</div>
            <button className="btn alt" onClick={() => remove(m._id)}>Remove</button>
          </div>
        ))}
      </div>
    </main>
  );
}
