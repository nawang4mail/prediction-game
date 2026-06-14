import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import {
  entriesForGame,
  migrateLegacy,
  setCurrentToken,
  upsertEntry,
} from '../services/entries.js';

export default function JoinPage() {
  const navigate = useNavigate();
  const [openGames, setOpenGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null); // game chosen to join
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ display_name: '', phone: '' });
  const [error, setError] = useState(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let games;
      try {
        ({ data: games } = await api.get('/games'));
      } catch {
        if (!cancelled) setLoading(false);
        return;
      }
      if (cancelled) return;
      const open = games.filter((g) => g.status === 'open');
      setOpenGames(open);

      await migrateLegacy();
      if (cancelled) return;

      // With a single open game, behave as before: if the player already has an
      // entry there, manage it from My Predictions; otherwise go straight to the
      // join form. With several open games, show a picker. (US-34, US-41, US-42)
      if (open.length === 1) {
        const existing = entriesForGame(open[0].id);
        if (existing.length) {
          setCurrentToken(existing[0].token);
          navigate('/my-predictions', { replace: true });
          return;
        }
        setSelectedGame(open[0]);
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
        game_id: selectedGame.id,
        display_name: form.display_name,
        phone: form.phone || undefined,
      });
      upsertEntry({ token: data.entry_token, name: data.display_name, game_id: data.game.id, is_self: true });
      setCurrentToken(data.entry_token);
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
          {selectedGame && <p className="text-green-300 mt-1 text-sm">{selectedGame.name}</p>}
        </div>

        {loading ? (
          <div className="h-48 bg-white/10 rounded-2xl animate-pulse" />
        ) : openGames.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <p className="text-white text-sm">No game is open for joining right now. Check back later!</p>
          </div>
        ) : !selectedGame ? (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-3" data-testid="game-picker">
            <p className="text-sm text-green-100 text-center mb-1">Choose a game to join:</p>
            {openGames.map((g) => (
              <button
                key={g.id}
                onClick={() => { setSelectedGame(g); setError(null); }}
                data-testid={`pick-game-${g.id}`}
                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition"
              >
                {g.name}
              </button>
            ))}
          </div>
        ) : (
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
            {openGames.length > 1 && (
              <button
                type="button"
                onClick={() => setSelectedGame(null)}
                className="w-full text-xs text-green-300 hover:text-green-100 transition"
              >
                ← Choose a different game
              </button>
            )}
          </form>
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
