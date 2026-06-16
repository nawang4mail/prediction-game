import { useState } from 'react';
import api from '../services/api.js';

// One-stage-at-a-time prediction wizard for Bracket Prediction games (US-56).
// Picks are held in memory until Save (so Cancel can discard them); Save commits
// every stage at once and is enabled only when all stages are complete. Combined
// stages (US-52) show the teams advanced from the player's in-wizard parent picks.
export default function BracketWizard({ stages, initialSelections, onSaved, onCancel, onError }) {
  const seed = {};
  for (const s of stages) seed[s.id] = [];
  for (const sel of initialSelections ?? []) {
    if (seed[sel.stage_id]) seed[sel.stage_id].push(sel.stage_team_id);
  }

  const [selected, setSelected] = useState(seed);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const nameById = new Map();
  for (const s of stages) for (const t of s.teams) nameById.set(t.id, t.name);

  // Chain-aware availability: process stages in order so a combined stage's pool
  // is the names the player validly picked across its parents.
  const availByStage = {};
  {
    const pickedNames = {};
    for (const s of stages) {
      let availIds;
      if (s.parent_ids?.length) {
        const advanced = new Set();
        for (const pid of s.parent_ids) for (const n of pickedNames[pid] ?? []) advanced.add(n);
        availIds = new Set(s.teams.filter((t) => advanced.has(t.name)).map((t) => t.id));
      } else {
        availIds = new Set(s.teams.map((t) => t.id));
      }
      availByStage[s.id] = availIds;
      const valid = (selected[s.id] ?? []).filter((id) => availIds.has(id));
      pickedNames[s.id] = new Set(valid.map((id) => nameById.get(id)));
    }
  }

  const validPicks = (s) => (selected[s.id] ?? []).filter((id) => availByStage[s.id].has(id));
  const isComplete = (s) => validPicks(s).length === s.pick_count;
  const allComplete = stages.every(isComplete);

  if (!stages.length) {
    return (
      <p className="text-center text-green-200 text-sm bg-white/10 rounded-xl px-4 py-6">
        No stages yet — check back once the admin sets up the bracket.
      </p>
    );
  }

  const stage = stages[step];
  const available = stage.teams.filter((t) => availByStage[stage.id].has(t.id));
  const picks = validPicks(stage);

  const toggle = (teamId) => {
    setSelected((prev) => {
      const cur = prev[stage.id] ?? [];
      if (cur.includes(teamId)) return { ...prev, [stage.id]: cur.filter((id) => id !== teamId) };
      if (picks.length >= stage.pick_count) return prev; // at the limit
      return { ...prev, [stage.id]: [...cur, teamId] };
    });
  };

  const save = async () => {
    if (!allComplete) return;
    setSaving(true);
    onError?.(null);
    try {
      // Save in stage order so a combined stage validates against its now-saved parents.
      for (const s of stages) {
        await api.put('/participants/me/bracket', { stage_id: s.id, team_ids: validPicks(s) });
      }
      onSaved?.();
    } catch (err) {
      onError?.(err.response?.data?.message ?? 'Failed to save your bracket.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    if (window.confirm('Cancel and discard the changes to your predictions?')) onCancel?.();
  };

  return (
    <div data-testid="bracket-wizard">
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex gap-1">
          {stages.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full ${
                isComplete(s) ? 'bg-green-400' : i === step ? 'bg-green-200' : 'bg-white/20'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-green-300 mt-1.5 text-center" data-testid="wizard-progress">
          Stage {step + 1} of {stages.length}
        </p>
      </div>

      <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
        <div className="flex items-baseline justify-between mb-1">
          <p className="text-sm text-white font-semibold">{stage.name}</p>
          <p className="text-xs text-green-300" data-testid="wizard-count">
            {picks.length} / {stage.pick_count} picked
          </p>
        </div>
        {stage.description && (
          <p className="text-xs text-green-100/90 italic mb-2">{stage.description}</p>
        )}
        <p className="text-xs text-green-300/80 mb-3">
          Pick {stage.pick_count} · {stage.points_per_correct} pt
          {stage.points_per_correct === 1 ? '' : 's'} each
          {stage.all_correct_bonus > 0 ? ` · +${stage.all_correct_bonus} all-correct bonus` : ''}
        </p>

        {stage.parent_ids?.length > 0 && available.length === 0 ? (
          <p className="text-xs text-green-300/80 italic" data-testid="wizard-needs-parents">
            Go back and make your picks in the earlier stages first — your advancing teams
            appear here.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {available.map((t) => {
              const isPicked = picks.includes(t.id);
              return (
                <button
                  key={t.id}
                  onClick={() => toggle(t.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-medium transition text-left truncate ${
                    isPicked ? 'bg-green-400 text-green-950' : 'bg-white/10 text-green-100 hover:bg-white/20'
                  }`}
                >
                  {isPicked ? '✓ ' : ''}
                  {t.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
        <button
          onClick={cancel}
          data-testid="wizard-cancel"
          className="px-3 py-2 text-sm text-green-200 hover:text-white transition"
        >
          Cancel
        </button>
        <div className="flex items-center gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              data-testid="wizard-back"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-green-100 text-sm font-medium rounded-lg transition"
            >
              Back
            </button>
          )}
          {step < stages.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!isComplete(stage)}
              data-testid="wizard-next"
              className="px-4 py-2 bg-green-500 hover:bg-green-400 disabled:bg-green-700/50 disabled:text-green-300 text-white text-sm font-semibold rounded-lg transition"
            >
              Next
            </button>
          ) : (
            <button
              onClick={save}
              disabled={!allComplete || saving}
              data-testid="wizard-save"
              className="px-4 py-2 bg-green-500 hover:bg-green-400 disabled:bg-green-700/50 disabled:text-green-300 text-white text-sm font-semibold rounded-lg transition"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
