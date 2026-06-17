// Read-only view of a participant's bracket picks (US-57). Shows each stage with
// the teams the player picked, so they can review without changing anything.
export default function BracketSummary({ stages, selections }) {
  const nameById = new Map();
  for (const s of stages) for (const t of s.teams) nameById.set(t.id, t.name);

  const picksByStage = new Map();
  for (const sel of selections ?? []) {
    if (!picksByStage.has(sel.stage_id)) picksByStage.set(sel.stage_id, []);
    picksByStage.get(sel.stage_id).push(nameById.get(sel.stage_team_id));
  }

  if (!stages.length) {
    return (
      <p className="text-center text-green-200 text-sm bg-white/10 rounded-xl px-4 py-6">
        No stages yet — check back once the admin sets up the bracket.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {stages.map((s) => {
        const picks = (picksByStage.get(s.id) ?? []).filter(Boolean);
        return (
          <div
            key={s.id}
            data-testid={`summary-stage-${s.id}`}
            className="bg-white/10 backdrop-blur-sm rounded-xl p-4"
          >
            <p className="text-sm text-white font-semibold">{s.name}</p>
            {s.description && (
              <p className="text-xs text-green-100/90 italic mt-0.5">{s.description}</p>
            )}
            {picks.length ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {picks.map((n, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-xs bg-green-400 text-green-950 font-medium"
                  >
                    {n}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-green-300/70 italic mt-2">Not picked yet</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
