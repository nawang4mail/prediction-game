import { useState, useRef, useEffect, useMemo } from 'react'
import { useTeams } from '../context/TeamsContext.jsx'
import { TeamIcon } from './TeamLabel.jsx'

// Searchable single-select for a team. Stores and returns the team's full_name
// (the canonical string stored in matches), so callers are unchanged. (US-114)
export default function TeamSelect({ value, onChange, placeholder = 'Select team', className = '' }) {
  const { teams } = useTeams()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const q = query.trim().toLowerCase()
  const matches = useMemo(
    () =>
      teams
        .filter((t) => !q || t.full_name.toLowerCase().includes(q) || t.short_name.toLowerCase().includes(q))
        .slice(0, 50),
    [teams, q]
  )

  const select = (name) => { onChange(name); setQuery(''); setOpen(false) }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-left bg-white outline-none focus:border-blue-400"
      >
        {value ? (
          <>
            <TeamIcon name={value} />
            <span className="truncate">{value}</span>
          </>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 flex flex-col overflow-hidden">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="px-3 py-2 border-b border-gray-100 text-sm outline-none"
          />
          <div className="overflow-y-auto">
            {matches.length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400">No teams found.</p>
            ) : (
              matches.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => select(t.full_name)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-blue-50"
                >
                  <TeamIcon name={t.full_name} />
                  <span className="flex-1 truncate">{t.full_name}</span>
                  <span className="text-xs text-gray-400">{t.short_name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
