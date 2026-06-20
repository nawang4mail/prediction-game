import { useState, useEffect } from 'react'
import api from '../../services/api.js'
import { useAdminGame } from '../../context/AdminGameContext.jsx'

const STATUS_FLOW = { draft: 'open', open: 'locked', locked: 'finished' }
const STATUS_LABELS = { draft: 'Draft', open: 'Open', locked: 'Locked', finished: 'Finished' }
const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-green-100 text-green-700',
  locked: 'bg-yellow-100 text-yellow-700',
  finished: 'bg-blue-100 text-blue-700',
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-oswald font-bold text-gray-900">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const { selectedGame, selectedId, refresh: refreshGames } = useAdminGame()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    api.get('/admin/dashboard')
      .then(({ data }) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [selectedId])

  const advanceStatus = async () => {
    if (!selectedGame) return
    const next = STATUS_FLOW[selectedGame.status]
    if (!next) return
    if (!confirm(`Change game status from "${selectedGame.status}" to "${next}"?`)) return
    setAdvancing(true)
    try {
      await api.put(`/admin/games/${selectedGame.id}/status`, { status: next })
      await refreshGames()
    } catch (err) {
      alert(err.response?.data?.message ?? 'Failed to update status.')
    } finally {
      setAdvancing(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-white rounded-2xl animate-pulse shadow-sm" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Game status bar */}
      {selectedGame && (
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-wrap items-center gap-4">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">Current Game</p>
            <h2 className="font-oswald text-xl font-bold text-gray-900">{selectedGame.name}</h2>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-semibold ${STATUS_COLORS[selectedGame.status]}`}>
            {STATUS_LABELS[selectedGame.status]}
          </span>
          {STATUS_FLOW[selectedGame.status] && (
            <button
              onClick={advanceStatus}
              disabled={advancing}
              className="ml-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors"
            >
              {advancing ? 'Updating…' : `Mark as ${STATUS_LABELS[STATUS_FLOW[selectedGame.status]]}`}
            </button>
          )}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Participants" value={stats?.participant_count} />
        <StatCard
          label={selectedGame?.type === 'bracket_prediction' ? 'Stages' : 'Matches'}
          value={stats?.match_count}
          sub={stats?.max_points != null ? `${stats.max_points} max pts` : null}
        />
        <StatCard label="Predictions" value={stats?.prediction_count} />
        <StatCard label="Max Points" value={stats?.max_points} />
      </div>

      {/* Top 5 leaderboard */}
      {stats?.top5?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-oswald text-base font-bold text-gray-900 uppercase tracking-wide mb-4">
            Top 5
          </h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="py-2 text-left text-xs font-semibold text-gray-400 uppercase">Rank</th>
                <th className="py-2 text-left text-xs font-semibold text-gray-400 uppercase">Name</th>
                <th className="py-2 text-right text-xs font-semibold text-gray-400 uppercase">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {stats.top5.map((row) => (
                <tr key={row.id}>
                  <td className="py-2.5 text-sm font-bold text-gray-500">#{row.rank}</td>
                  <td className="py-2.5 text-sm font-medium text-gray-900">{row.display_name}</td>
                  <td className="py-2.5 text-right font-oswald font-bold text-gray-800">{row.total_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
