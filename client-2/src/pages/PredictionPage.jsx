import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../services/api.js'
import { entriesForGame, getEntries } from '../services/entries.js'
import { useEntryStatus } from '../context/EntryContext.jsx'

const TYPE_LABELS = { guess_winners: 'Guess Winners', bracket_prediction: 'Bracket' }
const STATUS_CONFIG = {
  open: { label: 'Open', cls: 'bg-green-100 text-green-800 border-green-200' },
  locked: { label: 'Locked', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  finished: { label: 'Finished', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}
const TYPE_FILTERS = ['All', 'Guess Winners', 'Bracket']

// ─── Accordion list (no ?game= param) ───────────────────────────────────────

function MyGamesSelector({ games, loading }) {
  const myGames = games.filter((g) => entriesForGame(g.id).length > 0)
  const [typeFilter, setTypeFilter] = useState('All')
  const [openId, setOpenId] = useState(null)

  const filtered = myGames.filter((g) => {
    if (typeFilter === 'Guess Winners') return g.type === 'guess_winners'
    if (typeFilter === 'Bracket') return g.type === 'bracket_prediction'
    return true
  })

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
            right: '-10%', top: '-50%',
            width: '50%', height: '200%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            transform: 'rotate(-15deg)',
          }}
        />
        <div className="relative max-w-7xl mx-auto">
          <h1 className="font-oswald text-5xl sm:text-6xl font-bold text-white uppercase tracking-wider">
            My Game
          </h1>
          <p className="text-blue-200 text-sm mt-1 font-inter">Games you have entered</p>
        </div>
      </div>

      {/* Content card pulls up over hero */}
      <main className="-mt-8 relative z-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 border-b border-gray-100 last:border-0 animate-pulse bg-gray-50" />
              ))}
            </div>
          ) : myGames.length === 0 ? (
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-16 text-center">
              <p className="text-4xl mb-3">🎯</p>
              <p className="text-sm text-gray-400 mb-4">You haven't joined any games yet.</p>
              <Link
                to="/leagues"
                className="inline-block px-5 py-2.5 bg-[#2b4dff] hover:bg-[#1a33cc] text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Browse Games
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
              {/* Type filter */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <label className="text-xs text-gray-500 font-semibold uppercase tracking-wider shrink-0">
                  Type
                </label>
                <div className="relative">
                  <select
                    value={typeFilter}
                    onChange={(e) => { setTypeFilter(e.target.value); setOpenId(null) }}
                    className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm font-semibold rounded-lg pl-3 pr-7 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#2b4dff]/30 cursor-pointer"
                  >
                    {TYPE_FILTERS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
                </div>
                <span className="ml-auto text-xs text-gray-400">{filtered.length} game{filtered.length !== 1 ? 's' : ''}</span>
              </div>

              {/* Accordion rows */}
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-sm">No games match this filter.</div>
              ) : (
                filtered.map((game) => (
                  <AccordionRow
                    key={game.id}
                    game={game}
                    isOpen={openId === game.id}
                    onToggle={() => toggle(game.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function AccordionRow({ game, isOpen, onToggle }) {
  const cfg = STATUS_CONFIG[game.status] ?? STATUS_CONFIG.finished
  const entries = entriesForGame(game.id)
  const [selectedToken, setSelectedToken] = useState(entries[0]?.token ?? null)
  const [participant, setParticipant] = useState(null)
  const [loadState, setLoadState] = useState('idle') // idle | loading | done | error
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!isOpen) return
    if (!selectedToken) { setLoadState('done'); return }
    setLoadState('loading')
    setParticipant(null)
    api.get('/participants/me', {
      params: { game_id: game.id },
      headers: { 'x-entry-token': selectedToken },
    })
      .then(({ data }) => { setParticipant(data); setLoadState('done') })
      .catch((err) => {
        if (err.response?.status === 404 || err.response?.status === 401) setParticipant(null)
        setLoadState('error')
      })
  }, [isOpen, selectedToken, reloadKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = () => setReloadKey((k) => k + 1)

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* Row header — clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <span className="font-oswald text-base font-semibold text-gray-900 truncate block">{game.name}</span>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {TYPE_LABELS[game.type] ?? game.type}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.cls}`}>
              {cfg.label}
            </span>
            <span className="text-xs text-gray-400">{entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}</span>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded content */}
      {isOpen && (
        <div className="px-4 pb-5 pt-1 bg-gray-50 border-t border-gray-100">
          {/* Entry selector — only when this device has more than one entry */}
          {entries.length > 1 && (
            <div className="pt-3 pb-1">
              <label className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">
                Viewing Entry
              </label>
              <div className="relative">
                <select
                  value={selectedToken ?? ''}
                  onChange={(e) => setSelectedToken(e.target.value)}
                  className="appearance-none w-full bg-white border border-gray-200 text-gray-800 text-sm font-semibold rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-[#2b4dff]/30 cursor-pointer"
                >
                  {entries.map((en) => (
                    <option key={en.token} value={en.token}>
                      {en.name}{en.status === 'declined' ? ' (pending)' : ''}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
              </div>
            </div>
          )}

          {loadState === 'loading' && (
            <div className="space-y-2 pt-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
              ))}
            </div>
          )}
          {loadState === 'error' && !participant && (
            <div className="py-6 text-center text-red-500 text-sm">
              Failed to load predictions.{' '}
              <button onClick={refresh} className="underline text-blue-600">Retry</button>
            </div>
          )}
          {loadState === 'done' && !selectedToken && (
            <NoEntry gameId={game.id} />
          )}
          {loadState === 'done' && selectedToken && (
            <>
              {participant?.participant?.status === 'declined' && (
                <PendingNotice message={participant?.participant?.status_message} />
              )}
              {game.type === 'bracket_prediction'
                ? <BracketPredictions gameId={game.id} gameStatus={game.status} participant={participant} entryToken={selectedToken} onRefresh={refresh} />
                : <GuessWinnersPredictions gameId={game.id} gameStatus={game.status} participant={participant} entryToken={selectedToken} onRefresh={refresh} />
              }
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Detail view (direct URL: /my-game?game=<id>) ────────────────────────────

export default function PredictionPage() {
  const [searchParams] = useSearchParams()
  const gameId = searchParams.get('game') ? Number(searchParams.get('game')) : null
  const [games, setGames] = useState([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [game, setGame] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Subscribing to the entry context makes this page re-render after stale
  // entries (deleted by an admin) are pruned; refresh() reconciles on mount.
  const { refresh: refreshEntries } = useEntryStatus()
  useEffect(() => { refreshEntries() }, [refreshEntries])

  const entries = gameId ? entriesForGame(gameId) : []
  const [selectedToken, setSelectedToken] = useState(entries[0]?.token ?? null)

  useEffect(() => {
    setGamesLoading(true)
    api.get('/games').then(({ data }) => {
      setGames(data)
      if (gameId) setGame(data.find((g) => g.id === gameId) ?? null)
    }).catch(() => {}).finally(() => setGamesLoading(false))
  }, [gameId])

  const load = useCallback(async () => {
    if (!gameId || !selectedToken) { setLoading(false); return }
    setLoading(true)
    try {
      const { data } = await api.get('/participants/me', {
        params: { game_id: gameId },
        headers: { 'x-entry-token': selectedToken },
      })
      setParticipant(data)
      setError(null)
    } catch (err) {
      if (err.response?.status === 404 || err.response?.status === 401) {
        setParticipant(null)
      } else {
        setError('Failed to load your predictions.')
      }
    } finally {
      setLoading(false)
    }
  }, [gameId, selectedToken]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  if (!gameId) {
    return <MyGamesSelector games={games} loading={gamesLoading} />
  }

  const gameName = game?.name ?? 'Game'
  const gameType = game?.type
  const gameStatus = game?.status
  const commonProps = { gameId, gameName, gameStatus, participant, entryToken: selectedToken, onRefresh: load }

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
            right: '-10%', top: '-50%',
            width: '50%', height: '200%',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            transform: 'rotate(-15deg)',
          }}
        />
        <div className="relative max-w-7xl mx-auto">
          <Link to="/my-game" className="inline-flex items-center gap-1.5 text-blue-200 hover:text-white text-sm mb-4 transition-colors">
            ← My Game
          </Link>
          <h1 className="font-oswald text-5xl sm:text-6xl font-bold text-white uppercase tracking-wider">
            My Prediction
          </h1>
          <p className="text-blue-200 text-sm mt-1 font-inter">{gameName}</p>
        </div>
      </div>

      <main className="-mt-8 relative z-20 pb-12 px-4">
        <div className="max-w-7xl mx-auto">
          {loading ? (
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : !selectedToken ? (
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6">
              <NoEntry gameId={gameId} />
            </div>
          ) : error ? (
            <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-6 text-center py-12 text-red-500 text-sm">{error}</div>
          ) : (
            <>
              {entries.length > 1 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 mb-3">
                  <label className="block text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">
                    Viewing Entry
                  </label>
                  <div className="relative">
                    <select
                      value={selectedToken ?? ''}
                      onChange={(e) => setSelectedToken(e.target.value)}
                      className="appearance-none w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm font-semibold rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-[#2b4dff]/30 cursor-pointer"
                    >
                      {entries.map((en) => (
                        <option key={en.token} value={en.token}>
                          {en.name}{en.status === 'declined' ? ' (pending)' : ''}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▾</span>
                  </div>
                </div>
              )}
              {participant?.participant?.status === 'declined' && (
                <PendingNotice message={participant?.participant?.status_message} />
              )}
              {gameType === 'bracket_prediction'
                ? <BracketPredictions {...commonProps} />
                : <GuessWinnersPredictions {...commonProps} />
              }
            </>
          )}
        </div>
      </main>
    </div>
  )
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function NoEntry({ gameId }) {
  return (
    <div className="py-8 text-center">
      <p className="text-4xl mb-3">🎯</p>
      <h2 className="font-oswald text-xl font-bold text-gray-900 mb-2">You haven't joined this game yet</h2>
      <p className="text-gray-500 text-sm mb-6">Join to make predictions and appear on the leaderboard.</p>
      <Link
        to={`/leagues/${gameId}/join`}
        className="inline-block px-6 py-3 bg-[#2b4dff] hover:bg-[#1a33cc] text-white text-sm font-semibold rounded-xl transition-colors"
      >
        Join This Game
      </Link>
    </div>
  )
}

function PendingNotice({ message }) {
  return (
    <div className="flex items-start gap-2.5 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 mb-3">
      <span className="text-base shrink-0 mt-0.5">⏳</span>
      <div>
        <p className="text-yellow-900 text-xs font-semibold">Pending approval</p>
        <p className="text-yellow-800 text-xs mt-0.5 leading-relaxed">
          Your picks are saved and will count once the organizer approves your entry.
          {message && <span className="block italic mt-0.5">"{message}"</span>}
        </p>
      </div>
    </div>
  )
}

// ─── Guess Winners ───────────────────────────────────────────────────────────

function GuessWinnersPredictions({ gameId, gameStatus, participant, entryToken }) {
  const matches = participant?.matches ?? []
  const predictions = participant?.predictions ?? {}
  const [local, setLocal] = useState(predictions)
  const [saving, setSaving] = useState({})
  const [editMode, setEditMode] = useState(false)
  const canEdit = gameStatus === 'open'        // editing is allowed at all
  const isEditable = canEdit && editMode       // editing is currently on
  const authCfg = entryToken ? { headers: { 'x-entry-token': entryToken } } : undefined

  useEffect(() => { setLocal(participant?.predictions ?? {}) }, [participant])

  const pick = async (matchId, value) => {
    if (!isEditable) return
    const prev = local[matchId]
    setLocal((l) => ({ ...l, [matchId]: value }))
    setSaving((s) => ({ ...s, [matchId]: true }))
    try {
      await api.put('/participants/me/predictions', { match_id: matchId, prediction: value, game_id: gameId }, authCfg)
    } catch {
      setLocal((l) => ({ ...l, [matchId]: prev }))
    } finally {
      setSaving((s) => ({ ...s, [matchId]: false }))
    }
  }

  return (
    <div className="space-y-3 pt-2">
      {canEdit && (
        <EditToggle editMode={editMode} onToggle={() => setEditMode((v) => !v)} />
      )}
      {matches.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-6">No matches have been added yet.</p>
      ) : (
        matches.map((match) => (
          <MatchCard
            key={match.id}
            match={match}
            selected={local[match.id]}
            saving={saving[match.id]}
            editable={isEditable}
            onPick={(v) => pick(match.id, v)}
            result={match.result}
          />
        ))
      )}
    </div>
  )
}

// Read-only by default; the player must press Edit to change picks, which turns
// the button into "Confirm Changes". Picks save as they are made. (US-104)
function EditToggle({ editMode, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-200 px-4 py-2.5 shadow-sm">
      <span className="text-xs text-gray-500">
        {editMode ? 'Editing — tap options to change' : 'Your picks are locked'}
      </span>
      <button
        onClick={onToggle}
        className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors shrink-0 ${
          editMode ? 'bg-green-600 hover:bg-green-700' : 'bg-[#f05a00] hover:bg-orange-600'
        }`}
      >
        {editMode ? '✓ Confirm Changes' : '✎ Edit Entry'}
      </button>
    </div>
  )
}

function MatchCard({ match, selected, saving, editable, onPick, result }) {
  const opts = [
    { value: 'team_a', label: match.team_a },
    { value: 'draw', label: 'DRAW' },
    { value: 'team_b', label: match.team_b },
  ]

  const btnCls = (value) => {
    const isSelected = selected === value
    const isResult = result === value
    const isWrong = result && selected === value && result !== value
    if (result) {
      if (isResult && isSelected) return 'bg-green-500 text-white ring-2 ring-green-400'
      if (isResult && !isSelected) return 'bg-green-100 text-green-800 border-green-200'
      if (isWrong) return 'bg-red-100 text-red-700 border-red-200'
      return 'bg-gray-50 text-gray-400 border-gray-100'
    }
    if (isSelected) return 'bg-[#2b4dff] text-white shadow-sm'
    return 'bg-white hover:bg-blue-50 text-gray-700 border-gray-200 hover:border-[#2b4dff]/40'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4">
      {(match.label || match.match_date) && (
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">
          {match.label}{match.label && match.match_date ? ' · ' : ''}{match.match_date ? new Date(match.match_date).toLocaleDateString() : ''}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {opts.map(({ value, label }) => (
          <button
            key={value}
            disabled={!editable || saving}
            onClick={() => onPick(value)}
            className={`py-3 px-2 rounded-xl border text-sm font-semibold transition-all ${btnCls(value)} disabled:cursor-not-allowed`}
          >
            {saving && selected === value ? '…' : label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Bracket Prediction ──────────────────────────────────────────────────────

function BracketPredictions({ gameId, gameStatus, participant, entryToken }) {
  const stages = participant?.stages ?? []
  const [selections, setSelections] = useState({})
  const [saving, setSaving] = useState({})
  const [editMode, setEditMode] = useState(false)
  const canEdit = gameStatus === 'open'
  const isEditable = canEdit && editMode
  const authCfg = entryToken ? { headers: { 'x-entry-token': entryToken } } : undefined

  useEffect(() => {
    const init = {}
    ;(participant?.stages ?? []).forEach((stage) => {
      init[stage.id] = (stage.selections ?? []).map((s) => s.stage_team_id)
    })
    setSelections(init)
  }, [participant])

  const toggleTeam = async (stageId, teamId, pickCount) => {
    if (!isEditable) return
    setSelections((prev) => {
      const current = prev[stageId] ?? []
      let next
      if (current.includes(teamId)) {
        next = current.filter((t) => t !== teamId)
      } else if (current.length < pickCount) {
        next = [...current, teamId]
      } else {
        next = [...current.slice(1), teamId]
      }
      return { ...prev, [stageId]: next }
    })
    setSaving((s) => ({ ...s, [stageId]: true }))
    try {
      const current = selections[stageId] ?? []
      const next = current.includes(teamId)
        ? current.filter((t) => t !== teamId)
        : current.length < pickCount ? [...current, teamId] : [...current.slice(1), teamId]
      await api.put('/participants/me/bracket', { game_id: gameId, stage_id: stageId, team_ids: next }, authCfg)
    } catch {}
    finally { setSaving((s) => ({ ...s, [stageId]: false })) }
  }

  return (
    <div className="space-y-4 pt-2">
      {canEdit && (
        <EditToggle editMode={editMode} onToggle={() => setEditMode((v) => !v)} />
      )}
      {stages.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-6">No stages have been added yet.</p>
      ) : (
        stages.map((stage) => (
          <StageCard
            key={stage.id}
            stage={stage}
            selected={selections[stage.id] ?? []}
            saving={saving[stage.id]}
            editable={isEditable}
            onToggle={(teamId) => toggleTeam(stage.id, teamId, stage.pick_count)}
          />
        ))
      )}
    </div>
  )
}

function StageCard({ stage, selected, saving, editable, onToggle }) {
  const teams = stage.teams ?? []
  const pickedCount = selected.length

  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-oswald text-lg font-bold text-gray-900">{stage.name}</h3>
        <span className="shrink-0 text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-semibold">
          {pickedCount}/{stage.pick_count} picked
        </span>
      </div>
      {stage.description && (
        <p className="text-xs text-gray-400 mb-3">{stage.description}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
        {teams.map((team) => {
          const isPicked = selected.includes(team.id)
          const isWinner = team.is_winner
          const hasResults = teams.some((t) => t.is_winner)
          let cls = 'border rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left '
          if (hasResults) {
            if (isWinner && isPicked) cls += 'bg-green-500 text-white border-green-400'
            else if (isWinner) cls += 'bg-green-100 text-green-800 border-green-200'
            else if (isPicked) cls += 'bg-red-100 text-red-700 border-red-200'
            else cls += 'bg-gray-50 text-gray-400 border-gray-100'
          } else if (isPicked) {
            cls += 'bg-[#2b4dff] text-white border-[#2b4dff] shadow-sm'
          } else {
            cls += 'bg-gray-50 hover:bg-blue-50 text-gray-700 border-gray-200 hover:border-blue-300'
          }
          return (
            <button
              key={team.id}
              disabled={!editable || saving}
              onClick={() => onToggle(team.id)}
              className={cls + ' disabled:cursor-not-allowed'}
            >
              {team.name}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 mt-3">
        {stage.points_per_correct} pt{stage.points_per_correct !== 1 ? 's' : ''} per correct pick
        {stage.all_correct_bonus > 0 && ` · +${stage.all_correct_bonus} bonus if all correct`}
      </p>
    </div>
  )
}
