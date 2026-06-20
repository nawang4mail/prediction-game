import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import api from '../services/api.js'

// Reference list of teams (countries/clubs), loaded once for the whole app
// (US-114). Pickers read `teams`; displays resolve a name → local icon path via
// `iconFor`. Names remain the canonical identifier stored in matches/stages.
const TeamsContext = createContext({ teams: [], iconFor: () => null, reload: () => {} })

export function TeamsProvider({ children }) {
  const [teams, setTeams] = useState([])

  const reload = useCallback(() => {
    api.get('/teams').then(({ data }) => setTeams(data)).catch(() => {})
  }, [])

  useEffect(() => { reload() }, [reload])

  const byName = useMemo(() => {
    const map = new Map()
    teams.forEach((t) => map.set(t.full_name.toLowerCase(), t))
    return map
  }, [teams])

  const iconFor = useCallback(
    (name) => (name ? byName.get(String(name).toLowerCase())?.icon ?? null : null),
    [byName]
  )

  const value = useMemo(() => ({ teams, iconFor, reload }), [teams, iconFor, reload])
  return <TeamsContext.Provider value={value}>{children}</TeamsContext.Provider>
}

export function useTeams() {
  return useContext(TeamsContext)
}
