import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../services/api.js';

const TABS = [
  { key: 'leaderboard', to: '/', label: '🏆 Leaderboard' },
  { key: 'matches', to: '/matches', label: '⚽ Matches' },
];

// Tab bar + game selector shared by the public leaderboard and matches pages.
// The selected game travels via the ?game= query param; empty = active game.
export default function PublicGameNav({ active }) {
  const [games, setGames] = useState([]);
  const [params, setParams] = useSearchParams();
  const current = params.get('game') ?? '';

  useEffect(() => {
    api.get('/games').then(({ data }) => setGames(data)).catch(() => {});
  }, []);

  const activeGame = games.find((g) => g.status !== 'finished');
  const finished = games.filter((g) => g.status === 'finished');
  const gameQuery = current ? `?game=${current}` : '';

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
      {TABS.map(({ key, to, label }) => (
        <Link
          key={key}
          to={`${to}${gameQuery}`}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition
            ${active === key
              ? 'bg-green-500 text-white'
              : 'bg-white/10 text-green-200 hover:bg-white/20'}`}
        >
          {label}
        </Link>
      ))}
      {finished.length > 0 && (
        <select
          value={current}
          onChange={(e) => setParams(e.target.value ? { game: e.target.value } : {})}
          className="px-3 py-1.5 rounded-full text-sm bg-white/10 text-green-200 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          {activeGame && <option value="" className="text-gray-800">{activeGame.name}</option>}
          {finished.map((g) => (
            <option key={g.id} value={g.id} className="text-gray-800">
              {g.name} (finished)
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
