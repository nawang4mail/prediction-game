import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { entriesForGame, getEntries } from '../services/entries.js'

const TYPE_LABELS = { guess_winners: 'Guess Winners', bracket_prediction: 'Bracket' }
const STATUS_CONFIG = {
  open: { label: 'Open', cls: 'bg-green-100 text-green-800 border-green-200' },
  locked: { label: 'Locked', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  finished: { label: 'Finished', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}

function MyGamesSelector({ games, loading }) {
  const navigate = useNavigate()
  const myGames = games.filter((g) => entriesForGame(g.id).length > 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-oswald text-4xl sm:text-5xl font-bold text-white uppercase tracking-wider">
            My Predictions
          </h1>
          <p className="text-blue-200 text-sm mt-1">Games you have entered</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-36 bg-white rounded-2xl shadow-sm animate-pulse" />
            ))}
          </div>
        ) : myGames.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🎯</p>
            <p className="text-sm mb-4">You haven't joined any games yet.</p>
            <Link to="/games" className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
              Browse Games
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {myGames.map((game) => {
              const entries = entriesForGame(game.id)
              const cfg = STATUS_CONFIG[game.status] ?? STATUS_CONFIG.finished
              return (
                <div key={game.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-oswald text-lg font-semibold text-gray-900 leading-tight">{game.name}</h2>
                    <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      {TYPE_LABELS[game.type] ?? game.type}
                    </span>
                    <span className="text-xs text-gray-400">{entries.length} entr{entries.length !== 1 ? 'ies' : 'y'}</span>
                  </div>
                  <button
                    onClick={() => navigate(`/prediction?game=${game.id}`)}
                    className="mt-auto w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
                  >
                    View Predictions
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function PredictionPage() {
  const [searchParams] = useSearchParams()
  const gameId = searchParams.get('game') ? Number(searchParams.get('game')) : null
  const [games, setGames] = useState([])
  const [gamesLoading, setGamesLoading] = useState(true)
  const [game, setGame] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Find entry for this game on this device
  const myEntry = gameId ? entriesForGame(gameId)[0] : null

  // Load games list to find game type (needed before we have participant)
  useEffect(() => {
    setGamesLoading(true)
    api.get('/games').then(({ data }) => {
      setGames(data)
      if (gameId) setGame(data.find((g) => g.id === gameId) ?? null)
    }).catch(() => {}).finally(() => setGamesLoading(false))
  }, [gameId])

  const load = useCallback(async () => {
    if (!gameId || !myEntry) { setLoading(false); return }
    try {
      const { data } = await api.get('/participants/me', { params: { game_id: gameId } })
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
  }, [gameId, myEntry?.token]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  // No game selected — show list of games the user has entries in
  if (!gameId) {
    return <MyGamesSelector games={games} loading={gamesLoading} />
  }

  const gameName = game?.name ?? 'Game'
  const gameType = game?.type
  const gameStatus = game?.status

  const commonProps = { gameId, gameName, gameStatus, participant, onRefresh: load }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Link to="/prediction" className="inline-flex items-center gap-1.5 text-blue-200 hover:text-white text-sm mb-4 transition-colors">
            ← My Predictions
          </Link>
          <h1 className="font-oswald text-4xl sm:text-5xl font-bold text-white uppercase tracking-wider">
            My Prediction
          </h1>
          <p className="text-blue-200 text-sm mt-1">{gameName}</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-2xl shadow-sm animate-pulse" />
            ))}
          </div>
        ) : !myEntry ? (
          <NoEntry gameId={gameId} />
        ) : error ? (
          <div className="text-center py-12 text-red-500 text-sm">{error}</div>
        ) : participant?.participant?.status === 'declined' ? (
          <PendingBanner message={participant?.participant?.status_message} />
        ) : gameType === 'bracket_prediction' ? (
          <BracketPredictions {...commonProps} />
        ) : (
          <GuessWinnersPredictions {...commonProps} />
        )}
      </div>
    </div>
  )
}

function NoEntry({ gameId }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
      <p className="text-4xl mb-3">🎯</p>
      <h2 className="font-oswald text-xl font-bold text-gray-900 mb-2">You haven't joined this game yet</h2>
      <p className="text-gray-500 text-sm mb-6">Join to make predictions and appear on the leaderboard.</p>
      <Link
        to={`/games/${gameId}/join`}
        className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        Join This Game
      </Link>
    </div>
  )
}

