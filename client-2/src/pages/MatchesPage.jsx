import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../services/api.js'

export default function MatchesPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const gameId = searchParams.get('game') ? Number(searchParams.get('game')) : null
  const [games, setGames] = useState([])
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/games').then(({ data }) => {
      const nonDraft = data.filter((g) => g.status !== 'draft')
      setGames(nonDraft)
      if (!gameId && nonDraft.length > 0) {
        setSearchParams({ game: nonDraft[0].id }, { replace: true })
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!gameId) return
    setLoading(true)
    api.get('/matches', { params: { game_id: gameId } })
      .then(({ data }) => setMatches(data))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false))
  }, [gameId])

  const selectedGame = games.find((g) => g.id === gameId)

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
            Matches & Community Picks
          </div>

          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
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

function MatchCard({ match }) {
  const teamA = match.pick_pct?.team_a ?? 0
  const draw = match.pick_pct?.draw ?? 0
  const teamB = match.pick_pct?.team_b ?? 0
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
          <span className={`font-bold text-lg ${hasResult && match.result === 'team_a' ? 'text-green-600' : 'text-gray-900'}`}>{match.team_a}</span>
        </div>
        <div className="px-4 text-gray-400 font-bold text-sm">VS</div>
        <div className="text-left flex-1">
          <span className={`font-bold text-lg ${hasResult && match.result === 'team_b' ? 'text-green-600' : 'text-gray-900'}`}>{match.team_b}</span>
        </div>
      </div>

      {/* Community picks bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1 font-semibold">
          <span>Community Picks</span>
          {hasResult && <span className="text-green-600 font-bold">Result: {match.result === 'team_a' ? match.team_a : match.result === 'team_b' ? match.team_b : 'Draw'}</span>}
        </div>
        <div className="w-full h-2.5 rounded-full flex overflow-hidden bg-gray-200">
          <div className={`h-full transition-all ${hasResult && match.result === 'team_a' ? 'bg-green-500' : 'bg-[#2b4dff]'}`} style={{ width: `${teamA}%` }} />
          <div className={`h-full transition-all ${hasResult && match.result === 'draw' ? 'bg-green-500' : 'bg-gray-400'}`} style={{ width: `${draw}%` }} />
          <div className={`h-full transition-all ${hasResult && match.result === 'team_b' ? 'bg-green-500' : 'bg-[#4b69ff]'}`} style={{ width: `${teamB}%` }} />
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>{teamA}% {match.team_a}</span>
          {draw > 0 && <span>{draw}% Draw</span>}
          <span>{teamB}% {match.team_b}</span>
        </div>
      </div>
    </div>
  )
}
