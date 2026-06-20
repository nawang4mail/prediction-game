import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api.js'
import { entriesForGame } from '../services/entries.js'

const POLL_MS = 15000

const AVATAR_COLORS = [
  'bg-green-400', 'bg-blue-300', 'bg-pink-300', 'bg-purple-300',
  'bg-yellow-400', 'bg-orange-300', 'bg-teal-300', 'bg-indigo-300',
  'bg-cyan-300', 'bg-lime-300',
]

function initials(name) {
  return (name ?? '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
}

function avatarColor(name) {
  return AVATAR_COLORS[(name ?? '?').charCodeAt(0) % AVATAR_COLORS.length]
}

function Avatar({ name, size = 'md' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'
  return (
    <span className={`inline-flex items-center justify-center rounded-full font-bold text-gray-800 shrink-0 ${sz} ${avatarColor(name)}`}>
      {initials(name)}
    </span>
  )
}

function medal(rank) {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return null
}

function Skeleton() {
  return (
    <div className="space-y-1 p-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
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

  useEffect(() => {
    api.get('/games').then(({ data }) => {
      setGames(data)
      if (!searchParams.get('game') && data.length > 0) {
        setSearchParams({ game: data[0].id }, { replace: true })
      }
    }).catch(() => {}).finally(() => setGamesLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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

  const myEntries = selectedId ? entriesForGame(selectedId) : []
  const myNames = new Set(myEntries.map((e) => e.name?.toLowerCase()))
  const myRows = rows.filter((r) => myNames.has(r.display_name?.toLowerCase()))
  const bestMyRow = myRows.length
    ? myRows.reduce((best, r) => (r.rank < best.rank ? r : best), myRows[0])
    : null

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Hero */}
      <div
        className="relative overflow-hidden py-12 px-4"
        style={{ background: 'linear-gradient(135deg, #2b4dff 0%, #1a33cc 100%)' }}
      >
        {/* Decorative ellipse */}
        <div
          className="absolute pointer-events-none"
          style={{
            right: '-10%', top: '-50%',
            width: '50%', height: '200%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            transform: 'rotate(-15deg)',
          }}
        />

        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="font-oswald text-5xl sm:text-6xl font-bold text-white uppercase tracking-wider mb-6">
            Leaderboard
          </h1>

          {gamesLoading ? (
            <div className="h-14 w-72 mx-auto bg-white/20 rounded-xl animate-pulse" />
          ) : (
            <div className="inline-block bg-white rounded-xl shadow-md px-4 pt-2 pb-2.5 min-w-[280px] text-left">
              <label className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-0.5">
                Game
              </label>
              <div className="relative">
                <select
                  value={selectedId ?? ''}
                  onChange={(e) => setSearchParams({ game: e.target.value })}
                  className="appearance-none w-full bg-transparent text-gray-900 font-inter font-semibold text-sm pr-6 focus:outline-none cursor-pointer"
                >
                  {games.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} — {g.status.toUpperCase()}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main content card pulls up over hero */}
      <main className="-mt-8 relative z-20 pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[4rem_1px_1fr_auto] items-center bg-[#4b4b4b] text-white text-xs font-semibold uppercase tracking-wider">
              <div className="py-3 text-center">Rank</div>
              <div className="self-stretch bg-white/20" />
              <div className="py-3 pl-4">Name</div>
              <div className="py-3 pr-5 text-right">Points</div>
            </div>

            {/* Rows */}
            <div className="overflow-y-auto" style={{ maxHeight: '520px' }}>
              {lbLoading ? (
                <Skeleton />
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
                rows.map((row) => {
                  const isMe = bestMyRow && row.id === bestMyRow.id
                  const m = medal(row.rank)
                  return (
                    <div
                      key={row.id}
                      className={`grid grid-cols-[4rem_1px_1fr_auto] items-center border-b border-gray-100 last:border-0 transition-colors ${
                        isMe ? 'bg-orange-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Rank */}
                      <div className="py-3.5 flex items-center justify-center">
                        {m ? (
                          <span className="text-xl leading-none">{m}</span>
                        ) : (
                          <span className={`text-sm font-bold ${isMe ? 'text-orange-600' : 'text-gray-500'}`}>
                            {row.rank}
                          </span>
                        )}
                      </div>

                      {/* Vertical divider */}
                      <div className="self-stretch bg-gray-200" />

                      {/* Avatar + Name */}
                      <div className="py-3.5 pl-4 flex items-center gap-3">
                        <Avatar name={row.display_name} />
                        <span className={`font-inter font-semibold text-sm ${isMe ? 'text-orange-700' : 'text-gray-900'}`}>
                          {row.display_name}
                          {isMe && (
                            <span className="ml-2 text-xs text-orange-500 font-bold">YOU</span>
                          )}
                        </span>
                      </div>

                      {/* Points */}
                      <div className="py-3.5 pr-5 text-right">
                        <span className={`font-oswald text-lg font-bold ${isMe ? 'text-orange-600' : 'text-gray-800'}`}>
                          {row.total_points}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {rows.length > 0 && (
            <p className="text-center text-xs text-gray-400 mt-3">
              {rows.length} {rows.length === 1 ? 'entry' : 'entries'} · updates every 15s
            </p>
          )}
        </div>
      </main>

      {/* Sticky bottom bar for this device's best entry */}
      {bestMyRow && (
        <div
          className="fixed bottom-0 inset-x-0 z-30 flex items-center px-5 py-3.5 gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.18)]"
          style={{ backgroundColor: '#f05a00' }}
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/20 text-sm font-bold text-white shrink-0">
            {medal(bestMyRow.rank) ?? bestMyRow.rank}
          </span>
          <Avatar name={bestMyRow.display_name} size="sm" />
          <span className="flex-1 font-inter font-semibold text-white truncate text-sm">
            {bestMyRow.display_name}
            <span className="ml-2 text-orange-200 text-xs font-normal">(You)</span>
          </span>
          <span className="font-oswald text-xl font-bold text-white shrink-0">
            {bestMyRow.total_points} pts
          </span>
        </div>
      )}
    </div>
  )
}
