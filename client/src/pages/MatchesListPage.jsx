import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PublicGameNav from '../components/PublicGameNav.jsx';
import api from '../services/api.js';
import { isBracket } from '../constants/gameTypes.js';

const RESULT_LABELS = { team_a: (m) => `${m.team_a} won`, team_b: (m) => `${m.team_b} won`, draw: () => 'Draw' };

function BreakdownRow({ label, count, total, isResult }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isResult ? 'bg-green-500/30 ring-1 ring-green-400' : 'bg-white/5'}`}
    >
      <span className="text-xs text-white w-28 truncate">
        {label} {isResult && '✓'}
      </span>
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-green-200 w-14 text-right">
        {count} {count === 1 ? 'pick' : 'picks'}
      </span>
    </div>
  );
}

// Resolves the selected public game the same way the server gameScope does:
// explicit ?game, else an open/locked game, else the most recent visible one.
function resolveGame(games, gameId) {
  if (gameId) return games.find((g) => String(g.id) === String(gameId)) ?? null;
  return games.find((g) => g.status === 'open' || g.status === 'locked') ?? games[0] ?? null;
}

export default function MatchesListPage() {
  const [matches, setMatches] = useState(null);
  const [stages, setStages] = useState(null);
  const [bracket, setBracket] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [params] = useSearchParams();
  const gameId = params.get('game');

  useEffect(() => {
    (async () => {
      let game = null;
      try {
        const { data: games } = await api.get('/games');
        game = resolveGame(games, gameId);
      } catch {
        /* fall through to match mode */
      }
      const scope = gameId ? { game_id: gameId } : {};
      if (isBracket(game?.type)) {
        setBracket(true);
        try {
          const { data } = await api.get('/bracket', { params: scope });
          setStages(data);
        } catch {
          setStages([]);
        }
      } else {
        setBracket(false);
        try {
          const { data } = await api.get('/matches', { params: scope });
          setMatches(data);
        } catch {
          setMatches([]);
        }
      }
    })();
  }, [gameId]);

  const loaded = bracket ? stages : matches;

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-950">
      <header className="px-4 pt-10 pb-8 text-center">
        <div className="text-5xl mb-3">{bracket ? '🏆' : '⚽'}</div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          {bracket ? 'Bracket' : 'Matches'}
        </h1>
        <p className="text-green-300 mt-1 text-sm">Who picked what</p>
        <PublicGameNav active="matches" />
      </header>

      <main className="px-4 pb-16">
        <div className="max-w-lg mx-auto">
          {!loaded ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-white/10 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : bracket ? (
            stages.length === 0 ? (
              <p className="text-center text-green-300 text-sm py-16">No stages yet.</p>
            ) : (
              <div className="space-y-2">
                {stages.map((s) => {
                  const total = s.teams.reduce((sum, t) => sum + t.picks, 0);
                  const expanded = openId === s.id;
                  return (
                    <div
                      key={s.id}
                      data-testid={`public-stage-${s.id}`}
                      className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden"
                    >
                      <button
                        onClick={() => setOpenId(expanded ? null : s.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                      >
                        <span className="text-sm text-white font-medium">{s.name}</span>
                        <span className="flex items-center gap-2 text-xs text-green-300">
                          <span>
                            Pick {s.pick_count} · {s.points_per_correct} pt
                            {s.points_per_correct === 1 ? '' : 's'}
                          </span>
                          {expanded ? '▲' : '▼'}
                        </span>
                      </button>
                      {expanded && (
                        <div className="px-4 pb-4 space-y-1.5">
                          {s.description && (
                            <p className="text-xs text-green-200/80 italic pb-1">{s.description}</p>
                          )}
                          {s.teams.map((t) => (
                            <BreakdownRow
                              key={t.id}
                              label={t.name}
                              count={t.picks}
                              total={total}
                              isResult={!!t.is_winner}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : matches.length === 0 ? (
            <p className="text-center text-green-300 text-sm py-16">No matches yet.</p>
          ) : (
            <div className="space-y-2">
              {matches.map((m) => {
                const total = m.team_a_count + m.team_b_count + m.draw_count;
                const expanded = openId === m.id;
                return (
                  <div
                    key={m.id}
                    data-testid={`public-match-${m.id}`}
                    className="bg-white/10 backdrop-blur-sm rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenId(expanded ? null : m.id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left"
                    >
                      <span className="text-sm text-white font-medium">{m.match_label}</span>
                      <span className="flex items-center gap-2 text-xs text-green-300">
                        {m.result && (
                          <span className="px-2 py-0.5 bg-green-500/30 rounded-full">
                            {RESULT_LABELS[m.result](m)}
                          </span>
                        )}
                        {expanded ? '▲' : '▼'}
                      </span>
                    </button>
                    {expanded && (
                      <div className="px-4 pb-4 space-y-1.5">
                        <BreakdownRow
                          label={m.team_a}
                          count={m.team_a_count}
                          total={total}
                          isResult={m.result === 'team_a'}
                        />
                        <BreakdownRow
                          label="Draw"
                          count={m.draw_count}
                          total={total}
                          isResult={m.result === 'draw'}
                        />
                        <BreakdownRow
                          label={m.team_b}
                          count={m.team_b_count}
                          total={total}
                          isResult={m.result === 'team_b'}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-4 right-4">
        <Link to="/admin/login" className="text-xs text-green-600 hover:text-green-400 transition-colors">
          Admin
        </Link>
      </footer>
    </div>
  );
}
