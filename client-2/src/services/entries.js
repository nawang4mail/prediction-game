// Manages participant entries stored on this device.
// Each entry: { token, name, game_id, is_self, status }
import api from './api.js'

const LIST_KEY = 'pg_entries'

export const getEntries = () => {
  try {
    return JSON.parse(localStorage.getItem(LIST_KEY)) || []
  } catch {
    return []
  }
}

const saveEntries = (list) => localStorage.setItem(LIST_KEY, JSON.stringify(list))

export const upsertEntry = (entry) => {
  const list = getEntries().filter((e) => e.token !== entry.token)
  list.push(entry)
  saveEntries(list)
}

export const removeEntry = (token) => {
  saveEntries(getEntries().filter((e) => e.token !== token))
}

export const entriesForGame = (gameId) =>
  getEntries().filter((e) => String(e.game_id) === String(gameId))

export const allTokens = () => getEntries().map((e) => e.token)

// Refresh all stored entry statuses from the server
export const refreshStatuses = async () => {
  const entries = getEntries()
  if (!entries.length) return entries
  const tokens = entries.map((e) => e.token)
  try {
    const { data } = await api.post('/participants/statuses', { tokens })
    const statusMap = Object.fromEntries(data.map((s) => [s.token, s]))
    const updated = entries.map((e) => ({
      ...e,
      status: statusMap[e.token]?.status ?? e.status,
      status_message: statusMap[e.token]?.status_message ?? e.status_message,
    }))
    saveEntries(updated)
    return updated
  } catch {
    return entries
  }
}
