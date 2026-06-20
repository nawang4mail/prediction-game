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

// ─── Player Picks Modal ──────────────────────────────────────────────────────

function PlayerPicksModal({ row, gameId, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.get(`/participants/${row.id}/picks`, { params: { game_id: gameId } })
      .then(({ data }) => setData(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))

    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [row.id, gameId])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[88vh]">

        {/* Header */}
        <div
          className="relative px-6 pt-6 pb-5 shrink-0"
          style={{ background: 'linear-gradient(135deg, #2b4dff 0%, #1a33cc 100%)' }}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              right: '-5%', top: '-60%', width: '50%', height: '220%',
              borderRadius: '50%', background: 'rgba(255,255,255,0.06)', transform: 'rotate(-15deg)',
            }}
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative flex items-center gap-3">
            <Avatar name={row.display_name} />
            <div>
              <p className="text-blue-200 text-xs font-inter mb-0.5">
                {medal(row.rank) ?? `#${row.rank}`} · {row.total_points} pts
              </p>
              <h2 className="font-oswald text-xl font-bold text-white uppercase tracking-wide leading-tight">
                {row.display_name}
              </h2>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading && (
            <div className="space-y-3 pt-1">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}
          {error && (
            <p className="text-center text-red-500 text-sm py-10">Failed to load picks.</p>
          )}
          {data && data.game?.type === 'guess_winners' && (
            <GWPicksList matches={data.matches ?? []} gameStatus={data.game?.status} />
          )}
          {data && data.game?.type === 'bracket_prediction' && (
            <BracketPicksList stages={data.stages ?? []} gameStatus={data.game?.status} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function GWPicksList({ matches, gameStatus }) {
  if (matches.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-8">No picks recorded yet.</p>
  }
  return (
    <div className="space-y-2.5">
      {matches.map((m) => {
        const picked = m.prediction
        const result = m.match_result
        const opts = [
          { value: 'team_a', label: m.team_a },
          { value: 'draw', label: 'DRAW' },
          { value: 'team_b', label: m.team_b },
        ]
        return (
          <div key={m.match_id} className="bg-gray-50 rounded-xl p-3.5">
            {m.match_label && (
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">
                {m.match_label}
              </p>
            )}
            <div className="grid grid-cols-3 gap-1.5">
              {opts.map(({ value, label }) => {
                const isPick = picked === value
                const isResult = result === value
                let cls = 'py-2.5 px-1 rounded-lg border text-xs font-semibold text-center transition-all '
                if (result) {
                  if (isResult && isPick) cls += 'bg-green-500 text-white border-green-400'
                  else if (isResult) cls += 'bg-green-100 text-green-800 border-green-200'
                  else if (isPick) cls += 'bg-red-100 text-red-700 border-red-200'
                  else cls += 'bg-white text-gray-300 border-gray-100'
                } else if (isPick) {
                  cls += 'bg-[#2b4dff] text-white border-[#2b4dff]'
                } else {
                  cls += 'bg-white text-gray-400 border-gray-100'
                }
                return (
                  <div key={value} className={cls}>{label}</div>
                )
              })}
            </div>
            {!picked && (
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">No pick</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

function BracketPicksList({ stages, gameStatus }) {
  if (stages.length === 0) {
    return <p className="text-center text-gray-400 text-sm py-8">No picks recorded yet.</p>
  }
  return (
    <div className="space-y-3">
      {stages.map((stage) => {
        const pickedTeams = stage.teams.filter((t) => t.selected)
        const hasResults = stage.teams.some((t) => t.is_winner)
        return (
          <div key={stage.id} className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-oswald text-sm font-bold text-gray-900">{stage.name}</h3>
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-semibold">
                {pickedTeams.length}/{stage.pick_count}
              </span>
            </div>
            {stage.description && (
              <p className="text-xs text-gray-400 mb-2">{stage.description}</p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {stage.teams.map((team) => {
                const isPick = team.selected
                const isWinner = team.is_winner
                let cls = 'px-3 py-1.5 rounded-lg text-xs font-medium border '
                if (hasResults) {
                  if (isWinner && isPick) cls += 'bg-green-500 text-white border-green-400'
                  else if (isWinner) cls += 'bg-green-100 text-green-800 border-green-200'
                  else if (isPick) cls += 'bg-red-100 text-red-700 border-red-200'
                  else cls += 'bg-white text-gray-300 border-gray-100'
                } else if (isPick) {
                  cls += 'bg-[#2b4dff] text-white border-[#2b4dff]'
                } else {
                  cls += 'bg-white text-gray-300 border-gray-100'
                }
                return (
                  <span key={team.id} className={cls}>{team.name}</span>
                )
              })}
            </div>
            {pickedTeams.length === 0 && (
              <p className="text-xs text-gray-400 mt-2">No picks for this stage</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Leaderboard Page ────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [games, setGames] = useState([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [lbLoading, setLbLoading] = useState(true)
  const [lbError, setLbError] = useState(false)
  const [selectedRow, setSelectedRow] = useState(null)
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
        <div
          className="absolute pointer-events-none"
          style={{
            right: '-10%', top: '-50%', width: '50%', height: '200%',
            borderRadius: '50%', background: 'rgba(255,255,255,0.05)', transform: 'rotate(-15deg)',
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
                  onChange={(e) => { setSearchParams({ game: e.target.value }); setSelectedRow(null) }}
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

      {/* Main content */}
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
                  <button onClick={loadLeaderboard} className="mt-2 text-blue-600 text-sm underline">Retry</button>
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
                      onClick={() => setSelectedRow(row)}
                      className={`grid grid-cols-[4rem_1px_1fr_auto] items-center border-b border-gray-100 last:border-0 transition-colors cursor-pointer ${
                        isMe ? 'bg-orange-50 hover:bg-orange-100' : 'hover:bg-blue-50'
                      }`}
                    >
                      <div className="py-3.5 flex items-center justify-center">
                        {m ? (
                          <span className="text-xl leading-none">{m}</span>
                        ) : (
                          <span className={`text-sm font-bold ${isMe ? 'text-orange-600' : 'text-gray-500'}`}>
                            {row.rank}
                          </span>
                        )}
                      </div>
                      <div className="self-stretch bg-gray-200" />
                      <div className="py-3.5 pl-4 flex items-center gap-3">
                        <Avatar name={row.display_name} />
                        <span className={`font-inter font-semibold text-sm ${isMe ? 'text-orange-700' : 'text-gray-900'}`}>
                          {row.display_name}
                          {isMe && <span className="ml-2 text-xs text-orange-500 font-bold">YOU</span>}
                        </span>
                      </div>
                      <div className="py-3.5 pr-5 text-right flex items-center gap-2 justify-end">
                        <span className={`font-oswald text-lg font-bold ${isMe ? 'text-orange-600' : 'text-gray-800'}`}>
                          {row.total_points}
                        </span>
                        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {rows.length > 0 && (
            <p className="text-center text-xs text-gray-400 mt-3">
              {rows.length} {rows.length === 1 ? 'entry' : 'entries'} · tap a player to view their picks · updates every 15s
            </p>
          )}
        </div>
      </main>

      {/* Sticky bottom bar */}
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

      {/* Player picks modal */}
      {selectedRow && selectedId && (
        <PlayerPicksModal
          row={selectedRow}
          gameId={selectedId}
          onClose={() => setSelectedRow(null)}
        />
      )}
    </div>
  )
}
