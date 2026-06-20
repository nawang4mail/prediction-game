import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom'
import api from '../services/api.js'
import { upsertEntry } from '../services/entries.js'
import { useEntryStatus } from '../context/EntryContext.jsx'
import { availabilityByStage, pruneSelections } from '../services/bracket.js'
import { TeamIcon } from '../components/TeamLabel.jsx'

// The player has already entered their name/phone on the Join page. Here they
// make their picks and submit. Nothing is written to the database until they
// press Submit — Cancel or closing the app leaves no entry behind (US-99).
export default function PlayPage() {
  const { id } = useParams()
  const gameId = Number(id)
  const navigate = useNavigate()
  const location = useLocation()
  const { reload } = useEntryStatus()

  const identity = location.state // { display_name, phone }

  const [game, setGame] = useState(null)
  const [matches, setMatches] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Local-only pick state — never sent until Submit.
  const [predictions, setPredictions] = useState({}) // { matchId: 'team_a'|'draw'|'team_b' }
  const [selections, setSelections] = useState({})    // { stageId: [teamId, ...] }
  const [step, setStep] = useState(0)                 // bracket wizard: current stage index

  // No identity in router state means the player landed here directly (e.g. a
  // refresh wiped it) — send them back to the name form.
  useEffect(() => {
    if (!identity) navigate(`/leagues/${id}/join`, { replace: true })
  }, [identity, id, navigate])

  useEffect(() => {
    if (!identity) return
    let cancelled = false
    async function load() {
      try {
        const { data: games } = await api.get('/games')
        const g = games.find((x) => x.id === gameId)
        if (!g) { setError('Game not found.'); setLoading(false); return }
        if (g.status !== 'open') { setError('This game is no longer open for joining.'); setLoading(false); return }
        if (cancelled) return
        setGame(g)

        if (g.type === 'bracket_prediction') {
          const { data } = await api.get('/bracket', { params: { game_id: gameId } })
          if (!cancelled) setStages(data)
        } else {
          const { data } = await api.get('/matches', { params: { game_id: gameId } })
          if (!cancelled) setMatches(data)
        }
      } catch {
        if (!cancelled) setError('Failed to load the game. Please try again.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [identity, gameId])

  const isBracket = game?.type === 'bracket_prediction'

  // Combined stages only offer the teams the player advanced from their parents.
  const availability = useMemo(() => availabilityByStage(stages, selections), [stages, selections])

  const pickMatch = (matchId, value) =>
    setPredictions((p) => ({ ...p, [matchId]: value }))

  const toggleTeam = (stageId, teamId, pickCount) =>
    setSelections((prev) => {
      const current = prev[stageId] ?? []
      let next
      if (current.includes(teamId)) next = current.filter((t) => t !== teamId)
      else if (current.length < pickCount) next = [...current, teamId]
      else next = [...current.slice(1), teamId]
      return { ...prev, [stageId]: next }
    })

  // A stage is done when its count of *valid* picks (a pick can fall out of a
  // combined stage's pool when its parent picks change) equals its pick_count.
  const stageComplete = (stage) =>
    (selections[stage.id] ?? []).filter((id) => availability[stage.id]?.has(id)).length === stage.pick_count

  const complete = useMemo(() => {
    if (isBracket) {
      return stages.length > 0 && stages.every(
        (s) => (selections[s.id] ?? []).filter((id) => availability[s.id]?.has(id)).length === s.pick_count
      )
    }
    return matches.length > 0 && matches.every((m) => predictions[m.id])
  }, [isBracket, stages, selections, matches, predictions, availability])

  const handleSubmit = async () => {
    if (!complete || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        game_id: gameId,
        display_name: identity.display_name,
        phone: identity.phone,
      }
      if (isBracket) payload.bracket = pruneSelections(stages, selections)
      else payload.predictions = predictions

      const { data } = await api.post('/participants/complete', payload)
      upsertEntry({
        token: data.entry_token,
        name: data.participant?.display_name ?? identity.display_name,
        game_id: gameId,
        is_self: identity.is_self ?? true,
        status: data.participant?.status ?? 'declined',
      })
      reload()
      // Confirm the entry, then send the player to the leaderboard.
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.message ?? 'Could not submit your entry. Please try again.')
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    // Nothing was saved — just leave.
    navigate('/leagues')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Hero */}
      <div
        className="relative overflow-hidden py-10 px-4"
        style={{ background: 'linear-gradient(135deg, #2b4dff 0%, #1a33cc 100%)' }}
      >
        <div
          className="absolute pointer-events-none"
          style={{
            right: '-10%', top: '-50%', width: '50%', height: '200%',
            borderRadius: '50%', background: 'rgba(255,255,255,0.05)', transform: 'rotate(-15deg)',
          }}
        />
        <div className="relative max-w-3xl mx-auto">
          <Link to={`/leagues/${id}/join`} className="inline-flex items-center gap-1.5 text-blue-200 hover:text-white text-sm mb-3 transition-colors">
            ← Back
          </Link>
          <h1 className="font-oswald text-4xl sm:text-5xl font-bold text-white uppercase tracking-wider">
            Make Your Picks
          </h1>
          {game && <p className="text-blue-200 text-sm mt-1 font-inter">{game.name}{identity ? ` · ${identity.display_name}` : ''}</p>}
        </div>
      </div>

      <main className="-mt-6 relative z-20 pb-32 px-4">
        <div className="max-w-3xl mx-auto">
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-white rounded-2xl shadow-sm animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl shadow-md p-8 text-center">
              <p className="text-red-500 text-sm mb-4">{error}</p>
              <Link to="/leagues" className="inline-block px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
                Back to Leagues
              </Link>
            </div>
          ) : isBracket ? (
            stages.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">This game has no stages yet.</p>
            ) : (
              <BracketWizard
                stages={stages}
                step={Math.min(step, stages.length - 1)}
                onStep={setStep}
                selections={selections}
                availability={availability}
                stageComplete={stageComplete}
                onToggle={toggleTeam}
              />
            )
          ) : (
            <div className="space-y-3">
              {matches.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">This game has no matches yet.</p>
              ) : (
                matches.map((match) => (
                  <MatchPick
                    key={match.id}
                    match={match}
                    selected={predictions[match.id]}
                    onPick={(v) => pickMatch(match.id, v)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>

      {/* Sticky action bar: Submit + Cancel */}
      {!loading && !error && (
        <div className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 shadow-[0_-4px_16px_rgba(0,0,0,0.08)]">
          <div className="max-w-3xl mx-auto px-4 py-3">
            {!complete && (
              <p className="text-xs text-gray-400 text-center mb-2">
                {isBracket ? 'Complete every stage to submit.' : 'Pick every match to submit.'}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={!complete || submitting}
                className={`flex-1 py-3 px-4 rounded-xl text-white text-sm font-semibold transition-colors ${
                  complete && !submitting
                    ? 'bg-[#2b4dff] hover:bg-[#1a33cc] cursor-pointer'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {submitting ? 'Submitting…' : 'Submit Entry'}
              </button>
              <button
                onClick={handleCancel}
                disabled={submitting}
                className="py-3 px-6 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Submission confirmation → leaderboard */}
      {submitted && (
        <EntrySubmittedModal
          gameName={game?.name}
          playerName={identity?.display_name}
          onGo={() => navigate(`/leaderboard?game=${gameId}`, { replace: true })}
        />
      )}
    </div>
  )
}

// Confirms the entry was saved, then sends the player to the leaderboard
// (auto-redirect after a short pause, or immediately via the button). (US-104)
function EntrySubmittedModal({ gameName, playerName, onGo }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const t = setTimeout(onGo, 3000)
    return () => { document.body.style.overflow = ''; clearTimeout(t) }
  }, [onGo])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-7 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-9 h-9 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-oswald text-2xl font-bold text-gray-900 uppercase tracking-wide mb-2">Entry Submitted!</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-1">
          {playerName ? <span className="font-semibold">{playerName}</span> : 'Your'} picks{gameName ? ` for ${gameName}` : ''} are in.
        </p>
        <p className="text-xs text-gray-400 mb-6">They'll count once the organizer approves your entry.</p>
        <button
          onClick={onGo}
          className="w-full py-3 rounded-xl bg-[#2b4dff] hover:bg-[#1a33cc] text-white text-sm font-semibold transition-colors"
        >
          View Leaderboard →
        </button>
        <p className="text-[11px] text-gray-400 mt-3">Taking you to the leaderboard…</p>
      </div>
    </div>
  )
}

function MatchPick({ match, selected, onPick }) {
  const opts = [
    { value: 'team_a', label: match.team_a },
    { value: 'draw', label: 'DRAW' },
    { value: 'team_b', label: match.team_b },
  ]
  return (
    <div className="bg-white rounded-2xl shadow-sm p-4">
      {match.match_label && (
        <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">{match.match_label}</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {opts.map(({ value, label }) => {
          const isSel = selected === value
          return (
            <button
              key={value}
              onClick={() => onPick(value)}
              className={`py-3 px-2 rounded-xl border text-sm font-semibold transition-all ${
                isSel
                  ? 'bg-[#2b4dff] text-white border-[#2b4dff] shadow-sm'
                  : 'bg-gray-50 hover:bg-blue-50 text-gray-700 border-gray-200 hover:border-[#2b4dff]/40'
              }`}
            >
              <span className="inline-flex items-center justify-center gap-1">
                {value !== 'draw' && <TeamIcon name={label} className="w-4 h-3" />}
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// One-stage-at-a-time bracket wizard (US-108): a progress bar, the current stage,
// and Back / Next. Next is disabled until the current stage is complete, which
// also guarantees a combined stage's parents are picked before it's reached.
function BracketWizard({ stages, step, onStep, selections, availability, stageComplete, onToggle }) {
  const stage = stages[step]
  const isLast = step === stages.length - 1
  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex gap-1.5 mb-2">
          {stages.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStep(i)}
              aria-label={`Go to ${s.name}`}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                stageComplete(s) ? 'bg-green-500' : i === step ? 'bg-[#2b4dff]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 text-center">
          Stage {step + 1} of {stages.length}
        </p>
      </div>

      <StagePick
        stage={stage}
        selected={selections[stage.id] ?? []}
        available={availability[stage.id]}
        onToggle={(teamId) => onToggle(stage.id, teamId, stage.pick_count)}
      />

      {/* Back / Next */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => onStep(step - 1)}
          disabled={step === 0}
          className="py-2.5 px-5 rounded-xl bg-white border border-gray-200 text-gray-700 text-sm font-semibold transition-colors hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Back
        </button>
        {!isLast ? (
          <button
            type="button"
            onClick={() => onStep(step + 1)}
            disabled={!stageComplete(stage)}
            className={`py-2.5 px-6 rounded-xl text-white text-sm font-semibold transition-colors ${
              stageComplete(stage) ? 'bg-[#2b4dff] hover:bg-[#1a33cc]' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            Next →
          </button>
        ) : (
          <span className="text-xs text-gray-400">Submit your entry below ↓</span>
        )}
      </div>
    </div>
  )
}

function StagePick({ stage, selected, available, onToggle }) {
  const isCombined = stage.parent_ids?.length > 0
  // For a combined stage, only the teams advanced from its parents are offered.
  const teams = available
    ? (stage.teams ?? []).filter((t) => available.has(t.id))
    : (stage.teams ?? [])
  const pickedCount = teams.filter((t) => selected.includes(t.id)).length
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="font-oswald text-lg font-bold text-gray-900">{stage.name}</h3>
        <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-semibold border ${
          pickedCount === stage.pick_count
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-blue-50 text-blue-700 border-blue-100'
        }`}>
          {pickedCount}/{stage.pick_count} picked
        </span>
      </div>
      {stage.description && <p className="text-xs text-gray-400 mb-3">{stage.description}</p>}
      {isCombined && teams.length === 0 ? (
        <p className="text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
          🔗 Make your picks in the earlier stages first — your advancing teams appear here.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
          {teams.map((team) => {
            const isSel = selected.includes(team.id)
            return (
              <button
                key={team.id}
                onClick={() => onToggle(team.id)}
                className={`border rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left ${
                  isSel
                    ? 'bg-[#2b4dff] text-white border-[#2b4dff] shadow-sm'
                    : 'bg-gray-50 hover:bg-blue-50 text-gray-700 border-gray-200 hover:border-blue-300'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <TeamIcon name={team.name} />
                  {team.name}
                </span>
              </button>
            )
          })}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-3">
        {stage.points_per_correct} pt{stage.points_per_correct !== 1 ? 's' : ''} per correct pick
        {stage.all_correct_bonus > 0 && ` · +${stage.all_correct_bonus} bonus if all correct`}
      </p>
    </div>
  )
}
