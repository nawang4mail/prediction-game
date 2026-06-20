import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api.js'
import { entriesForGame } from '../services/entries.js'
import { TeamIcon, TeamName } from '../components/TeamLabel.jsx'

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

// ─── Inline picks panels ─────────────────────────────────────────────────────

function PlayerPicksPanel({ row, gameId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    setData(null)
    setLoading(true)
    setError(false)
    api.get(`/participants/${row.id}/picks`, { params: { game_id: gameId } })
      .then(({ data }) => setData(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [row.id, gameId])

  if (loading) {
    return (
      <div className="px-4 py-3 space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="px-4 py-4 text-center text-red-400 text-xs">Failed to load picks.</p>
  }

  if (data?.game?.type === 'bracket_prediction') {
    return <BracketPicksList stages={data.stages ?? []} />
  }

  return <GWPicksList matches={data?.matches ?? []} gameStatus={data?.game?.status} />
}

function GWPicksList({ matches, gameStatus }) {
  if (matches.length === 0) {
    return <p className="px-4 py-4 text-center text-gray-400 text-xs">No picks recorded yet.</p>
  }
  return (
    <div className="px-3 py-3 space-y-2">
      {matches.map((m) => {
        const picked = m.prediction
        const result = m.match_result
        const opts = [
          { value: 'team_a', label: m.team_a },
          { value: 'draw', label: 'DRAW' },
          { value: 'team_b', label: m.team_b },
        ]
        return (
          <div key={m.match_id} className="bg-gray-50 rounded-xl p-3">
            {m.match_label && (
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">
                {m.match_label}
              </p>
            )}
            <div className="grid grid-cols-3 gap-1.5">
              {opts.map(({ value, label }) => {
                const isPick = picked === value
                const isResult = result === value
                let cls = 'py-2 px-1 rounded-lg border text-xs font-semibold text-center '
                if (result) {
                  if (isResult && isPick)  cls += 'bg-green-500 text-white border-green-400'
                  else if (isResult)       cls += 'bg-green-100 text-green-800 border-green-200'
                  else if (isPick)         cls += 'bg-red-100 text-red-700 border-red-200'
                  else                     cls += 'bg-white text-gray-300 border-gray-100'
                } else if (isPick) {
                  cls += 'bg-[#2b4dff] text-white border-[#2b4dff]'
                } else {
                  cls += 'bg-white text-gray-400 border-gray-100'
                }
                return (
                  <div key={value} className={cls}>
                    <span className="inline-flex items-center justify-center gap-1">
                      {value !== 'draw' ? (
                        <>
                          <TeamIcon name={label} size="sm" />
                          <TeamName name={label} />
                        </>
                      ) : (
                        label
                      )}
                    </span>
                  </div>
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

// Shows only the player's own picks. Once results are in, a correct pick turns
// green with its +points shown *beside* (outside) the team, and a fully-correct
// stage shows its bonus next to the stage name — a simple, readable account of
// how the player scored. (US-111, US-112)
function BracketPicksList({ stages }) {
  if (!stages || stages.length === 0) {
    return <p className="px-4 py-4 text-center text-gray-400 text-xs">No picks recorded yet.</p>
  }
  const revealed = stages.some((s) => (s.teams ?? []).some((t) => t.is_winner))
  const total = revealed
    ? stages.reduce((sum, stage) => {
        const correct = (stage.teams ?? []).filter((t) => t.selected && t.is_winner)
        const allCorrect = correct.length === stage.pick_count
        return sum + correct.length * stage.points_per_correct + (allCorrect ? stage.all_correct_bonus : 0)
      }, 0)
    : 0

  return (
    <div className="px-3 py-3 space-y-2.5">
      {stages.map((stage) => {
        const picked = (stage.teams ?? []).filter((t) => t.selected)
        const hasResults = (stage.teams ?? []).some((t) => t.is_winner)
        const correct = picked.filter((t) => t.is_winner)
        const allCorrect = hasResults && correct.length === stage.pick_count
        return (
          <div key={stage.id} className="bg-gray-50 rounded-xl p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-oswald text-xs font-bold text-gray-700 uppercase truncate">{stage.name}</span>
                {allCorrect && stage.all_correct_bonus > 0 && (
                  <span className="shrink-0 text-[10px] bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full font-bold">
                    +{stage.all_correct_bonus} bonus
                  </span>
                )}
              </div>
              <span className="shrink-0 text-[10px] bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-full font-semibold">
                {picked.length}/{stage.pick_count}
              </span>
            </div>

            {picked.length === 0 ? (
              <p className="text-[10px] text-gray-400">No picks for this stage</p>
            ) : (
              <div className="flex flex-wrap gap-x-2.5 gap-y-1.5">
                {picked.map((team) => {
                  const correctPick = hasResults && team.is_winner
                  const wrongPick = hasResults && !team.is_winner
                  let chip = 'inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border '
                  if (correctPick) chip += 'bg-green-500 text-white border-green-400'
                  else if (wrongPick) chip += 'bg-red-100 text-red-700 border-red-200'
                  else chip += 'bg-[#2b4dff] text-white border-[#2b4dff]'
                  return (
                    <span key={team.id} className="inline-flex items-center gap-1">
                      <span className={chip}>
                        <TeamIcon name={team.name} size="sm" />
                        <TeamName name={team.name} />
                      </span>
                      {correctPick && (
                        <span className="text-green-600 text-xs font-bold">+{stage.points_per_correct}</span>
                      )}
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

      {revealed && (
        <div className="flex items-center justify-between bg-gray-800 text-white rounded-xl px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wide">Total</span>
          <span className="font-oswald text-lg font-bold">{total} pts</span>
        </div>
      )}
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
  const [openId, setOpenId] = useState(null)
  const prevDataRef = useRef('')

  const selectedId = searchParams.get('game') ? Number(searchParams.get('game')) : null

  useEffect(() => {
    api.get('/games')
      .then(({ data }) => setGames(data))
      .catch(() => {})
      .finally(() => setGamesLoading(false))
  }, [])

  // Default to the latest open game (games are newest-first); fall back to the
  // most recent game if none are open. Runs whenever there's no `?game=` param —
  // including when the logo clears it while we're already on this page — so the
  // logo never lands on an empty leaderboard.
  useEffect(() => {
    if (!searchParams.get('game') && games.length > 0) {
      const preferred = games.find((g) => g.status === 'open') ?? games[0]
      setSearchParams({ game: preferred.id }, { replace: true })
    }
  }, [games, searchParams, setSearchParams])

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
    setOpenId(null)
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

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id))

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
                  onChange={(e) => { setSearchParams({ game: e.target.value }); setOpenId(null) }}
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
            <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
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
                  const isOpen = openId === row.id
                  const m = medal(row.rank)
                  return (
                    <div
                      key={row.id}
                      className={`border-b border-gray-100 last:border-0 ${isOpen ? 'bg-blue-50' : isMe ? 'bg-orange-50' : ''}`}
                    >
                      {/* Clickable row header */}
                      <button
                        onClick={() => toggle(row.id)}
                        className={`w-full grid grid-cols-[4rem_1px_1fr_auto] items-center transition-colors text-left ${
                          isOpen ? 'hover:bg-blue-100' : isMe ? 'hover:bg-orange-100' : 'hover:bg-gray-50'
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
                        <div className="py-3.5 pr-4 flex items-center gap-2 justify-end">
                          <span className={`font-oswald text-lg font-bold ${isMe ? 'text-orange-600' : 'text-gray-800'}`}>
                            {row.total_points}
                          </span>
                          <svg
                            className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded picks */}
                      {isOpen && (
                        <div className="border-t border-blue-100">
                          <PlayerPicksPanel row={row} gameId={selectedId} />
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {rows.length > 0 && (
            <p className="text-center text-xs text-gray-400 mt-3">
              {rows.length} {rows.length === 1 ? 'entry' : 'entries'} · tap a player to see their picks · updates every 15s
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
    </div>
  )
}
