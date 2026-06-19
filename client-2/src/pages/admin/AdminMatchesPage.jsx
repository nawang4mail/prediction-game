import { useState, useEffect } from 'react'
import api from '../../services/api.js'
import { useAdminGame } from '../../context/AdminGameContext.jsx'

const RESULTS = [
  { value: 'team_a', label: 'Team A' },
  { value: 'draw', label: 'Draw' },
  { value: 'team_b', label: 'Team B' },
]

function ResultBadge({ result, teamA, teamB }) {
  if (!result) return <span className="text-gray-300 text-xs">—</span>
  const label = result === 'team_a' ? teamA : result === 'team_b' ? teamB : 'Draw'
  return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">{label}</span>
}

export default function AdminMatchesPage() {
  const { selectedId, selectedGame } = useAdminGame()
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ team_a: '', team_b: '', label: '', match_date: '' })
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [resultModal, setResultModal] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    if (!selectedId) return
    setLoading(true)
    api.get('/admin/matches').then(({ data }) => setMatches(data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [selectedId])

  const canEdit = selectedGame?.status === 'draft' || selectedGame?.status === 'open'
  const canResult = selectedGame?.status === 'open' || selectedGame?.status === 'locked'

  const addMatch = async (e) => {
    e.preventDefault()
    if (!form.team_a.trim() || !form.team_b.trim()) return
    setSaving(true)
    try {
      await api.post('/admin/matches', {
        team_a: form.team_a.trim(), team_b: form.team_b.trim(),
        label: form.label.trim() || null,
        match_date: form.match_date || null,
      })
      setForm({ team_a: '', team_b: '', label: '', match_date: '' })
      setShowAdd(false)
      load()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
    finally { setSaving(false) }
  }

  const saveEdit = async (id) => {
    setSaving(true)
    try {
      await api.put(`/admin/matches/${id}`, editForm)
      setEditId(null)
      load()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
    finally { setSaving(false) }
  }

  const deleteMatch = async (id) => {
    if (!confirm('Delete this match?')) return
    await api.delete(`/admin/matches/${id}`)
    load()
  }

  const setResult = async (matchId, result) => {
    setSaving(true)
    try {
      await api.put(`/admin/matches/${matchId}/result`, { result })
      setResultModal(null)
      load()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-oswald text-2xl font-bold text-gray-900 uppercase tracking-wide flex-1">Matches</h2>
        {canEdit && (
          <button onClick={() => setShowAdd((v) => !v)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">
            + Add Match
          </button>
        )}
      </div>

      {showAdd && (
        <form onSubmit={addMatch} className="bg-white rounded-2xl shadow-sm p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input value={form.team_a} onChange={(e) => setForm({ ...form, team_a: e.target.value })} placeholder="Team A *" className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
          <input value={form.team_b} onChange={(e) => setForm({ ...form, team_b: e.target.value })} placeholder="Team B *" className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
          <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Label (optional)" className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
          <input type="date" value={form.match_date} onChange={(e) => setForm({ ...form, match_date: e.target.value })} className="px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
          <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors">
              {saving ? 'Adding…' : 'Add'}
            </button>
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : matches.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">No matches yet.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Match</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Result</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {matches.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  {editId === m.id ? (
                    <>
                      <td colSpan={2} className="py-2 px-4">
                        <div className="flex gap-2 flex-wrap">
                          <input value={editForm.team_a ?? ''} onChange={(e) => setEditForm({ ...editForm, team_a: e.target.value })} className="px-2 py-1 rounded border border-gray-200 text-sm outline-none w-28" placeholder="Team A" />
                          <input value={editForm.team_b ?? ''} onChange={(e) => setEditForm({ ...editForm, team_b: e.target.value })} className="px-2 py-1 rounded border border-gray-200 text-sm outline-none w-28" placeholder="Team B" />
                          <input value={editForm.label ?? ''} onChange={(e) => setEditForm({ ...editForm, label: e.target.value })} className="px-2 py-1 rounded border border-gray-200 text-sm outline-none w-32" placeholder="Label" />
                          <input type="date" value={editForm.match_date ?? ''} onChange={(e) => setEditForm({ ...editForm, match_date: e.target.value })} className="px-2 py-1 rounded border border-gray-200 text-sm outline-none" />
                        </div>
                      </td>
                      <td className="py-2 px-4"><ResultBadge result={m.result} teamA={m.team_a} teamB={m.team_b} /></td>
                      <td className="py-2 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => saveEdit(m.id)} disabled={saving} className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-60">Save</button>
                          <button onClick={() => setEditId(null)} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-900">{m.team_a} vs {m.team_b}</p>
                        {m.label && <p className="text-xs text-gray-400">{m.label}</p>}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">{m.match_date ? new Date(m.match_date).toLocaleDateString() : '—'}</td>
                      <td className="py-3 px-4"><ResultBadge result={m.result} teamA={m.team_a} teamB={m.team_b} /></td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {canResult && (
                            <button onClick={() => setResultModal(m)} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-semibold transition-colors">
                              Set Result
                            </button>
                          )}
                          {canEdit && (
                            <>
                              <button onClick={() => { setEditId(m.id); setEditForm({ team_a: m.team_a, team_b: m.team_b, label: m.label ?? '', match_date: m.match_date?.split('T')[0] ?? '' }) }} className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold transition-colors">Edit</button>
                              <button onClick={() => deleteMatch(m.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold transition-colors">Delete</button>
                            </>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Result modal */}
      {resultModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-oswald text-lg font-bold text-gray-900 mb-1">Set Result</h3>
            <p className="text-sm text-gray-500 mb-4">{resultModal.team_a} vs {resultModal.team_b}</p>
            <div className="grid grid-cols-3 gap-3">
              {RESULTS.map(({ value, label }) => (
                <button
                  key={value}
                  disabled={saving}
                  onClick={() => setResult(resultModal.id, value)}
                  className={`py-3 rounded-xl text-sm font-semibold border transition-colors ${
                    resultModal.result === value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-400 hover:bg-blue-50'
                  } disabled:opacity-60`}
                >
                  {value === 'team_a' ? resultModal.team_a : value === 'team_b' ? resultModal.team_b : label}
                </button>
              ))}
            </div>
            <button onClick={() => setResultModal(null)} className="w-full mt-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
