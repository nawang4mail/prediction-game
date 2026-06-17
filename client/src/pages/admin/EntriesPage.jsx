import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';
import { isBracket } from '../../constants/gameTypes.js';

// Mirrors the server gameScope fallback: explicit selection, else the active
// (open/locked) game, else the most recent.
function resolveScopedGame(games) {
  const selected = sessionStorage.getItem('admin_game_id');
  if (selected) return games.find((g) => String(g.id) === String(selected)) ?? null;
  return games.find((g) => g.status === 'open' || g.status === 'locked') ?? games[0] ?? null;
}

export default function EntriesPage() {
  const [entries, setEntries] = useState([]);
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [{ data: games }, { data }] = await Promise.all([
        api.get('/admin/games'),
        api.get('/admin/bracket/entries'),
      ]);
      setGame(resolveScopedGame(games));
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const bracket = isBracket(game?.type);

  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800">User's Entries</h2>
        <p className="text-sm text-gray-500">
          {bracket
            ? `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} · read-only`
            : 'Read-only view of participants and their picks.'}
        </p>
      </div>

      {!loading && !bracket && (
        <div
          data-testid="not-bracket-banner"
          className="text-sm text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-4 py-3"
        >
          User's entries applies only to Bracket Prediction games.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : bracket && entries.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🧾</p>
          <p className="text-sm">No entries yet.</p>
        </div>
      ) : (
        bracket && (
          <div className="space-y-3">
            {entries.map((e) => (
              <div
                key={e.user_id}
                data-testid={`entry-${e.user_id}`}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              >
                <h3 className="font-semibold text-gray-800 mb-3">{e.display_name}</h3>
                <div className="space-y-2">
                  {e.stages.map((s) => (
                    <div key={s.id}>
                      <p className="text-xs font-semibold text-gray-500">{s.name}</p>
                      {s.teams.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No picks</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {s.teams.map((t) => (
                            <span
                              key={t.id}
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                t.is_winner
                                  ? 'bg-green-100 text-green-800 font-medium'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {t.is_winner ? '✓ ' : ''}
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </AdminLayout>
  );
}