function PendingBanner({ message }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
      <div className="flex gap-3">
        <span className="text-2xl shrink-0">⏳</span>
        <div>
          <h2 className="font-semibold text-yellow-900 mb-1">Entry Pending Approval</h2>
          <p className="text-yellow-800 text-sm">
            Your entry is waiting for the organizer to approve it. You'll be able to make predictions once approved.
          </p>
          {message && (
            <p className="mt-2 text-yellow-700 text-sm italic">"{message}"</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Guess Winners

function GuessWinnersPredictions({ gameId, gameStatus, participant }) {
  const matches = participant?.matches ?? []
  const predictions = participant?.predictions ?? {}
  const [local, setLocal] = useState(predictions)
  const [saving, setSaving] = useState({})
  const [finished, setFinished] = useState(participant?.participant?.finished ?? false)
  const isEditable = gameStatus === 'open' && !finished

  useEffect(() => { setLocal(participant?.predictions ?? {}) }, [participant])

  const pick = async (matchId, value) => {
    if (!isEditable) return
    const prev = local[matchId]
    setLocal((l) => ({ ...l, [matchId]: value }))
    setSaving((s) => ({ ...s, [matchId]: true }))
    try {
      await api.put('/participants/me/predictions', {
        match_id: matchId,
        prediction: value,
        game_id: gameId,
      })
    } catch {
      setLocal((l) => ({ ...l, [matchId]: prev }))
    } finally {
      setSaving((s) => ({ ...s, [matchId]: false }))
    }
  }

  const handleFinish = async () => {
    try {
      await api.post('/participants/me/finish', { game_id: gameId })
      setFinished(true)
    } catch (err) {
      alert(err.response?.data?.message ?? 'Could not finish entry.')
    }
  }

  const allPicked = matches.length > 0 && matches.every((m) => local[m.id])

  return (
    <div className="space-y-3">
      {finished && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-800 text-sm font-medium">
          ✅ Your entry is confirmed. Good luck!
        </div>
      )}
      {matches.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">No matches have been added yet.</p>
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
      {isEditable && allPicked && (
        <button
          onClick={handleFinish}
          className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors mt-4"
        >
          Confirm & Finish Entry
        </button>
      )}
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
    if (isSelected) return 'bg-blue-600 text-white shadow-sm'
    return 'bg-gray-50 hover:bg-blue-50 text-gray-700 border-gray-200 hover:border-blue-300'
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
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

// Bracket Prediction

function BracketPredictions({ gameId, gameStatus, participant }) {
  const stages = participant?.stages ?? []
  const [selections, setSelections] = useState({})
  const [saving, setSaving] = useState({})
  const [finished, setFinished] = useState(participant?.participant?.finished ?? false)
  const isEditable = gameStatus === 'open' && !finished

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
      const next = (() => {
        const current = selections[stageId] ?? []
        if (current.includes(teamId)) return current.filter((t) => t !== teamId)
        if (current.length < pickCount) return [...current, teamId]
        return [...current.slice(1), teamId]
      })()
      await api.put('/participants/me/bracket', {
        game_id: gameId,
        stage_id: stageId,
        team_ids: next,
      })
    } catch {}
    finally {
      setSaving((s) => ({ ...s, [stageId]: false }))
    }
  }

  const handleFinish = async () => {
    try {
      await api.post('/participants/me/finish', { game_id: gameId })
      setFinished(true)
    } catch (err) {
      alert(err.response?.data?.message ?? 'Could not finish entry.')
    }
  }

  const allComplete = stages.length > 0 && stages.every((stage) =>
    (selections[stage.id] ?? []).length === stage.pick_count
  )

  return (
    <div className="space-y-4">
      {finished && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-green-800 text-sm font-medium">
          ✅ Your bracket is confirmed. Good luck!
        </div>
      )}
      {stages.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">No stages have been added yet.</p>
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
      {isEditable && allComplete && (
        <button
          onClick={handleFinish}
          className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors mt-4"
        >
          Confirm & Finish Bracket
        </button>
      )}
    </div>
  )
}

function StageCard({ stage, selected, saving, editable, onToggle }) {
  const teams = stage.teams ?? []
  const pickedCount = selected.length

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
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
            cls += 'bg-blue-600 text-white border-blue-600 shadow-sm'
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
