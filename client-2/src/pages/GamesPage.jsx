import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'

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
  const [openId, setOpenId] = useState(null)
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

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero strip */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 py-10 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="font-oswald text-4xl sm:text-5xl font-bold text-white uppercase tracking-wider mb-2">
            Leagues
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
              onClick={() => { setFilter(f); setOpenId(null) }}
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
              <div key={i} className="h-36 bg-white rounded-2xl shadow-sm animate-pulse" />
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
              <GameCard
                key={game.id}
                game={game}
                isOpen={openId === game.id}
                onToggle={() => toggle(game.id)}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GameCard({ game, isOpen, onToggle, navigate }) {
  const cfg = STATUS_CONFIG[game.status] ?? STATUS_CONFIG.finished
  const [rules, setRules] = useState(null)
  const [rulesLoading, setRulesLoading] = useState(false)
  const hasLoaded = rules !== null

  useEffect(() => {
    if (!isOpen || hasLoaded) return
    setRulesLoading(true)
    api.get('/settings', { params: { game_id: game.id } })
      .then(({ data }) => setRules(data.rules_text ?? ''))
      .catch(() => setRules(''))
      .finally(() => setRulesLoading(false))
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border transition-shadow ${
        isOpen ? 'border-blue-200 shadow-md' : 'border-gray-100 hover:shadow-md'
      }`}
    >
      {/* Clickable header */}
      <button
        onClick={onToggle}
        className="w-full text-left p-5 flex flex-col gap-3"
      >
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
          <span className="text-xs text-gray-500 font-medium">
            👥 {game.participant_count ?? 0} player{(game.participant_count ?? 0) !== 1 ? 's' : ''}
          </span>
          <svg
            className={`ml-auto w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded: rules + actions */}
      {isOpen && (
        <div className="border-t border-gray-100">
          {/* Rules */}
          <div className="px-5 py-4">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-2">Rules</p>
            {rulesLoading ? (
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded animate-pulse w-full" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-4/5" />
                <div className="h-3 bg-gray-100 rounded animate-pulse w-3/5" />
              </div>
            ) : rules ? (
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{rules}</p>
            ) : (
              <p className="text-sm text-gray-400 italic">No rules set for this game.</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="px-5 pb-5 flex gap-2">
            {game.status === 'open' ? (
              <button
                onClick={() => navigate(`/leagues/${game.id}/join`)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#2b4dff] hover:bg-[#1a33cc] text-white text-sm font-semibold transition-colors text-center"
              >
                + Join Game
              </button>
            ) : (
              <Link
                to={`/leaderboard?game=${game.id}`}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#2b4dff] hover:bg-[#1a33cc] text-white text-sm font-semibold transition-colors text-center"
              >
                View Leaderboard
              </Link>
            )}
            <button
              onClick={onToggle}
              className="py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
