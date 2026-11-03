import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { GENRES } from '../components.jsx';

const EMPTY = { title: '', genre: 'Drama', language: 'Hindi', year: '', director: '', cast: '', poster: '', synopsis: '' };

export default function ManageMovies() {
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [err, setErr] = useState('');
  const load = () => api.get('/movies?sort=title').then(setMovies);
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      if (editId) await api.put(`/movies/${editId}`, form); else await api.post('/movies', form);
      setForm(EMPTY); setEditId(null); load();
    } catch (e2) { setErr(e2.message); }
  }
  function edit(m) {
    setEditId(m._id);
    setForm({ title: m.title, genre: m.genre, language: m.language || '', year: m.year || '', director: m.director || '', cast: (m.cast || []).join(', '), poster: m.poster || '', synopsis: m.synopsis || '' });
    window.scrollTo(0, 0);
  }
  async function remove(m) {
    if (!window.confirm(`Delete "${m.title}" and all its reviews?`)) return;
    await api.del(`/movies/${m._id}`);
    load();
  }

  return (
    <main>
      <h1>Manage Movies</h1>
      <div className="card">
        <h3>{editId ? 'Edit movie' : 'Add movie'}</h3>
        <form onSubmit={submit} className="grid g3">
          <div><label>Title</label><input value={form.title} onChange={set('title')} required /></div>
          <div><label>Genre</label><select value={form.genre} onChange={set('genre')}>{GENRES.map((g) => <option key={g}>{g}</option>)}</select></div>
          <div><label>Language</label><input value={form.language} onChange={set('language')} /></div>
          <div><label>Year</label><input type="number" value={form.year} onChange={set('year')} /></div>
          <div><label>Director</label><input value={form.director} onChange={set('director')} /></div>
          <div><label>Cast (comma separated)</label><input value={form.cast} onChange={set('cast')} /></div>
          <div><label>Poster URL (optional)</label><input value={form.poster} onChange={set('poster')} /></div>
          <div style={{ gridColumn: 'span 2' }}><label>Synopsis</label><input value={form.synopsis} onChange={set('synopsis')} /></div>
          <div><button className="btn" type="submit">{editId ? 'Update' : 'Add movie'}</button>{' '}
            {editId && <button type="button" className="btn alt" onClick={() => { setEditId(null); setForm(EMPTY); }}>Cancel</button>}</div>
        </form>
        {err && <div className="alert">{err}</div>}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead><tr><th>Title</th><th>Genre</th><th>Year</th><th>Reviews</th><th></th></tr></thead>
          <tbody>{movies.map((m) => (
            <tr key={m._id}><td>{m.title}</td><td>{m.genre}</td><td>{m.year || '-'}</td><td>{m.reviewCount}</td>
              <td><button className="btn alt" onClick={() => edit(m)}>Edit</button> <button className="btn alt" onClick={() => remove(m)}>Delete</button></td></tr>
          ))}</tbody>
        </table>
      </div>
    </main>
  );
}
