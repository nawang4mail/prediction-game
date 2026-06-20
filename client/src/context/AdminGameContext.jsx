import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api.js'

const AdminGameContext = createContext(null)

export function AdminGameProvider({ children }) {
  const [games, setGames] = useState([])
  const [selectedId, setSelectedId] = useState(() => {
    const stored = sessionStorage.getItem('admin_game_id')
    return stored ? Number(stored) : null
  })
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/games')
      setGames(data)
      // Auto-select first game if none selected
      if (!sessionStorage.getItem('admin_game_id') && data.length > 0) {
        const id = data[0].id
        sessionStorage.setItem('admin_game_id', id)
        setSelectedId(id)
      }
      return data
    } catch {
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const select = (id) => {
    const numId = Number(id)
    sessionStorage.setItem('admin_game_id', numId)
    setSelectedId(numId)
  }

  const selectedGame = games.find((g) => g.id === selectedId) ?? null

  return (
    <AdminGameContext.Provider value={{ games, loading, selectedId, selectedGame, select, refresh }}>
      {children}
    </AdminGameContext.Provider>
  )
}

export const useAdminGame = () => useContext(AdminGameContext)
