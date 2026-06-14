import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Leaderboard from '../components/leaderboard/Leaderboard.jsx';
import PublicGameNav from '../components/PublicGameNav.jsx';
import api from '../services/api.js';

function PrizeRulesCard({ prize, rules }) {
  if (!prize && !rules) return null;
  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 text-white space-y-4 md:w-72 shrink-0">
      {prize && (
        <div>
          <h2 className="text-sm font-bold text-green-300 uppercase tracking-wider mb-2">🏆 Prize</h2>
          <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{prize}</p>
        </div>
      )}
      {prize && rules && <hr className="border-white/20" />}
      {rules && (
        <div>
          <h2 className="text-sm font-bold text-green-300 uppercase tracking-wider mb-2">📋 Rules</h2>
          <p className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">{rules}</p>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [settings, setSettings] = useState({ prize_text: '', rules_text: '' });
  const [hasOpenGame, setHasOpenGame] = useState(false);
  // null = unknown/not a current participant; true = token belongs to the active game
  const [isParticipant, setIsParticipant] = useState(false);
  const [params] = useSearchParams();
  const gameId = params.get('game');

  useEffect(() => {
    api.get('/settings', { params: gameId ? { game_id: gameId } : {} })
      .then(({ data }) => setSettings(data))
      .catch(() => {});
  }, [gameId]);

  // Resolve the "Join the Game" vs "My Predictions" button. A saved entry_token
  // only counts if it belongs to the current active game — a token left over
  // from a previous (finished) game is cleared so the visitor can join the new
  // one instead of being stuck on My Predictions forever. (US-34)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let active;
      try {
        const { data: games } = await api.get('/games');
        active = games.find((g) => g.status === 'open' || g.status === 'locked') ?? null;
      } catch {
        return;
      }
      if (cancelled) return;
      setHasOpenGame(!!active && active.status === 'open');

      const token = localStorage.getItem('entry_token');
      if (!token) return;
      try {
        const { data: me } = await api.get('/participants/me');
        if (cancelled) return;
        if (active && me.game.id === active.id) {
          setIsParticipant(true);
        } else {
          localStorage.removeItem('entry_token'); // stale token from a past game
        }
      } catch {
        localStorage.removeItem('entry_token');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const hasPrizeOrRules = settings.prize_text || settings.rules_text;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-950">
      <header className="px-4 pt-10 pb-8 text-center">
        <div className="text-5xl mb-3">🏆</div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          World Cup 2026
        </h1>
        <p className="text-green-300 mt-1 text-sm">Prediction Leaderboard</p>
        {isParticipant ? (
          <Link
            to="/my-predictions"
            className="inline-block mt-4 px-5 py-2 bg-green-500 hover:bg-green-400 text-white text-sm font-semibold rounded-full transition"
          >
            🎯 My Predictions
          </Link>
        ) : (
          hasOpenGame && (
            <Link
              to="/join"
              className="inline-block mt-4 px-5 py-2 bg-green-500 hover:bg-green-400 text-white text-sm font-semibold rounded-full transition"
            >
              ⚽ Join the Game
            </Link>
          )
        )}
        <PublicGameNav active="leaderboard" />
      </header>

      <main className="px-4 pb-16">
        {hasPrizeOrRules ? (
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-start gap-6">
            <PrizeRulesCard prize={settings.prize_text} rules={settings.rules_text} />
            <div className="flex-1 min-w-0">
              <Leaderboard key={gameId ?? 'active'} gameId={gameId} />
            </div>
          </div>
        ) : (
          <Leaderboard key={gameId ?? 'active'} gameId={gameId} />
        )}
      </main>

      <footer className="fixed bottom-4 right-4">
        <Link
          to="/admin/login"
          className="text-xs text-green-600 hover:text-green-400 transition-colors"
        >
          Admin
        </Link>
      </footer>
    </div>
  );
}
