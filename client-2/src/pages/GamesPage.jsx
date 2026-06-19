import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { entriesForGame } from '../services/entries.js'

const TYPE_LABELS = {
  guess_winners: 'Guess Winners',
  bracket_prediction: 'Bracket',
}

const STATUS_CONFIG = {
  open: { label: 'Open', cls: 'bg-green-100 text-green-800 border-green-200' },
  locked: { label: 'Locked', cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  finished: { label: 'Finished', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const FILTERS = ['All', 'Guess Winners', 'Bracket']

export default function GamesPage() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/games')
      .then(({ data }) => setGames(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = games.filter((g) => {
    if (filter === 'Guess Winners') return g.type === 'guess_winners'
    if (filter === 'Bracket') return g.type === 'bracket_prediction'
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero strip */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-oswald text-4xl sm:text-5xl font-bold text-white uppercase tracking-wider mb-2">
            Games
          </h1>
          <p className="text-blue-200 text-sm font-inter">Browse and join prediction games</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                filter === f
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 bg-white rounded-2xl shadow-sm animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-4xl mb-3">🏟️</p>
            <p className="text-sm">No games match this filter.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((game) => (
              <GameCard key={game.id} game={game} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GameCard({ game, navigate }) {
  const myEntries = entriesForGame(game.id)
  const hasEntry = myEntries.length > 0
  const cfg = STATUS_CONFIG[game.status] ?? STATUS_CONFIG.finished

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 hover:shadow-md transition-shadow">
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
      </div>

      <div className="mt-auto pt-2 border-t border-gray-100">
        {hasEntry ? (
          <Link
            to={`/prediction?game=${game.id}`}
            className="block w-full text-center py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
          >
            View My Prediction
          </Link>
        ) : game.status === 'open' ? (
          <button
            onClick={() => navigate(`/games/${game.id}/join`)}
            className="block w-full text-center py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
          >
            Join Game
          </button>
        ) : (
          <Link
            to={`/leaderboard?game=${game.id}`}
            className="block w-full text-center py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors"
          >
            View Leaderboard
          </Link>
        )}
      </div>
    </div>
  )
}
