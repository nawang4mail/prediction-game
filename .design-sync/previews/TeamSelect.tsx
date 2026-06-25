import { TeamSelect } from 'client'

// A team is chosen — the control shows the selected name (flag resolves from the
// teams reference data at runtime; previews run without it, so the name shows
// as text).
export function Selected() {
  return (
    <div style={{ width: 280 }}>
      <TeamSelect value="Brazil" onChange={() => {}} />
    </div>
  )
}

// Empty state with the placeholder prompt.
export function Placeholder() {
  return (
    <div style={{ width: 280 }}>
      <TeamSelect value="" onChange={() => {}} placeholder="Select a team" />
    </div>
  )
}
