import { useState, useEffect } from 'react'
import api from '../../services/api.js'
import { useAdminGame } from '../../context/AdminGameContext.jsx'

const PRED_OPTS = ['team_a', 'draw', 'team_b']
const PRED_LABELS = { team_a: 'A', draw: 'D', team_b: 'B' }

function cellClass(pred, result) {
  if (!pred) return 'text-gray-200'
  if (!result) return 'text-blue-600 font-semibold'
  if (pred === result) return 'text-green-600 font-bold'
  return 'text-red-500 font-semibold'
}

export default function AdminPredictionsPage() {
  const { selectedId, selectedGame } = useAdminGame()
  const [data, setData] = useState({ users: [], matches: [], predictions: {} })
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // { userId, matchId }
  const [saving, setSaving] = useState(false)

  const canEdit = selectedGame?.status === 'open'

  const load = () => {
    if (!selectedId) return
    setLoading(true)
    api.get('/admin/predictions').then(({ data: d }) => setData(d)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [selectedId])

  const setPred = async (userId, matchId, prediction) => {
    setSaving(true)
    try {
      await api.post('/admin/predictions', { user_id: userId, match_id: matchId, prediction })
      load()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
    finally { setSaving(false); setEditing(null) }
  }

  const clearPred = async (userId, matchId) => {
    setSaving(true)
    try {
      await api.delete(`/admin/predictions/${userId}/${matchId}`)
      load()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
    finally { setSaving(false); setEditing(null) }
  }

  if (selectedGame?.type !== 'guess_winners') {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
        <p className="text-4xl mb-3">🏆</p>
        <p className="text-sm">Prediction grid is only available for Guess Winners games.<br />Select a Guess Winners game from the header.</p>
      </div>
    )
  }

  const { users = [], matches = [], predictions = {} } = data

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-oswald text-2xl font-bold text-gray-900 uppercase tracking-wide flex-1">Prediction Grid</h2>
        {!canEdit && selectedGame && (
          <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">Read-only (game {selectedGame.status})</span>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-auto">
        {loading ? (
          <div className="p-6">
            <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">No approved users yet.</p>
        ) : (
          <table className="text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="sticky left-0 bg-gray-50 z-10 py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase border-b border-r border-gray-100 min-w-[120px]">
                  Player
                </th>
                {matches.map((m) => (
                  <th key={m.id} className="py-2 px-2 border-b border-gray-100 text-gray-400 font-normal text-center min-w-[56px]">
                    <div className="font-semibold text-gray-600 text-xs">{m.team_a}</div>
                    <div className="text-gray-300">vs</div>
                    <div className="font-semibold text-gray-600 text-xs">{m.team_b}</div>
                    {m.result && (
                      <div className="text-green-600 font-bold text-xs mt-0.5">
                        {m.result === 'team_a' ? m.team_a : m.result === 'team_b' ? m.team_b : 'D'}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-blue-50/40">
                  <td className="sticky left-0 bg-white z-10 py-2.5 px-4 font-medium text-gray-900 border-r border-gray-100 text-xs">{u.display_name}</td>
                  {matches.map((m) => {
                    const pred = predictions[u.id]?.[m.id]
                    const isEditing = editing?.userId === u.id && editing?.matchId === m.id
                    return (
                      <td key={m.id} className="py-2 px-2 text-center">
                        {canEdit && isEditing ? (
                          <div className="flex flex-col gap-1">
                            {PRED_OPTS.map((opt) => (
                              <button key={opt} disabled={saving} onClick={() => setPred(u.id, m.id, opt)}
                                className={`w-8 h-6 rounded text-xs font-bold transition-colors ${pred === opt ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-blue-100'} disabled:opacity-60`}>
                                {PRED_LABELS[opt]}
                              </button>
                            ))}
                            {pred && <button disabled={saving} onClick={() => clearPred(u.id, m.id)} className="w-8 h-5 rounded text-xs text-gray-400 hover:text-red-500 transition-colors disabled:opacity-60">✕</button>}
                            <button onClick={() => setEditing(null)} className="w-8 h-5 rounded text-xs text-gray-300 hover:text-gray-500 transition-colors">↩</button>
                          </div>
                        ) : (
                          <button
                            disabled={!canEdit}
                            onClick={() => canEdit && setEditing({ userId: u.id, matchId: m.id })}
                            className={`w-8 h-8 rounded-lg font-bold text-xs transition-colors ${
                              canEdit ? 'hover:bg-blue-100 cursor-pointer' : 'cursor-default'
                            } ${cellClass(pred, m.result)}`}
                          >
                            {pred ? PRED_LABELS[pred] : '·'}
                          </button>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="text-xs text-gray-400 flex gap-4">
        <span><span className="font-bold text-green-600">A/D/B</span> = correct</span>
        <span><span className="font-bold text-red-500">A/D/B</span> = wrong</span>
        <span><span className="font-bold text-blue-600">A/D/B</span> = no result yet</span>
        <span className="text-gray-300">·</span>
        <span>= no pick</span>
      </div>
    </div>
  )
}
