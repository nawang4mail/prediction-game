import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { entriesForGame } from '../services/entries.js'

const TYPE_LABELS = {
  guess_winners: 'Guess Winners',
  bracket_prediction: 'Bracket',
}

const STATUS_CONFIG = {
  open:     { label: 'Open',     cls: 'bg-green-100 text-green-800 border-green-200' },
  locked:   { label: 'Locked',   cls: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  finished: { label: 'Finished', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}

const FILTERS = ['All', 'Guess Winners', 'Bracket']

// ─── Modal ───────────────────────────────────────────────────────────────────

function GameModal({ game, onClose, navigate }) {
  const [rules, setRules] = useState(null)
  const [loading, setLoading] = useState(true)
  const cfg = STATUS_CONFIG[game.status] ?? STATUS_CONFIG.finished

  useEffect(() => {
    api.get('/settings', { params: { game_id: game.id } })
      .then(({ data }) => setRules(data.rules_text ?? ''))
      .catch(() => setRules(''))
      .finally(() => setLoading(false))

    // Lock body scroll while modal is open
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [game.id])

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const hasEntry = entriesForGame(game.id).length > 0

  const handleJoin = useCallback(() => {
    onClose()
    navigate(`/leagues/${game.id}/join`)
  }, [game.id, navigate, onClose])

  const handleEdit = useCallback(() => {
    onClose()
    navigate(`/my-game?game=${game.id}`)
  }, [game.id, navigate, onClose])

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Sheet / dialog */}
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div
          className="relative px-6 pt-6 pb-5 shrink-0"
          style={{ background: 'linear-gradient(135deg, #2b4dff 0%, #1a33cc 100%)' }}
        >
          {/* Decorative ellipse */}
          <div
            className="absolute pointer-events-none"
            style={{
              right: '-5%', top: '-60%',
              width: '50%', height: '220%',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)',
              transform: 'rotate(-15deg)',
            }}
          />
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.cls}`}>
                {cfg.label}
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/15 text-white border border-white/20">
                {TYPE_LABELS[game.type] ?? game.type}
              </span>
            </div>
            <h2 className="font-oswald text-2xl font-bold text-white uppercase tracking-wide leading-tight">
              {game.name}
            </h2>
            <p className="text-blue-200 text-xs mt-1 font-inter">
              👥 {game.participant_count ?? 0} player{(game.participant_count ?? 0) !== 1 ? 's' : ''} joined
            </p>
          </div>
        </div>

        {/* Rules body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-3">Game Rules</p>
          {loading ? (
            <div className="space-y-2.5">
              {[100, 85, 70, 90, 60].map((w, i) => (
                <div key={i} className={`h-3 bg-gray-100 rounded animate-pulse`} style={{ width: `${w}%` }} />
              ))}
            </div>
          ) : rules ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{rules}</p>
          ) : (
            <p className="text-sm text-gray-400 italic">No rules have been set for this game.</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex gap-3 shrink-0">
          {hasEntry ? (
            <>
              {game.status === 'open' && (
                <button
                  onClick={handleJoin}
                  className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-colors"
                  style={{ backgroundColor: '#2b4dff' }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = '#1a33cc'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = '#2b4dff'}
                >
                  + Add Another Entry
                </button>
              )}
              <button
                onClick={handleEdit}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-[#f05a00] hover:bg-orange-600 transition-colors"
              >
                {game.status === 'open' ? 'Edit Entry' : 'View Entry'}
              </button>
            </>
          ) : (
            <>
              <button
                disabled={game.status !== 'open'}
                onClick={game.status === 'open' ? handleJoin : undefined}
                className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-colors ${
                  game.status === 'open'
                    ? 'text-white cursor-pointer'
                    : 'text-white/70 cursor-not-allowed opacity-50'
                }`}
                style={{ backgroundColor: game.status === 'open' ? '#2b4dff' : '#9ca3af' }}
                onMouseOver={e => { if (game.status === 'open') e.currentTarget.style.backgroundColor = '#1a33cc' }}
                onMouseOut={e => { if (game.status === 'open') e.currentTarget.style.backgroundColor = '#2b4dff' }}
              >
                {game.status === 'open' ? '+ Join Game' : `Game ${STATUS_CONFIG[game.status]?.label ?? game.status}`}
              </button>
              <button
                onClick={onClose}
                className="py-3 px-5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

function GameCard({ game, onOpenModal, navigate }) {
  const cfg = STATUS_CONFIG[game.status] ?? STATUS_CONFIG.finished
  const hasEntry = entriesForGame(game.id).length > 0

  return (
    <div
      onClick={() => onOpenModal(game)}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex flex-col gap-4 hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-oswald text-lg font-semibold text-gray-900 leading-tight group-hover:text-[#2b4dff] transition-colors">
          {game.name}
        </h2>
        <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
          {TYPE_LABELS[game.type] ?? game.type}
        </span>
        <span className="text-xs text-gray-500 font-medium">
          👥 {game.participant_count ?? 0} player{(game.participant_count ?? 0) !== 1 ? 's' : ''}
        </span>
      </div>

      {hasEntry ? (
        <div className="mt-auto flex gap-2">
          {game.status === 'open' && (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/leagues/${game.id}/join`) }}
              className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-white transition-colors"
              style={{ backgroundColor: '#2b4dff' }}
              onMouseOver={e => e.currentTarget.style.backgroundColor = '#1a33cc'}
              onMouseOut={e => e.currentTarget.style.backgroundColor = '#2b4dff'}
            >
              + Add Entry
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/my-game?game=${game.id}`) }}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold text-white bg-[#f05a00] hover:bg-orange-600 transition-colors"
          >
            {game.status === 'open' ? 'Edit Entry' : 'View Entry'}
          </button>
        </div>
      ) : (
        <button
          disabled={game.status !== 'open'}
          onClick={(e) => { e.stopPropagation(); if (game.status === 'open') navigate(`/leagues/${game.id}/join`) }}
          className={`mt-auto w-full py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors ${
            game.status === 'open'
              ? 'text-white cursor-pointer'
              : 'text-white/70 cursor-not-allowed opacity-50'
          }`}
          style={{ backgroundColor: game.status === 'open' ? '#2b4dff' : '#9ca3af' }}
          onMouseOver={e => { if (game.status === 'open') e.currentTarget.style.backgroundColor = '#1a33cc' }}
          onMouseOut={e => { if (game.status === 'open') e.currentTarget.style.backgroundColor = '#2b4dff' }}
        >
          {game.status === 'open' ? '+ Join Game' : `Game ${STATUS_CONFIG[game.status]?.label ?? game.status}`}
        </button>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function GamesPage() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [modalGame, setModalGame] = useState(null)
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
      {/* Hero */}
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
              <div key={i} className="h-44 bg-white rounded-2xl shadow-sm animate-pulse" />
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
                onOpenModal={setModalGame}
                navigate={navigate}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rules modal */}
      {modalGame && (
        <GameModal
          game={modalGame}
          onClose={() => setModalGame(null)}
          navigate={navigate}
        />
      )}
    </div>
  )
}
