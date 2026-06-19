import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api.js'
import { entriesForGame } from '../services/entries.js'

const POLL_MS = 15000

function StatusBadge({ status }) {
  const map = {
    open: 'bg-green-100 text-green-800',
    locked: 'bg-yellow-100 text-yellow-800',
    finished: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

function Skeleton() {
  return (
    <div className="space-y-2 px-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-12 bg-white/20 rounded-lg animate-pulse" />
      ))}
    </div>
  )
}

export default function LeaderboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [games, setGames] = useState([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [lbLoading, setLbLoading] = useState(true)
  const [lbError, setLbError] = useState(false)
  const prevDataRef = useRef('')

  const selectedId = searchParams.get('game') ? Number(searchParams.get('game')) : null

  // Load games list
  useEffect(() => {
    api.get('/games').then(({ data }) => {
      setGames(data)
      // Auto-select first game if none selected
      if (!searchParams.get('game') && data.length > 0) {
        setSearchParams({ game: data[0].id }, { replace: true })
      }
    }).catch(() => {}).finally(() => setGamesLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load leaderboard for selected game
  const loadLeaderboard = useCallback(async () => {
    if (!selectedId) return
    try {
      const { data } = await api.get('/leaderboard', { params: { game_id: selectedId } })
      const json = JSON.stringify(data)
      if (json !== prevDataRef.current) {
        prevDataRef.current = json
        setRows(data)
      }
      setLbError(false)
    } catch {
      setLbError(true)
    } finally {
      setLbLoading(false)
    }
  }, [selectedId])

  useEffect(() => {
    setLbLoading(true)
    prevDataRef.current = ''
    loadLeaderboard()
    const id = setInterval(loadLeaderboard, POLL_MS)
    return () => clearInterval(id)
  }, [loadLeaderboard])

  // Find the best (lowest rank) entry for this device in the selected game.
  // Names are unique per game, so display_name matching is reliable.
  const myEntries = selectedId ? entriesForGame(selectedId) : []
  const myNames = new Set(myEntries.map((e) => e.name?.toLowerCase()))
  const myRows = rows.filter((r) => myNames.has(r.display_name?.toLowerCase()))
  const bestMyRow = myRows.length
    ? myRows.reduce((best, r) => (r.rank < best.rank ? r : best), myRows[0])
    : null

  const selectedGame = games.find((g) => g.id === selectedId)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 py-12 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-oswald text-5xl sm:text-6xl font-bold text-white uppercase tracking-wider mb-6">
            Leaderboard
          </h1>

          {gamesLoading ? (
            <div className="h-12 w-72 mx-auto bg-white/20 rounded-xl animate-pulse" />
          ) : (
            <div className="relative inline-block">
              <select
                value={selectedId ?? ''}
                onChange={(e) => setSearchParams({ game: e.target.value })}
                className="appearance-none bg-white/10 border border-white/30 text-white font-inter font-semibold rounded-xl px-6 py-3 pr-10 text-base cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/50 min-w-[260px]"
              >
                {games.map((g) => (
                  <option key={g.id} value={g.id} className="bg-blue-800 text-white">
                    {g.name} — {g.status.toUpperCase()}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/70">▾</span>
            </div>
          )}

          {selectedGame && (
            <div className="mt-3">
              <StatusBadge status={selectedGame.status} />
            </div>
          )}
        </div>
      </div>

      {/* Leaderboard table */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Scrollable rows */}
          <div className="overflow-y-auto" style={{ maxHeight: '520px' }}>
            {lbLoading ? (
              <div className="py-6">
                <Skeleton />
              </div>
            ) : lbError ? (
              <div className="py-16 text-center">
                <p className="text-red-500 text-sm">Failed to load leaderboard.</p>
                <button onClick={loadLeaderboard} className="mt-2 text-blue-600 text-sm underline">
                  Retry
                </button>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-sm">
                No entries yet. Be the first to join!
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
                  <tr>
                    <th className="py-3 pl-5 pr-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">
                      Rank
                    </th>
                    <th className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="py-3 pl-3 pr-5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => {
                    const isMe = bestMyRow && row.id === bestMyRow.id
                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors ${isMe ? 'bg-orange-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="py-3.5 pl-5 pr-3">
                          <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            row.rank === 1 ? 'bg-yellow-100 text-yellow-700' :
                            row.rank === 2 ? 'bg-gray-100 text-gray-600' :
                            row.rank === 3 ? 'bg-orange-100 text-orange-700' :
                            'text-gray-500'
                          }`}>
                            {row.rank}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`font-inter font-medium ${isMe ? 'text-orange-700' : 'text-gray-900'}`}>
                            {row.display_name}
                          </span>
                          {isMe && (
                            <span className="ml-2 text-xs text-orange-500 font-semibold">YOU</span>
                          )}
                        </td>
                        <td className="py-3.5 pl-3 pr-5 text-right">
                          <span className={`font-oswald text-lg font-bold ${isMe ? 'text-orange-600' : 'text-gray-800'}`}>
                            {row.total_points}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pinned sticky row for this device's best entry */}
          {bestMyRow && (
            <div className="border-t-2 border-orange-400 bg-orange-500 text-white flex items-center px-5 py-3 gap-3">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-orange-400 text-sm font-bold shrink-0">
                {bestMyRow.rank}
              </span>
              <span className="flex-1 font-inter font-semibold truncate">
                {bestMyRow.display_name}
                <span className="ml-2 text-orange-200 text-xs font-normal">YOU</span>
              </span>
              <span className="font-oswald text-xl font-bold shrink-0">
                {bestMyRow.total_points} pts
              </span>
            </div>
          )}
        </div>

        {rows.length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-3">
            {rows.length} {rows.length === 1 ? 'entry' : 'entries'} · updates every 15s
          </p>
        )}
      </div>
    </div>
  )
}
