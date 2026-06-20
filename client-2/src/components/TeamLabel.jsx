import { useTeams } from '../context/TeamsContext.jsx'

// Inline flag/logo for a team, resolved by name. Renders nothing when there's no
// icon (e.g. legacy free-text names), so it degrades gracefully. (US-114)
export function TeamIcon({ name, className = 'w-5 h-3.5' }) {
  const { iconFor } = useTeams()
  const src = iconFor(name)
  if (!src) return null
  return <img src={src} alt="" className={`inline-block object-contain rounded-sm shrink-0 ${className}`} />
}

// Flag/logo + name in a single inline label.
export default function TeamLabel({ name, className = '', iconClassName }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <TeamIcon name={name} className={iconClassName} />
      <span>{name}</span>
    </span>
  )
}
