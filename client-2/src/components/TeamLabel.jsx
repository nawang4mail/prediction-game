import { useTeams } from '../context/TeamsContext.jsx'

// Icon size presets. Each is roughly double the previous design, and a touch
// larger on mobile (where only the short code shows beside it). (US-114)
const SIZES = {
  sm: 'w-9 h-6 sm:w-8 sm:h-6',
  md: 'w-12 h-8 sm:w-10 sm:h-7',
  lg: 'w-14 h-10 sm:w-12 sm:h-8',
}

// Inline flag/logo for a team, resolved by name. Renders nothing when there's no
// icon (e.g. legacy free-text names), so it degrades gracefully. (US-114)
export function TeamIcon({ name, size = 'md', className = '' }) {
  const { iconFor } = useTeams()
  const src = iconFor(name)
  if (!src) return null
  return (
    <img
      src={src}
      alt=""
      className={`inline-block object-contain rounded-sm ring-1 ring-black/10 shrink-0 ${SIZES[size] ?? SIZES.md} ${className}`}
    />
  )
}

// Team name that collapses to the short code on small screens (where space is
// tight) and shows the full name from `sm:` up. Falls back to the raw name when
// the team isn't in the reference table. (US-114)
export function TeamName({ name }) {
  const { codeFor } = useTeams()
  const code = codeFor(name)
  if (!code) return name
  return (
    <>
      <span className="sm:hidden">{code}</span>
      <span className="hidden sm:inline">{name}</span>
    </>
  )
}

// Flag/logo + name in a single inline label.
export default function TeamLabel({ name, size, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <TeamIcon name={name} size={size} />
      <TeamName name={name} />
    </span>
  )
}
