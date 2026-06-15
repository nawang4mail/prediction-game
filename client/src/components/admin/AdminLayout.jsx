import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import api from '../../services/api.js';
import { isBracket } from '../../constants/gameTypes.js';

// Tabs that differ by the scoped game's type: a Bracket Prediction game manages
// stages on one Bracket tab; a Guess the Winners game has Matches + Predictions.
const BRACKET_TABS = [{ to: '/admin/bracket', label: 'Bracket' }];
const GUESS_TABS = [
  { to: '/admin/matches', label: 'Matches' },
  { to: '/admin/predictions', label: 'Predictions' },
];

// Mirrors the server gameScope fallback: explicit selection, else the active
// (open/locked) game, else the most recent.
function resolveScopedGame(games, selectedId) {
  if (selectedId) return games.find((g) => String(g.id) === String(selectedId)) ?? null;
  return games.find((g) => g.status === 'open' || g.status === 'locked') ?? games[0] ?? null;
}

export default function AdminLayout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);

  useEffect(() => {
    api.get('/admin/games').then(({ data }) => setGames(data)).catch(() => {});
  }, []);

  const selectedGame = sessionStorage.getItem('admin_game_id') ?? '';

  const scopedGame = resolveScopedGame(games, selectedGame);
  const navItems = [
    { to: '/admin', label: 'Dashboard' },
    { to: '/admin/games', label: 'Games' },
    ...(isBracket(scopedGame?.type) ? BRACKET_TABS : GUESS_TABS),
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/settings', label: 'Settings' },
  ];

  const handleGameChange = (e) => {
    if (e.target.value) {
      sessionStorage.setItem('admin_game_id', e.target.value);
    } else {
      sessionStorage.removeItem('admin_game_id');
    }
    window.location.reload();
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <span className="text-green-700 font-bold text-sm shrink-0">⚽ Admin</span>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition
                  ${isActive
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {games.length > 1 && (
              <select
                value={selectedGame}
                onChange={handleGameChange}
                className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Active game</option>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.status})
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
