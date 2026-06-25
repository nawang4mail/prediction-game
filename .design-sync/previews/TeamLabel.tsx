import { TeamLabel } from 'client'

// Inline flag + name label. The flag image resolves from the teams reference
// data at runtime; without it the label degrades gracefully to the team name.
export function Default() {
  return <TeamLabel name="Brazil" />
}

// A column of labels — how they read in a list (matches, standings, pickers).
export function Lineup() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 4 }}>
      <TeamLabel name="Brazil" />
      <TeamLabel name="Argentina" />
      <TeamLabel name="France" />
      <TeamLabel name="Spain" />
      <TeamLabel name="Germany" />
    </div>
  )
}
