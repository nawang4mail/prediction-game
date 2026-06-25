import { TeamMultiSelect } from 'client'

// Several teams picked — each renders as a removable chip in selection order.
export function WithSelections() {
  return (
    <div style={{ width: 360 }}>
      <TeamMultiSelect value={['Brazil', 'France', 'Argentina']} onChange={() => {}} />
    </div>
  )
}

// Empty state with the placeholder prompt.
export function Empty() {
  return (
    <div style={{ width: 360 }}>
      <TeamMultiSelect value={[]} onChange={() => {}} placeholder="Add teams…" />
    </div>
  )
}
