export const GENRES = ['Action', 'Drama', 'Comedy', 'Thriller', 'Romance', 'Sci-Fi', 'Horror'];

export function Poster({ movie, h = 220 }) {
  if (movie.poster) return <img className="poster" style={{ height: h }} src={movie.poster} alt={movie.title} />;
  const hue = [...movie.title].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div className="poster" style={{ height: h, background: `linear-gradient(135deg,hsl(${hue},60%,38%),hsl(${(hue + 60) % 360},60%,18%))` }}>
      <span>{movie.title}</span>
    </div>
  );
}

export const Stars = ({ value }) => {
  const n = Math.round(value || 0);
  return <span className="stars">{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
};

export const SentTag = ({ label }) => <span className={`tag ${label}`}>{label}</span>;
