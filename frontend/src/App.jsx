import { Routes, Route, Link, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Landing from './pages/Landing.jsx';
import Movies from './pages/Movies.jsx';
import MovieDetail from './pages/MovieDetail.jsx';
import Watchlist from './pages/Watchlist.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Moderation from './pages/Moderation.jsx';
import ManageMovies from './pages/ManageMovies.jsx';
import MyReviews from './pages/MyReviews.jsx';
import Compare from './pages/Compare.jsx';

function Nav() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <nav className="site-nav">
      <Link className="brand" to="/" aria-label="CineFeedback home">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M7 4.8h10a2 2 0 0 1 2 2v10.4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6.8a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.7" />
            <path d="m10 9 5 3-5 3V9Z" fill="currentColor" />
          </svg>
        </span>
        <span className="brand-name">cinefeedback</span>
      </Link>
      <div className="nav-links">
        <NavLink className="nav-link" to="/" end>Overview</NavLink>
        <NavLink className="nav-link" to="/movies">Discover</NavLink>
        {user && <NavLink className="nav-link" to="/watchlist">Watchlist</NavLink>}
        {user && <NavLink className="nav-link" to="/my-reviews">My Reviews</NavLink>}
        {user?.role === 'admin' && (
          <>
            <NavLink className="nav-link" to="/admin">Dashboard</NavLink>
            <NavLink className="nav-link" to="/admin/moderation">Moderation</NavLink>
            <NavLink className="nav-link" to="/admin/compare">Compare</NavLink>
            <NavLink className="nav-link" to="/admin/movies">Manage Movies</NavLink>
          </>
        )}
      </div>
      <div className="nav-actions">
        {user ? (
          <>
            <span className="nav-user">Hey, <strong>{user.name}</strong></span>
            <a className="nav-logout" href="#logout" onClick={(e) => { e.preventDefault(); logout(); nav('/'); }}>Log out</a>
          </>
        ) : (
          <>
            <NavLink className="nav-link" to="/login">Log in</NavLink>
            <Link className="btn small" to="/movies">Explore films <span aria-hidden="true">↗</span></Link>
          </>
        )}
      </div>
    </nav>
  );
}

function Private({ children, admin }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (admin && user.role !== 'admin') return <main><h2>Admin access only</h2></main>;
  return children;
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/movies" element={<Movies />} />
        <Route path="/movies/:id" element={<MovieDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/watchlist" element={<Private><Watchlist /></Private>} />
        <Route path="/my-reviews" element={<Private><MyReviews /></Private>} />
        <Route path="/admin/compare" element={<Private admin><Compare /></Private>} />
        <Route path="/admin" element={<Private admin><Dashboard /></Private>} />
        <Route path="/admin/moderation" element={<Private admin><Moderation /></Private>} />
        <Route path="/admin/movies" element={<Private admin><ManageMovies /></Private>} />
        <Route path="*" element={<main><h2>Page not found</h2></main>} />
      </Routes>
    </>
  );
}
