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

  // Several games may be open/locked at once (US-42); list them all alongside
  // finished games. The first is the server's default (most recent active).
  const activeGames = games.filter((g) => g.status === 'open' || g.status === 'locked');
  const finished = games.filter((g) => g.status === 'finished');
  const selectable = [...activeGames, ...finished];
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
      {selectable.length > 1 && (
        <select
          value={current}
          onChange={(e) => setParams(e.target.value ? { game: e.target.value } : {})}
          className="px-3 py-1.5 rounded-full text-sm bg-white/10 text-green-200 border border-white/20 focus:outline-none focus:ring-2 focus:ring-green-400"
        >
          <option value="" className="text-gray-800">{selectable[0].name}</option>
          {selectable.slice(1).map((g) => (
            <option key={g.id} value={g.id} className="text-gray-800">
              {g.name}{g.status === 'finished' ? ' (finished)' : ''}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
