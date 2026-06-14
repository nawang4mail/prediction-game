import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api.js';

const OPTIONS = [
  { value: 'team_a', label: (m) => m.team_a },
  { value: 'draw', label: () => 'Draw' },
  { value: 'team_b', label: (m) => m.team_b },
];

export default function MyPredictionsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState(null);
  const [finishMsg, setFinishMsg] = useState(null);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('entry_token')) {
      navigate('/join', { replace: true });
      return;
    }
    api.get('/participants/me')
      .then(({ data }) => setData(data))
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem('entry_token');
          navigate('/join', { replace: true });
        } else {
          setError('Failed to load your predictions.');
        }
      });
  }, [navigate]);

  const locked = data && data.game.status !== 'open';
  const hasPicks = !!data && data.predictions.some((p) => p.prediction);

  const finish = async () => {
    setFinishing(true);
    setError(null);
    try {
      const { data: res } = await api.post('/participants/me/finish');
      setFinishMsg(res.message);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not confirm your predictions.');
    } finally {
      setFinishing(false);
    }
  };

  const pick = async (match, value) => {
    if (locked) return;
    const current = data.predictions.find((p) => p.match_id === match.match_id);
    const next = current?.prediction === value ? null : value;
    setSaving((s) => ({ ...s, [match.match_id]: true }));
    setError(null);
    setFinishMsg(null); // editing after finishing lets the participant re-confirm
    try {
      await api.put('/participants/me/predictions', { match_id: match.match_id, prediction: next });
      setData((d) => ({
        ...d,
        predictions: d.predictions.map((p) =>
          p.match_id === match.match_id ? { ...p, prediction: next } : p
        ),
      }));
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save your pick.');
    } finally {
      setSaving((s) => {
        const n = { ...s };
        delete n[match.match_id];
        return n;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-950 px-4 py-10">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🎯</div>
          <h1 className="text-2xl font-bold text-white">My Predictions</h1>
          {data && (
            <p className="text-green-300 mt-1 text-sm">
              {data.participant.display_name} · {data.game.name}
            </p>
          )}
        </div>

        {locked && (
          <p className="text-sm text-amber-200 bg-amber-500/20 border border-amber-400/40 rounded-xl px-4 py-3 mb-4 text-center">
            🔒 The game has started — predictions are locked.
          </p>
        )}
        {error && (
          <p className="text-sm text-red-200 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 mb-4 text-center">
            {error}
          </p>
        )}

        {!data ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-white/10 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : data.predictions.length === 0 ? (
          <p className="text-center text-green-200 text-sm bg-white/10 rounded-xl px-4 py-6">
            No matches yet — check back once the admin adds fixtures.
          </p>
        ) : (
          <div className="space-y-2">
            {data.predictions.map((m) => (
              <div
                key={m.match_id}
                data-testid={`match-${m.match_id}`}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
              >
                <p className="text-sm text-white font-medium mb-3 text-center">{m.match_label}</p>
                <div className="grid grid-cols-3 gap-2">
                  {OPTIONS.map(({ value, label }) => {
                    const selected = m.prediction === value;
                    return (
                      <button
                        key={value}
                        onClick={() => pick(m, value)}
                        disabled={locked || saving[m.match_id]}
                        className={`py-2 px-1 rounded-lg text-xs font-medium transition truncate
                          ${selected
                            ? 'bg-green-400 text-green-950'
                            : 'bg-white/10 text-green-100 hover:bg-white/20'}
                          ${locked ? 'opacity-60 cursor-not-allowed' : ''}`}
                      >
                        {label(m)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {!locked && data && (
          <div className="mt-6 text-center">
            {finishMsg ? (
              <p
                data-testid="finish-message"
                className="text-sm text-green-950 bg-green-400 rounded-xl px-4 py-3 font-medium"
              >
                ✓ {finishMsg}
              </p>
            ) : (
              hasPicks && (
                <button
                  onClick={finish}
                  disabled={finishing}
                  data-testid="finish-button"
                  className="w-full py-2.5 bg-green-500 hover:bg-green-400 disabled:bg-green-700 text-white text-sm font-semibold rounded-lg transition"
                >
                  {finishing ? 'Confirming…' : '✓ Finish — Send My Predictions'}
                </button>
              )
            )}
          </div>
        )}

        <p className="text-center mt-8">
          <Link to="/" className="text-sm text-green-300 hover:text-green-100 transition">
            ← Back to Leaderboard
          </Link>
        </p>
      </div>
    </div>
  );
}
