import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getEntries, refreshStatuses } from '../services/entries.js'

const EntryContext = createContext(null)

export function EntryProvider({ children }) {
  const [entries, setEntries] = useState(() => getEntries())

  const refresh = useCallback(async () => {
    const updated = await refreshStatuses()
    setEntries(updated)
    return updated
  }, [])

  // Reload entries from localStorage (e.g. after joining a game)
  const reload = useCallback(() => {
    setEntries(getEntries())
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const pendingCount = entries.filter((e) => e.status === 'declined').length

  return (
    <EntryContext.Provider value={{ entries, refresh, reload, pendingCount }}>
      {children}
    </EntryContext.Provider>
  )
}

export const useEntryStatus = () => useContext(EntryContext)
