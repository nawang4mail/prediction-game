import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Leaderboard from '../components/leaderboard/Leaderboard.jsx';
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

  useEffect(() => {
    api.get('/settings').then(({ data }) => setSettings(data)).catch(() => {});
    api.get('/games')
      .then(({ data }) => setHasOpenGame(data.some((g) => g.status === 'open')))
      .catch(() => {});
  }, []);

  const hasPrizeOrRules = settings.prize_text || settings.rules_text;
  const isParticipant = !!localStorage.getItem('entry_token');

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
      </header>

      <main className="px-4 pb-16">
        {hasPrizeOrRules ? (
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-start gap-6">
            <PrizeRulesCard prize={settings.prize_text} rules={settings.rules_text} />
            <div className="flex-1 min-w-0">
              <Leaderboard />
            </div>
          </div>
        ) : (
          <Leaderboard />
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
