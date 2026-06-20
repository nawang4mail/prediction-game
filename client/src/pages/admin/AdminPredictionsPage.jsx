import { useState, useEffect } from 'react'
import api from '../../services/api.js'
import { useAdminGame } from '../../context/AdminGameContext.jsx'

// The exact option a player picked, shown in full (team name or "Draw").
function predLabel(pred, match) {
  if (pred === 'team_a') return match.team_a
  if (pred === 'team_b') return match.team_b
  if (pred === 'draw') return 'Draw'
  return null
}

// The actual result, shown in full for the column header.
function resultLabel(result, match) {
  if (result === 'team_a') return match.team_a
  if (result === 'team_b') return match.team_b
  if (result === 'draw') return 'Draw'
  return null
}

// Cell background colour reflects the outcome of the pick.
function cellClass(pred, result) {
  if (!pred) return 'bg-white text-gray-300'
  if (!result) return 'bg-blue-50 text-blue-700'
  if (pred === result) return 'bg-green-100 text-green-800'
  return 'bg-red-100 text-red-700'
}

export default function AdminPredictionsPage() {
  const { selectedId, selectedGame } = useAdminGame()
  const [data, setData] = useState({ users: [], matches: [], predictions: {} })
  const [loading, setLoading] = useState(true)

  const load = () => {
    if (!selectedId) return
    setLoading(true)
    api.get('/admin/predictions').then(({ data: d }) => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [selectedId])

  if (selectedGame?.type !== 'guess_winners') {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
        <p className="text-4xl mb-3">🏆</p>
        <p className="text-sm">Prediction grid is only available for Guess Winners games.<br />Select a Guess Winners game from the header.</p>
      </div>
    )
  }

  const { users = [], matches = [], predictions = {} } = data

  // A player's score is one point per correct pick (only matches with a result count).
  const scoreFor = (userId) =>
    matches.reduce((acc, m) => {
      const pred = predictions[userId]?.[m.id]
      return acc + (pred && m.result && pred === m.result ? 1 : 0)
    }, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-oswald text-2xl font-bold text-gray-900 uppercase tracking-wide flex-1">Prediction Grid</h2>
        <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">Read-only</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-auto">
        {loading ? (
          <div className="p-6">
            <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">No entries yet.</p>
        ) : (
          <table className="text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-gray-50 z-10 py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase border-b border-r border-gray-100 min-w-[140px]">
                  Player
                </th>
                {matches.map((m) => (
                  <th key={m.id} className="py-2 px-3 border-b border-gray-100 text-gray-400 font-normal text-center min-w-[100px]">
                    <div className="font-semibold text-gray-600 text-xs">{m.team_a}</div>
                    <div className="text-gray-300">vs</div>
                    <div className="font-semibold text-gray-600 text-xs">{m.team_b}</div>
                    {m.result && (
                      <div className="text-green-600 font-bold text-xs mt-0.5">
                        {resultLabel(m.result, m)}
                      </div>
                    )}
                  </th>
                ))}
                <th className="sticky right-0 bg-gray-50 z-10 py-3 px-4 text-center text-xs font-semibold text-gray-500 uppercase border-b border-l border-gray-100 min-w-[70px]">
                  Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-blue-50/40">
                  <td className="sticky left-0 bg-white z-10 py-2.5 px-4 font-medium text-gray-900 border-r border-gray-100 text-xs">
                    <span className="flex items-center gap-1.5">
                      {u.display_name}
                      {u.status === 'declined' && (
                        <span className="text-[9px] font-semibold uppercase bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full tracking-wide">
                          Pending
                        </span>
                      )}
                    </span>
                  </td>
                  {matches.map((m) => {
                    const pred = predictions[u.id]?.[m.id]
                    return (
                      <td key={m.id} className="p-1.5 text-center">
                        <div className={`rounded-md py-2 px-2 text-xs font-semibold ${cellClass(pred, m.result)}`}>
                          {pred ? predLabel(pred, m) : '·'}
                        </div>
                      </td>
                    )
                  })}
                  <td className="sticky right-0 bg-white z-10 py-2.5 px-4 text-center border-l border-gray-100">
                    <span className="font-oswald text-base font-bold text-gray-900">{scoreFor(u.id)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-xs text-gray-400 flex gap-3 flex-wrap items-center">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-100 border border-green-200" /> correct</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 border border-red-200" /> wrong</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-50 border border-blue-200" /> no result yet</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-white border border-gray-200" /> no pick</span>
        <span className="text-gray-300">·</span>
        <span>Score = 1 point per correct pick</span>
      </div>
    </div>
  )
}
