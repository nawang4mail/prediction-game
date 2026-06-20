import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api.js'
import { TeamIcon } from '../components/TeamLabel.jsx'

export default function MatchesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const gameId = searchParams.get('game') ? Number(searchParams.get('game')) : null
  const [games, setGames] = useState([])
  const [matches, setMatches] = useState([])
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/games').then(({ data }) => {
      const nonDraft = data.filter((g) => g.status !== 'draft')
      setGames(nonDraft)
      if (!gameId && nonDraft.length > 0) {
        const preferred = nonDraft.find((g) => g.status === 'open') ?? nonDraft[0]
        setSearchParams({ game: preferred.id }, { replace: true })
      }
    }).catch(() => {})
  }, [])

  const selectedGame = games.find((g) => g.id === gameId)
  const isBracket = selectedGame?.type === 'bracket_prediction'

  // Bracket games show stages + community picks per team (/bracket breakdown);
  // guess-winners games show matches (/matches). Wait for the game's type before
  // fetching so we hit the right endpoint.
  useEffect(() => {
    if (!gameId || !selectedGame) return
    setLoading(true)
    const load = isBracket
      ? api.get('/bracket', { params: { game_id: gameId } }).then(({ data }) => { setStages(data); setMatches([]) })
      : api.get('/matches', { params: { game_id: gameId } }).then(({ data }) => { setMatches(data); setStages([]) })
    load.catch(() => { setMatches([]); setStages([]) }).finally(() => setLoading(false))
  }, [gameId, isBracket, selectedGame])

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Hero */}
      <header className="pt-8 pb-16 lg:pb-20 shadow-inner relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2b4dff 0%, #1a33cc 100%)' }}>
        <div className="absolute right-[-10%] top-[-50%] w-[50%] h-[200%] rounded-[50%] pointer-events-none" style={{ background: 'rgba(255,255,255,0.05)', transform: 'rotate(-15deg)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h1 className="font-oswald text-4xl md:text-5xl font-bold text-white uppercase tracking-wider mb-6 drop-shadow-md">
            Matches
          </h1>
          <div className="max-w-2xl">
            <div className="bg-white rounded-lg shadow-md p-1 pl-3 pr-2 flex flex-col justify-center border border-transparent focus-within:border-blue-300 transition-colors inline-block min-w-[200px]">
              <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Game</label>
              <select
                value={gameId ?? ''}
                onChange={(e) => setSearchParams({ game: e.target.value })}
                className="w-full bg-transparent text-sm font-bold text-gray-900 focus:outline-none appearance-none cursor-pointer pb-1"
              >
                {games.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Content pulls up over hero */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 relative z-20 pb-24">
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Table header */}
          <div className="bg-[#4b4b4b] text-white px-4 py-3 text-xs md:text-sm font-semibold uppercase tracking-wider">
            {isBracket ? 'Stages & Community Picks' : 'Matches & Community Picks'}
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : isBracket ? (
            stages.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">🏆</p>
                <p className="text-sm">No stages for this game yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {stages.map((stage) => (
                  <StageRow key={stage.id} stage={stage} />
                ))}
              </div>
            )
          ) : matches.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">⚽</p>
              <p className="text-sm">No matches for this game yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Bracket stage: teams laid out as horizontally-scrollable columns, ordered by
// most-picked first (the API already sorts by picks DESC). Each column shows the
// pick count; the actual qualifiers/winners are highlighted green.
function StageRow({ stage }) {
  const teams = stage.teams ?? []
  const totalPicks = teams.reduce((sum, t) => sum + (Number(t.picks) || 0), 0)
  return (
    <div className="p-5">
      <div className="flex items-baseline justify-between gap-3 mb-1">
        <h3 className="font-oswald text-lg font-bold text-gray-900">{stage.name}</h3>
        <span className="shrink-0 text-xs text-gray-400 font-semibold">
          Pick {stage.pick_count} · {stage.points_per_correct}pt each
        </span>
      </div>
      {stage.description && <p className="text-xs text-gray-400 mb-3">{stage.description}</p>}
      <p className="text-xs text-gray-500 font-semibold mb-2">
        Community Picks{totalPicks > 0 ? ` · ${totalPicks} total` : ''} · scroll for more →
      </p>
      {teams.length === 0 ? (
        <p className="text-sm text-gray-400">No teams in this stage yet.</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {teams.map((team) => (
            <TeamColumn key={team.id} team={team} />
          ))}
        </div>
      )}
    </div>
  )
}

function TeamColumn({ team }) {
  const won = !!team.is_winner
  return (
    <div
      className={`shrink-0 w-28 sm:w-32 rounded-xl border p-3 text-center transition-colors ${
        won ? 'bg-green-50 border-green-400' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <p className={`font-semibold text-sm leading-tight min-h-[2.5rem] flex items-center justify-center gap-1.5 ${won ? 'text-green-700' : 'text-gray-800'}`}>
        <TeamIcon name={team.name} />
        <span>{won ? '✓ ' : ''}{team.name}</span>
      </p>
      <p className={`font-oswald text-2xl font-bold mt-1 ${won ? 'text-green-600' : 'text-gray-900'}`}>
        {Number(team.picks) || 0}
      </p>
      <p className="text-[10px] text-gray-400 uppercase tracking-wider">
        {Number(team.picks) === 1 ? 'pick' : 'picks'}
      </p>
    </div>
  )
}

// Distinct colour per option so the bar reads as a 3-way split.
const COLOR_A = '#2b4dff'   // team A — FIFA blue
const COLOR_DRAW = '#9ca3af' // draw — gray
const COLOR_B = '#f05a00'   // team B — FIFA orange

function MatchCard({ match }) {
  const a = Number(match.team_a_count) || 0
  const d = Number(match.draw_count) || 0
  const b = Number(match.team_b_count) || 0
  const total = a + d + b
  // Exact widths so the segments fill the bar; rounded values for the labels.
  const width = (n) => (total ? (n / total) * 100 : 0)
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0)
  const hasResult = !!match.result

  return (
    <div className="p-5">
      {(match.label || match.match_date) && (
        <div className="text-center text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">
          {match.label}{match.label && match.match_date ? ' · ' : ''}{match.match_date ? new Date(match.match_date).toLocaleDateString() : ''}
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <div className="text-right flex-1">
          <span className={`inline-flex items-center gap-2 font-bold text-lg ${hasResult && match.result === 'team_a' ? 'text-green-600' : 'text-gray-900'}`}>
            <TeamIcon name={match.team_a} className="w-6 h-4" />
            {match.team_a}
          </span>
        </div>
        <div className="px-4 text-gray-400 font-bold text-sm">VS</div>
        <div className="text-left flex-1">
          <span className={`inline-flex items-center gap-2 font-bold text-lg ${hasResult && match.result === 'team_b' ? 'text-green-600' : 'text-gray-900'}`}>
            <TeamIcon name={match.team_b} className="w-6 h-4" />
            {match.team_b}
          </span>
        </div>
      </div>

      {/* Community picks bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1 font-semibold">
          <span>Community Picks{total > 0 ? ` · ${total} ${total === 1 ? 'pick' : 'picks'}` : ''}</span>
          {hasResult && <span className="text-green-600 font-bold">Result: {match.result === 'team_a' ? match.team_a : match.result === 'team_b' ? match.team_b : 'Draw'}</span>}
        </div>

        {total === 0 ? (
          <>
            <div className="w-full h-2.5 rounded-full bg-gray-200" />
            <p className="text-center text-xs text-gray-400 mt-1.5">No community picks yet</p>
          </>
        ) : (
          <>
            <div className="w-full h-3 rounded-full flex overflow-hidden bg-gray-200">
              <div className="h-full transition-all" style={{ width: `${width(a)}%`, backgroundColor: hasResult && match.result === 'team_a' ? '#16a34a' : COLOR_A }} />
              <div className="h-full transition-all" style={{ width: `${width(d)}%`, backgroundColor: hasResult && match.result === 'draw' ? '#16a34a' : COLOR_DRAW }} />
              <div className="h-full transition-all" style={{ width: `${width(b)}%`, backgroundColor: hasResult && match.result === 'team_b' ? '#16a34a' : COLOR_B }} />
            </div>
            <div className="grid grid-cols-3 mt-1.5 text-xs font-semibold gap-1">
              <span className="text-left truncate" style={{ color: COLOR_A }}>{pct(a)}% {match.team_a} ({a})</span>
              <span className="text-center" style={{ color: COLOR_DRAW }}>{pct(d)}% Draw ({d})</span>
              <span className="text-right truncate" style={{ color: COLOR_B }}>{pct(b)}% {match.team_b} ({b})</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
