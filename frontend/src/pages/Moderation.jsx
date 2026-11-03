import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Stars, SentTag } from '../components.jsx';

function Row({ r, onSaved }) {
  const [status, setStatus] = useState(r.ticket.status === 'None' ? 'Open' : r.ticket.status);
  const [reply, setReply] = useState(r.ticket.reply || '');
  const [hidden, setHidden] = useState(r.hidden);
  const [saved, setSaved] = useState(false);

  async function save() {
    await api.patch(`/admin/reviews/${r._id}`, { status, reply, hidden });
    setSaved(true);
    onSaved();
  }

  return (
    <tr>
      <td>{new Date(r.createdAt).toLocaleDateString()}</td>
      <td>{r.movie}<div className="muted">{r.user}</div></td>
      <td><Stars value={r.rating} /></td>
      <td>{r.text}<div><SentTag label={r.sentiment.label} /> {r.mismatch && <span className="tag mismatch">mismatch</span>} {r.reported > 0 && <span className="tag mismatch">reported by {r.reported}</span>}</div></td>
      <td><select value={status} onChange={(e) => setStatus(e.target.value)}>{['Open', 'In progress', 'Resolved'].map((s) => <option key={s}>{s}</option>)}</select></td>
      <td><input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Internal note / reply" /></td>
      <td><label className="inline"><input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Hide</label></td>
      <td><button className="btn" onClick={save}>{saved ? 'Saved ✓' : 'Save'}</button></td>
    </tr>
  );
}

export default function Moderation() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('Open');
  const [err, setErr] = useState('');
  const load = () => api.get(`/admin/flagged?status=${encodeURIComponent(status)}`).then(setRows).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, [status]); // eslint-disable-line

  return (
    <main>
      <h1>Moderation and Tickets</h1>
      <p className="muted">Negative and mismatched reviews are flagged automatically. Update the status, add a note, or hide a review from the public.</p>
      <select style={{ width: 200 }} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">All</option><option>Open</option><option>In progress</option><option>Resolved</option>
      </select>
      {err && <div className="alert">{err}</div>}
      <div className="card" style={{ overflowX: 'auto' }}>
        <table>
          <thead><tr><th>Date</th><th>Movie</th><th>Rating</th><th>Review</th><th>Status</th><th>Reply</th><th></th><th></th></tr></thead>
          <tbody>{rows.map((r) => <Row key={r._id + r.ticket.status + r.hidden} r={r} onSaved={() => {}} />)}</tbody>
        </table>
        {!rows.length && <p className="muted">No reviews in this view.</p>}
      </div>
    </main>
  );
}
