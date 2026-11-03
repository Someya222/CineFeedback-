import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

export default function Login() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      if (mode === 'login') await login(email, password); else await register(name, email, password);
      nav('/movies');
    } catch (e2) { setErr(e2.message); }
  }

  return (
    <main className="auth-page">
      <div className="auth-card card">
        <div className="auth-header">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="1.6"/>
              <path d="M8 8.5h8M8 12h8M8 15.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
          </div>
          <h2>{mode === 'login' ? 'Login' : 'Create account'}</h2>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <>
              <label>Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required />
            </>
          )}
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          {err && <div className="alert">{err}</div>}
          <button className="btn auth-btn" type="submit">{mode === 'login' ? 'Login' : 'Register'}</button>
        </form>

        <p className="auth-switch muted">
          {mode === 'login' ? 'New here? ' : 'Already registered? '}
          <a href="#switch" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}>
            {mode === 'login' ? 'Create an account' : 'Login'}
          </a>
        </p>
        <p className="auth-demo muted">Demo: admin@cinefeedback.com / admin123 · demo@cinefeedback.com / demo123</p>
      </div>
    </main>
  );
}
