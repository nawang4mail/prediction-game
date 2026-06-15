import { useState } from 'react';
import api from '../services/api.js';

// Participant view for a Bracket Prediction game (US-48): all stages shown at
// once; the player picks exactly pick_count teams per stage and saves each.
export default function BracketPredictions({ stages, initialSelections, locked, onError, onSaved }) {
  const groupedInitial = {};
  for (const s of stages) groupedInitial[s.id] = [];
  for (const sel of initialSelections ?? []) {
    if (groupedInitial[sel.stage_id]) groupedInitial[sel.stage_id].push(sel.stage_team_id);
  }

  const [selected, setSelected] = useState(groupedInitial);
  const [saving, setSaving] = useState({});
  const [savedStage, setSavedStage] = useState({});

  const toggle = (stage, teamId) => {
    if (locked) return;
    setSavedStage((s) => ({ ...s, [stage.id]: false }));
    setSelected((prev) => {
      const current = prev[stage.id] ?? [];
      if (current.includes(teamId)) {
        return { ...prev, [stage.id]: current.filter((id) => id !== teamId) };
      }
      if (current.length >= stage.pick_count) return prev; // at the limit
      return { ...prev, [stage.id]: [...current, teamId] };
    });
  };

  const save = async (stage) => {
    setSaving((s) => ({ ...s, [stage.id]: true }));
    onError(null);
    try {
      await api.put('/participants/me/bracket', {
        stage_id: stage.id,
        team_ids: selected[stage.id] ?? [],
      });
      setSavedStage((s) => ({ ...s, [stage.id]: true }));
      onSaved?.();
    } catch (err) {
      onError(err.response?.data?.message ?? 'Failed to save your picks.');
    } finally {
      setSaving((s) => ({ ...s, [stage.id]: false }));
    }
  };

  if (!stages.length) {
    return (
      <p className="text-center text-green-200 text-sm bg-white/10 rounded-xl px-4 py-6">
        No stages yet — check back once the admin sets up the bracket.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {stages.map((stage) => {
        const picks = selected[stage.id] ?? [];
        const complete = picks.length === stage.pick_count;
        return (
          <div
            key={stage.id}
            data-testid={`stage-${stage.id}`}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
          >
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-sm text-white font-semibold">{stage.name}</p>
              <p className="text-xs text-green-300" data-testid={`count-${stage.id}`}>
                {picks.length} / {stage.pick_count} picked
              </p>
            </div>
            <p className="text-xs text-green-300/80 mb-3">
              Pick {stage.pick_count} · {stage.points_per_correct} pt
              {stage.points_per_correct === 1 ? '' : 's'} each
              {stage.all_correct_bonus > 0 ? ` · +${stage.all_correct_bonus} all-correct bonus` : ''}
            </p>
            {stage.parent_ids?.length > 0 && stage.teams.length === 0 && (
              <p className="text-xs text-green-300/80 italic mb-2" data-testid={`needs-parents-${stage.id}`}>
                Make your picks in the earlier stages first — your advancing teams appear here.
              </p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {stage.teams.map((t) => {
                const isPicked = picks.includes(t.id);
                const isWinner = !!t.is_winner;
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(stage, t.id)}
                    disabled={locked || saving[stage.id]}
                    className={`py-2 px-2 rounded-lg text-xs font-medium transition text-left truncate
                      ${isPicked ? 'bg-green-400 text-green-950' : 'bg-white/10 text-green-100 hover:bg-white/20'}
                      ${locked ? 'opacity-70 cursor-not-allowed' : ''}
                      ${isWinner ? 'ring-2 ring-yellow-300' : ''}`}
                  >
                    {isPicked ? '✓ ' : ''}
                    {t.name}
                    {isWinner ? ' 🏆' : ''}
                  </button>
                );
              })}
            </div>
            {!locked && (
              <div className="mt-3 flex items-center justify-end gap-2">
                {savedStage[stage.id] && (
                  <span className="text-xs text-green-300" data-testid={`saved-${stage.id}`}>
                    ✓ Saved
                  </span>
                )}
                <button
                  onClick={() => save(stage)}
                  disabled={!complete || saving[stage.id]}
                  data-testid={`save-${stage.id}`}
                  className="px-4 py-1.5 bg-green-500 hover:bg-green-400 disabled:bg-green-700/50 disabled:text-green-300 text-white text-xs font-semibold rounded-lg transition"
                >
                  {saving[stage.id] ? 'Saving…' : 'Save picks'}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
