// Chain-aware team availability for Bracket combined stages (US-52 / US-107).
//
// A combined stage (`parent_ids` non-empty) doesn't offer every team in its pool —
// it only offers the teams the player actually advanced from its parent stages.
// Stages are processed in order so a parent's picks are known before its child is
// computed. Matching is by team name, since a combined stage's pool is the union
// of its parents' team names (server-side recomputeDerived).
//
// `stages`     : array of { id, teams: [{ id, name }], parent_ids?: number[] }
// `selections` : { [stageId]: number[] }  — team ids the player has chosen
// returns      : { [stageId]: Set<teamId> } — the ids selectable in each stage
export function availabilityByStage(stages, selections) {
  const nameById = new Map()
  for (const s of stages) for (const t of s.teams ?? []) nameById.set(t.id, t.name)

  const avail = {}
  const advancedNames = {} // { [stageId]: Set<teamName> } — valid picks per stage
  for (const s of stages) {
    let ids
    if (s.parent_ids?.length) {
      const pool = new Set()
      for (const pid of s.parent_ids) for (const n of advancedNames[pid] ?? []) pool.add(n)
      ids = new Set((s.teams ?? []).filter((t) => pool.has(t.name)).map((t) => t.id))
    } else {
      ids = new Set((s.teams ?? []).map((t) => t.id))
    }
    avail[s.id] = ids
    const valid = (selections[s.id] ?? []).filter((id) => ids.has(id))
    advancedNames[s.id] = new Set(valid.map((id) => nameById.get(id)))
  }
  return avail
}

// Drops any selected team that isn't currently available in its stage — used
// before submitting so a stale pick (e.g. left over after a parent pick changed)
// never reaches the API, which would reject it.
export function pruneSelections(stages, selections) {
  const avail = availabilityByStage(stages, selections)
  const clean = {}
  for (const s of stages) {
    clean[s.id] = (selections[s.id] ?? []).filter((id) => avail[s.id].has(id))
  }
  return clean
}
