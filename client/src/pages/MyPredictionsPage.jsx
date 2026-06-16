import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api.js';
import BracketWizard from '../components/BracketWizard.jsx';
import BracketSummary from '../components/BracketSummary.jsx';
import {
  entriesForGame,
  getCurrentToken,
  migrateLegacy,
  nextSelfName,
  setCurrentToken,
  upsertEntry,
} from '../services/entries.js';

const OPTIONS = [
  { value: 'team_a', label: (m) => m.team_a },
  { value: 'draw', label: () => 'Draw' },
  { value: 'team_b', label: (m) => m.team_b },
];

export default function MyPredictionsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [entries, setEntries] = useState([]);
  const [saving, setSaving] = useState({});
  const [error, setError] = useState(null);
  const [finishMsg, setFinishMsg] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [adding, setAdding] = useState(false); // add-entry panel open
  const [addFor, setAddFor] = useState('self'); // 'self' | 'other'
  const [addName, setAddName] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [editing, setEditing] = useState(false); // bracket: read-only until Edit (US-57)
  const [pendingCount, setPendingCount] = useState(0); // entries awaiting approval (US-67)

  // Loads the current entry (/me uses the current token) and refreshes the
  // device's entry list for that game.
  const loadMe = useCallback(async () => {
    const { data: me } = await api.get('/participants/me');
    const existing = entriesForGame(me.game.id).find((e) => e.token === getCurrentToken());
    upsertEntry({
      token: getCurrentToken(),
      name: me.participant.display_name,
      game_id: me.game.id,
      is_self: existing?.is_self ?? true,
    });
    setData(me);
    const list = entriesForGame(me.game.id);
    setEntries(list);

    // Count how many of this device's entries for the game are pending approval. (US-67)
    try {
      const { data: sts } = await api.post('/participants/statuses', {
        tokens: list.map((e) => e.token),
      });
      setPendingCount(sts.filter((s) => s.status === 'declined').length);
    } catch {
      setPendingCount(0);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await migrateLegacy();
      if (!getCurrentToken()) {
        navigate('/join', { replace: true });
        return;
      }
      try {
        await loadMe();
      } catch (err) {
        if (err.response?.status === 401) {
          setCurrentToken(null);
          navigate('/join', { replace: true });
        } else {
          setError('Failed to load your predictions.');
        }
      }
    })();
  }, [navigate, loadMe]);

  // Bracket games are read-only until the player taps Edit (US-57). Start in edit
  // mode for a brand-new entry with no picks yet; otherwise show the summary.
  // Re-evaluated per entry (switching entries changes participant.id).
  useEffect(() => {
    if (data?.game?.type === 'bracket_prediction' && data.game.status === 'open') {
      setEditing((data.selections?.length ?? 0) === 0);
    } else {
      setEditing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.participant?.id]);

  const locked = data && data.game.status !== 'open';
  const isBracketGame = !!data && data.game.type === 'bracket_prediction';
  const hasPicks =
    !!data &&
    (isBracketGame
      ? (data.selections?.length ?? 0) > 0
      : data.predictions.some((p) => p.prediction));

  const switchEntry = async (token) => {
    if (token === getCurrentToken()) return;
    setCurrentToken(token);
    setData(null);
    setFinishMsg(null);
    setError(null);
    try {
      await loadMe();
    } catch {
      setError('Failed to load that entry.');
    }
  };

  const addEntry = async () => {
    const name = addFor === 'self' ? nextSelfName(data.game.id) : addName.trim();
    if (!name) return;
    setAddBusy(true);
    setError(null);
    try {
      // Add to the same game as the current entry — several games may be open. (US-42)
      const { data: res } = await api.post('/participants', { display_name: name, game_id: data.game.id });
      upsertEntry({
        token: res.entry_token,
        name: res.display_name,
        game_id: res.game.id,
        is_self: addFor === 'self',
      });
      setCurrentToken(res.entry_token);
      setAdding(false);
      setAddFor('self');
      setAddName('');
      setData(null);
      setFinishMsg(null);
      await loadMe();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to add entry.');
    } finally {
      setAddBusy(false);
    }
  };

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

        {data && (
          <div className="mb-4 flex items-center gap-2">
            <select
              value={getCurrentToken() ?? ''}
              onChange={(e) => switchEntry(e.target.value)}
              data-testid="entry-switcher"
              className="flex-1 rounded-lg px-3 py-2 text-sm bg-white/90 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              {entries.map((e) => (
                <option key={e.token} value={e.token}>
                  {e.name}
                </option>
              ))}
            </select>
            {data.game.status === 'open' && !adding && (
              <button
                onClick={() => setAdding(true)}
                data-testid="add-entry-button"
                className="shrink-0 px-3 py-2 bg-green-500 hover:bg-green-400 text-white text-sm font-semibold rounded-lg transition"
              >
                + Add entry
              </button>
            )}
          </div>
        )}

        {adding && (
          <div className="mb-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 space-y-3" data-testid="add-panel">
            <p className="text-sm text-green-100 font-medium">Whose entry is this?</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setAddFor('self')}
                data-testid="add-self"
                className={`py-2 rounded-lg text-sm font-medium transition ${addFor === 'self' ? 'bg-green-400 text-green-950' : 'bg-white/10 text-green-100 hover:bg-white/20'}`}
              >
                Myself
              </button>
              <button
                onClick={() => setAddFor('other')}
                data-testid="add-other"
                className={`py-2 rounded-lg text-sm font-medium transition ${addFor === 'other' ? 'bg-green-400 text-green-950' : 'bg-white/10 text-green-100 hover:bg-white/20'}`}
              >
                Someone else
              </button>
            </div>
            {addFor === 'self' ? (
              <p className="text-xs text-green-300">
                This entry will be named <span className="font-semibold">{nextSelfName(data.game.id)}</span>.
              </p>
            ) : (
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Their name"
                data-testid="add-name"
                className="w-full rounded-lg px-3 py-2 text-sm bg-white/90 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setAdding(false); setAddFor('self'); setAddName(''); }}
                className="px-3 py-2 text-sm text-green-200 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={addEntry}
                disabled={addBusy || (addFor === 'other' && !addName.trim())}
                data-testid="add-confirm"
                className="px-4 py-2 bg-green-500 hover:bg-green-400 disabled:bg-green-700 text-white text-sm font-semibold rounded-lg transition"
              >
                {addBusy ? 'Adding…' : 'Add entry'}
              </button>
            </div>
          </div>
        )}

        {locked && !adding && (
          <p className="text-sm text-amber-200 bg-amber-500/20 border border-amber-400/40 rounded-xl px-4 py-3 mb-4 text-center">
            🔒 The game has started — predictions are locked.
          </p>
        )}
        {error && (
          <p className="text-sm text-red-200 bg-red-500/20 border border-red-400/40 rounded-xl px-4 py-3 mb-4 text-center">
            {error}
          </p>
        )}
        {data && !adding && data.participant.status === 'declined' && (
          <p
            data-testid="declined-banner"
            className="text-sm text-amber-100 bg-amber-500/25 border border-amber-400/50 rounded-xl px-4 py-3 mb-4 text-center"
          >
            ⚠️ {data.participant.status_message || 'Your entry is awaiting admin approval.'}
          </p>
        )}
        {data && !adding && entries.length > 1 && pendingCount > 0 && (
          <p
            data-testid="pending-entries-warning"
            className="text-sm text-amber-100 bg-amber-500/15 border border-amber-400/40 rounded-xl px-4 py-3 mb-4 text-center"
          >
            ⏳ {pendingCount} of your {entries.length} entries{' '}
            {pendingCount === 1 ? 'is' : 'are'} pending admin approval.
          </p>
        )}

        {/* While adding an entry, hide the current entry's predictions so the
            "Whose entry is this?" step stands alone. (US-58) */}
        {adding ? null : !data ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-white/10 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : isBracketGame ? (
          editing && !locked ? (
            <BracketWizard
              key={data.participant.id}
              stages={data.stages ?? []}
              initialSelections={data.selections ?? []}
              onSaved={async () => {
                setEditing(false);
                await loadMe();
                // The wizard's Save doubles as Finish — confirm with the admin's
                // finish message (US-59).
                await finish();
              }}
              onCancel={() => setEditing(false)}
              onError={setError}
            />
          ) : (
            <>
              <BracketSummary stages={data.stages ?? []} selections={data.selections ?? []} />
              {!locked && (
                <button
                  onClick={() => setEditing(true)}
                  data-testid="edit-predictions"
                  className="mt-3 w-full py-2 bg-green-500 hover:bg-green-400 text-white text-sm font-semibold rounded-lg transition"
                >
                  ✏️ {hasPicks ? 'Edit predictions' : 'Make predictions'}
                </button>
              )}
            </>
          )
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

        {!locked && data && !adding && !editing && (
          <div className="mt-6 text-center">
            {finishMsg ? (
              <p
                data-testid="finish-message"
                className="text-sm text-green-950 bg-green-400 rounded-xl px-4 py-3 font-medium"
              >
                ✓ {finishMsg}
              </p>
            ) : (
              // Bracket games confirm via the wizard's Save (US-59); only the match
              // game shows a separate Finish button.
              !isBracketGame &&
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
