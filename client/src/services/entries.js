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

// The next auto-numbered name for an additional "myself" entry in a game, based
// on the entries already on this device: base name + " #2", " #3", … (US-103).
const stripSuffix = (name) => name.replace(/\s*#\d+\s*$/, '').trim()

export const nextSelfName = (gameId) => {
  const entries = entriesForGame(gameId)
  if (!entries.length) return ''
  const base = stripSuffix(entries[0].name)
  let max = 1
  for (const e of entries) {
    if (stripSuffix(e.name) !== base) continue
    const m = e.name.match(/#(\d+)\s*$/)
    const n = m ? Number(m[1]) : 1
    if (n > max) max = n
  }
  return `${base} #${max + 1}`
}

// Refresh all stored entry statuses from the server. Entries the server no
// longer knows about (e.g. deleted by an admin) are pruned from the device, so
// the player only ever sees entries that still exist. (US-103)
export const refreshStatuses = async () => {
  const entries = getEntries()
  if (!entries.length) return entries
  const tokens = entries.map((e) => e.token)
  try {
    const { data } = await api.post('/participants/statuses', { tokens })
    const statusMap = Object.fromEntries(data.map((s) => [s.token, s]))
    const updated = entries
      .filter((e) => statusMap[e.token]) // drop entries deleted server-side
      .map((e) => ({
        ...e,
        status: statusMap[e.token].status ?? e.status,
        status_message: statusMap[e.token].status_message ?? e.status_message,
      }))
    saveEntries(updated)
    return updated
  } catch {
    return entries
  }
}
