import { useState, useRef, useEffect, useMemo } from 'react'
import { useTeams } from '../context/TeamsContext.jsx'
import { TeamIcon } from './TeamLabel.jsx'

// Searchable multi-select returning an ordered array of full_names. Replaces the
// bracket comma-separated textarea; chips keep selection order and are removable.
// (US-114)
export default function TeamMultiSelect({ value = [], onChange, placeholder = 'Add teams…' }) {
  const { teams } = useTeams()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const selected = useMemo(() => new Set(value.map((v) => v.toLowerCase())), [value])
  const q = query.trim().toLowerCase()
  const matches = useMemo(
    () =>
      teams
        .filter(
          (t) =>
            !selected.has(t.full_name.toLowerCase()) &&
            (!q || t.full_name.toLowerCase().includes(q) || t.short_name.toLowerCase().includes(q))
        )
        .slice(0, 50),
    [teams, q, selected]
  )

  const add = (name) => { onChange([...value, name]); setQuery('') }
  const removeAt = (i) => onChange(value.filter((_, idx) => idx !== i))

  return (
    <div ref={ref} className="relative">
      <div
        className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-gray-200 bg-white min-h-[2.5rem]"
        onClick={() => setOpen(true)}
      >
        {value.map((name, i) => (
          <span
            key={`${name}-${i}`}
            className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs font-medium pl-1.5 pr-1 py-1 rounded-lg"
          >
            <TeamIcon name={name} size="sm" />
            <span>{name}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeAt(i) }}
              className="text-gray-400 hover:text-red-500 ml-0.5"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[6rem] text-sm outline-none bg-transparent"
        />
      </div>
      {open && matches.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {matches.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => add(t.full_name)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-blue-50"
            >
              <TeamIcon name={t.full_name} />
              <span className="flex-1 truncate">{t.full_name}</span>
              <span className="text-xs text-gray-400">{t.short_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
