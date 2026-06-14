import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';

const PICK_OPTIONS = [
  { value: '', label: '—' },
  { value: 'team_a', label: (m) => m.team_a },
  { value: 'team_b', label: (m) => m.team_b },
  { value: 'draw', label: 'Draw' },
];

function cellClass(prediction, match) {
  if (!match.result || !prediction) return '';
  return prediction === match.result
    ? 'bg-green-100 text-green-800'
    : 'bg-red-100 text-red-700';
}

function resultLabel(match) {
  if (!match.result) return null;
  if (match.result === 'draw') return 'Draw';
  return match.result === 'team_a' ? match.team_a : match.team_b;
}

function shortLabel(match) {
  return match.label ?? `${match.team_a} vs ${match.team_b}`;
}

// Mirrors the server gameScope fallback: explicit selection, else the active
// (open/locked) game, else the most recent.
function resolveScopedGame(games) {
  const selected = sessionStorage.getItem('admin_game_id');
  if (selected) return games.find((g) => String(g.id) === String(selected)) ?? null;
  return games.find((g) => g.status === 'open' || g.status === 'locked') ?? games[0] ?? null;
}

export default function PredictionsPage() {
  const [users, setUsers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [cells, setCells] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [readOnly, setReadOnly] = useState(false);

  const load = useCallback(async () => {
    const [{ data: u }, { data: m }, { data: p }, { data: games }] = await Promise.all([
      api.get('/admin/users'),
      api.get('/admin/matches'),
      api.get('/admin/predictions'),
      api.get('/admin/games'),
    ]);

    const map = {};
    u.forEach((usr) => { map[usr.id] = {}; });
    p.forEach((pred) => {
      if (!map[pred.user_id]) map[pred.user_id] = {};
      map[pred.user_id][pred.match_id] = pred.prediction;
    });

    setUsers(u);
    setMatches(m);
    setCells(map);
    setReadOnly(resolveScopedGame(games)?.status === 'finished');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = async (userId, matchId, value) => {
    if (readOnly) return;
    const key = `${userId}-${matchId}`;
    setSaving((s) => ({ ...s, [key]: true }));
    setCells((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], [matchId]: value || undefined },
    }));
    try {
      if (value) {
        await api.post('/admin/predictions', { user_id: userId, match_id: matchId, prediction: value });
      } else {
        await api.delete(`/admin/predictions/${userId}/${matchId}`);
      }
    } finally {
      setSaving((s) => { const n = { ...s }; delete n[key]; return n; });
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Predictions Grid</h2>
        <p className="text-sm text-gray-500">
          {users.length} player{users.length !== 1 ? 's' : ''} · {matches.length} match{matches.length !== 1 ? 'es' : ''}
          <span className="ml-3 inline-flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-green-100 border border-green-300" />
            <span className="text-xs text-gray-400">Correct</span>
            <span className="inline-block w-3 h-3 rounded-sm bg-red-100 border border-red-300 ml-2" />
            <span className="text-xs text-gray-400">Wrong</span>
          </span>
        </p>
      </div>

      {readOnly && (
        <div
          data-testid="finished-banner"
          className="mb-4 text-sm text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-4 py-3"
        >
          🔒 This game is finished — predictions are locked and cannot be edited.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 || matches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">⚽</p>
          <p className="text-sm">
            {users.length === 0 ? 'Add users first.' : 'Add matches first.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl shadow-sm border border-gray-100">
          <table className="text-xs min-w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Player
                </th>
                {matches.map((m) => (
                  <th key={m.id} className="text-center px-2 py-2 min-w-[110px]">
                    <div className="font-semibold text-gray-600 truncate max-w-[108px]" title={shortLabel(m)}>
                      {shortLabel(m)}
                    </div>
                    {resultLabel(m) ? (
                      <div className="text-green-600 font-medium text-xs">
                        ✓ {resultLabel(m)}
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs">Pending</div>
                    )}
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pts
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {users.map((u) => {
                const userCells = cells[u.id] ?? {};
                const points = matches.reduce((acc, m) => {
                  const p = userCells[m.id];
                  return acc + (m.result && p && p === m.result ? 1 : 0);
                }, 0);
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition">
                    <td className="sticky left-0 z-10 bg-white px-4 py-2 font-medium text-gray-800 border-r border-gray-100">
                      {u.display_name}
                    </td>
                    {matches.map((m) => {
                      const prediction = userCells[m.id] ?? '';
                      const key = `${u.id}-${m.id}`;
                      const isSaving = !!saving[key];
                      return (
                        <td key={m.id} className={`px-2 py-1.5 text-center ${cellClass(prediction, m)}`}>
                          <select
                            value={prediction}
                            onChange={(e) => handleChange(u.id, m.id, e.target.value)}
                            disabled={isSaving || readOnly}
                            data-testid={`cell-${u.id}-${m.id}`}
                            className={`w-full text-xs rounded px-1 py-1 border focus:outline-none focus:ring-1 focus:ring-green-400
                              ${cellClass(prediction, m) || 'bg-white'}
                              ${isSaving || readOnly ? 'opacity-50 cursor-not-allowed' : 'border-gray-200 cursor-pointer'}
                            `}
                          >
                            {PICK_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {typeof opt.label === 'function' ? opt.label(m) : opt.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      );
                    })}
                    <td className="px-4 py-2 text-center font-semibold text-gray-700">
                      {points}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
