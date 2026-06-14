import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api.js';

export default function JoinPage() {
  const navigate = useNavigate();
  const [openGame, setOpenGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ display_name: '', phone: '' });
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let open;
      try {
        const { data: games } = await api.get('/games');
        open = games.find((g) => g.status === 'open') ?? null;
      } catch {
        if (!cancelled) setLoading(false);
        return;
      }
      if (cancelled) return;
      setOpenGame(open);

      // Only skip to My Predictions if the saved token is for the open game.
      // A leftover token from a previous game is cleared so this visitor can
      // join the new one. (US-34)
      const token = localStorage.getItem('entry_token');
      if (token) {
        try {
          const { data: me } = await api.get('/participants/me');
          if (!cancelled && open && me.game.id === open.id) {
            navigate('/my-predictions', { replace: true });
            return;
          }
          localStorage.removeItem('entry_token');
        } catch {
          localStorage.removeItem('entry_token');
        }
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleJoin = async (e) => {
    e.preventDefault();
    setJoining(true);
    setError(null);
    try {
      const { data } = await api.post('/participants', {
        display_name: form.display_name,
        phone: form.phone || undefined,
      });
      localStorage.setItem('entry_token', data.entry_token);
      navigate('/my-predictions');
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to join. Please try again.');
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">⚽</div>
          <h1 className="text-2xl font-bold text-white">Join the Game</h1>
          {openGame && <p className="text-green-300 mt-1 text-sm">{openGame.name}</p>}
        </div>

        {loading ? (
          <div className="h-48 bg-white/10 rounded-2xl animate-pulse" />
        ) : openGame ? (
          <form onSubmit={handleJoin} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-green-200 mb-1">Display Name</label>
              <input
                name="display_name"
                value={form.display_name}
                onChange={(e) => setForm((p) => ({ ...p, display_name: e.target.value }))}
                required
                placeholder="Your name on the leaderboard"
                className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-green-200 mb-1">
                Phone <span className="text-green-200/60">(optional)</span>
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="e.g. 555-0123"
                className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            </div>
            {error && (
              <p className="text-sm text-red-200 bg-red-500/20 border border-red-400/40 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={joining}
              className="w-full py-2.5 bg-green-500 hover:bg-green-400 disabled:bg-green-700 text-white text-sm font-semibold rounded-lg transition"
            >
              {joining ? 'Joining…' : 'Join & Make Predictions'}
            </button>
          </form>
        ) : (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <p className="text-white text-sm">
              No game is open for joining right now. Check back later!
            </p>
          </div>
        )}

        <p className="text-center mt-6">
          <Link to="/" className="text-sm text-green-300 hover:text-green-100 transition">
            ← Back to Leaderboard
          </Link>
        </p>
      </div>
    </div>
  );
}
