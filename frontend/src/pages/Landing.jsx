import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { Poster, Stars } from '../components.jsx';

const features = [
  ['01', 'Sentiment, at a glance', 'Understand how audiences feel with every review automatically sorted into positive, neutral, and negative.'],
  ['02', 'Catch the plot twist', 'Spot the gap between a star rating and the words behind it. Find the signal hiding in plain sight.'],
  ['03', 'What really landed?', 'See what audiences say about the story, acting, music, pacing, and ending.'],
  ['04', 'Know when things shift', 'Get a heads-up when negative feedback climbs, with the key complaint already surfaced.'],
  ['05', 'Keep the conversation healthy', 'Turn reports and flagged reviews into a clear, trackable moderation workflow.'],
  ['06', 'Take the insight with you', 'Compare titles side by side and share polished PDF or Excel reports with your team.'],
];

export default function Landing() {
  const [sum, setSum] = useState(null);
  useEffect(() => { api.get('/public/summary').then(setSum).catch(() => {}); }, []);

  return (
    <main className="landing">
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">The audience intelligence studio</div>
          <h1>Every review has a <em>story.</em></h1>
          <p>Go beyond the stars. CineFeedback turns what audiences say into the kind of insight your next big decision deserves.</p>
          <div className="hero-actions">
            <Link className="btn" to="/movies">Explore the films <span aria-hidden="true">↗</span></Link>
            <Link className="btn alt" to="/login">For your business</Link>
          </div>
          <div className="hero-note"><span aria-hidden="true">✳</span> Real audience voices. A clearer picture.</div>
        </div>
        <div className="hero-art" role="img" aria-label="Atmospheric cinema auditorium">
          <div className="hero-orbit"><span className="live-dot" /> THE AUDIENCE IS TALKING</div>
          <div className="hero-art-label">
            <div>
              <div className="hero-art-title">A better read on every release.</div>
              <div className="hero-art-sub">One place for the whole picture.</div>
            </div>
            <div className="hero-art-score">LIVE<small>INSIGHT</small></div>
          </div>
        </div>
      </section>

      {sum && (
        <section className="stats-strip" aria-label="CineFeedback at a glance">
          {[
            ['Movies', sum.movies],
            ['Reviews analysed', sum.reviews],
            ['Registered users', sum.users],
            ['Average rating', `${sum.avgRating} / 5`],
          ].map(([label, value]) => (
            <div className="stat-item" key={label}>
              <span className="stat-value">{value}</span>
              <span className="stat-label">{label}</span>
            </div>
          ))}
        </section>
      )}

      <div className="trust-row">
        <span>Made for people who make films matter</span>
        <div className="trust-logos"><span>STREAMING</span><span>THEATRES</span><span>PRODUCTION</span><span>DISTRIBUTION</span></div>
      </div>

      {sum?.trending?.length > 0 && (
        <section>
          <div className="section-heading">
            <div><div className="eyebrow">The conversation right now</div><h2>In the spotlight</h2></div>
            <Link className="nav-link" to="/movies">See all films <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="grid g4">
            {sum.trending.slice(0, 4).map((movie) => (
              <Link key={movie._id} to={`/movies/${movie._id}`} className="card movie">
                <Poster movie={movie} h={240} />
                <h3>{movie.title}</h3>
                <div><Stars value={movie.avgRating} /> <span className="muted">{movie.avgRating}</span></div>
                <div className="muted">{movie.recentReviews} new reviews this month</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="problem-panel" style={{ marginTop: 58 }}>
        <div>
          <div className="eyebrow">The missing scene</div>
          <h2>Stars only tell half the story.</h2>
        </div>
        <div className="problem-quote">“A five-star score can hide a one-star experience. The details are in what people say.”</div>
      </section>

      <section>
        <div className="section-heading">
          <div><div className="eyebrow">From audience voice to action</div><h2>Less noise. More signal.</h2></div>
          <p>Everything you need to understand the response, spot the shift, and share what matters.</p>
        </div>
        <div className="grid g3">
          {features.map(([number, title, description]) => (
            <article className="card feature-card" key={number}>
              <div className="feature-icon">{number}</div>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div><div className="eyebrow">Straightforward from day one</div><h2>Find your frame.</h2></div>
          <p>Start exploring for free. Bring the whole team when you’re ready.</p>
        </div>
        <div className="grid g3">
          <article className="card price">
            <div className="eyebrow">For the curious</div>
            <h3>Starter</h3>
            <div className="amt">Free</div>
            <ul><li>Up to 500 reviews / month</li><li>Audience sentiment overview</li><li>Essential dashboard access</li></ul>
            <Link className="btn alt" to="/movies">Start exploring <span aria-hidden="true">↗</span></Link>
          </article>
          <article className="card price featured">
            <span className="price-badge">Most popular</span>
            <div className="eyebrow">For growing teams</div>
            <h3>Growth</h3>
            <div className="amt">Rs 9,999 <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>/ mo</span></div>
            <ul><li>Unlimited reviews</li><li>Alerts and moderation workflows</li><li>PDF and Excel reports</li></ul>
            <Link className="btn" to="/login">Choose Growth <span aria-hidden="true">↗</span></Link>
          </article>
          <article className="card price">
            <div className="eyebrow">For the big picture</div>
            <h3>Enterprise</h3>
            <div className="amt">Let’s talk</div>
            <ul><li>API integration</li><li>Multi-team workflows</li><li>Priority support</li></ul>
            <Link className="btn alt" to="/login">Talk to our team <span aria-hidden="true">↗</span></Link>
          </article>
        </div>
      </section>

      <section className="closing-cta">
        <div>
          <div className="eyebrow">The next release starts here</div>
          <h2>Make every audience voice count.</h2>
        </div>
        <Link className="btn" to="/movies">See what people are saying <span aria-hidden="true">↗</span></Link>
      </section>
    </main>
  );
}
