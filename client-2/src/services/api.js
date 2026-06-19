import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const adminToken = localStorage.getItem('admin_token')
  if (adminToken) config.headers.Authorization = `Bearer ${adminToken}`

  const url = config.url ?? ''

  // Send entry token for participant routes
  if (url.startsWith('/participants')) {
    const entries = getEntries()
    const gameId = config.params?.game_id
    if (gameId) {
      const match = entries.find((e) => String(e.game_id) === String(gameId))
      if (match) config.headers['x-entry-token'] = match.token
    } else {
      const current = localStorage.getItem('entry_token')
      if (current) config.headers['x-entry-token'] = current
    }
  }

  // Admin game scope
  const adminGameId = sessionStorage.getItem('admin_game_id')
  if (
    adminGameId &&
    url.startsWith('/admin') &&
    !url.startsWith('/admin/games') &&
    !url.startsWith('/admin/auth')
  ) {
    config.params = { ...config.params, game_id: adminGameId }
  }

  return config
})

function getEntries() {
  try {
    return JSON.parse(localStorage.getItem('pg_entries')) || []
  } catch {
    return []
  }
}

export default api
