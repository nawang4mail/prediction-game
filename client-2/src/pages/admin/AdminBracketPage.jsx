import { useState, useEffect } from 'react'
import api from '../../services/api.js'
import { useAdminGame } from '../../context/AdminGameContext.jsx'

export default function AdminBracketPage() {
  const { selectedId, selectedGame } = useAdminGame()
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('stages')
  const [entries, setEntries] = useState([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', teams: '', pick_count: 4, points_per_correct: 1, all_correct_bonus: 0 })
  const [resultStage, setResultStage] = useState(null)
  const [saving, setSaving] = useState(false)

  const canEdit = selectedGame?.status === 'draft' || selectedGame?.status === 'open'
  const canResult = selectedGame?.status === 'open' || selectedGame?.status === 'locked'

  const load = () => {
    if (!selectedId) return
    setLoading(true)
    api.get('/admin/bracket').then(({ data }) => setStages(data)).catch(() => {}).finally(() => setLoading(false))
  }

  const loadEntries = () => {
    setEntriesLoading(true)
    api.get('/admin/bracket/entries').then(({ data }) => setEntries(data)).catch(() => {}).finally(() => setEntriesLoading(false))
  }

  useEffect(load, [selectedId])
  useEffect(() => { if (tab === 'entries') loadEntries() }, [tab])

  const addStage = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const teamList = form.teams.split(',').map((t) => t.trim()).filter(Boolean)
      await api.post('/admin/bracket', {
        name: form.name.trim(),
        description: form.description.trim() || null,
        teams: teamList,
        pick_count: Number(form.pick_count),
        points_per_correct: Number(form.points_per_correct),
        all_correct_bonus: Number(form.all_correct_bonus),
      })
      setForm({ name: '', description: '', teams: '', pick_count: 4, points_per_correct: 1, all_correct_bonus: 0 })
      setShowAdd(false)
      load()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
    finally { setSaving(false) }
  }

  const deleteStage = async (id) => {
    if (!confirm('Delete this stage?')) return
    await api.delete(`/admin/bracket/${id}`)
    load()
  }

  const setResults = async (stageId, winnerIds) => {
    setSaving(true)
    try {
      await api.put(`/admin/bracket/${stageId}/results`, { winner_ids: winnerIds })
      setResultStage(null)
      load()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-oswald text-2xl font-bold text-gray-900 uppercase tracking-wide flex-1">Bracket</h2>
        <div className="flex gap-2">
          <button onClick={() => setTab('stages')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'stages' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>Stages</button>
          <button onClick={() => setTab('entries')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${tab === 'entries' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>Entries</button>
        </div>
        {tab === 'stages' && canEdit && (
          <button onClick={() => setShowAdd((v) => !v)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">+ Add Stage</button>
        )}
      </div>

      {tab === 'stages' && (
        <>
          {showAdd && (
            <form onSubmit={addStage} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
              <h3 className="font-semibold text-gray-900">New Stage</h3>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Stage Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" placeholder="Quarter-finalists" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                  <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" placeholder="Optional description" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Teams (comma-separated)</label>
                  <input value={form.teams} onChange={(e) => setForm({ ...form, teams: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" placeholder="Brazil, France, Argentina, England" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Pick Count</label>
                  <input type="number" min={1} value={form.pick_count} onChange={(e) => setForm({ ...form, pick_count: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Pts per Correct</label>
                  <input type="number" min={0} value={form.points_per_correct} onChange={(e) => setForm({ ...form, points_per_correct: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">All Correct Bonus</label>
                  <input type="number" min={0} value={form.all_correct_bonus} onChange={(e) => setForm({ ...form, all_correct_bonus: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors">{saving ? 'Adding…' : 'Add Stage'}</button>
                <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
              </div>
            </form>
          )}

          <div className="space-y-3">
            {loading ? (
              [...Array(3)].map((_, i) => <div key={i} className="h-32 bg-white rounded-2xl animate-pulse shadow-sm" />)
            ) : stages.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-10">No stages yet.</p>
            ) : stages.map((stage) => (
              <div key={stage.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex-1">
                    <h3 className="font-oswald text-lg font-bold text-gray-900">{stage.name}</h3>
                    {stage.description && <p className="text-xs text-gray-400">{stage.description}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      Pick {stage.pick_count} · {stage.points_per_correct}pt each{stage.all_correct_bonus > 0 ? ` · +${stage.all_correct_bonus} bonus` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {canResult && (
                      <button onClick={() => setResultStage(stage)} className="text-xs px-3 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 font-semibold transition-colors">Set Results</button>
                    )}
                    {canEdit && (
                      <button onClick={() => deleteStage(stage.id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold transition-colors">Delete</button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(stage.teams ?? []).map((t) => (
                    <span key={t.id} className={`px-2.5 py-1 rounded-full text-xs font-medium ${t.is_winner ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600'}`}>
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'entries' && (
        <div className="bg-white rounded-2xl shadow-sm overflow-x-auto">
          {entriesLoading ? (
            <div className="p-6">
              <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
            </div>
          ) : entries.length === 0 ? (
            <p className="p-8 text-center text-gray-400 text-sm">No entries yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Player</th>
                  {(entries[0]?.picks ?? []).map((p, i) => (
                    <th key={i} className="py-3 px-3 text-left text-xs font-semibold text-gray-500 uppercase">{p.stage_name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.map((e) => (
                  <tr key={e.user_id} className="hover:bg-gray-50">
                    <td className="py-2.5 px-4 font-medium text-gray-900">{e.display_name}</td>
                    {(e.picks ?? []).map((p, i) => (
                      <td key={i} className="py-2.5 px-3 text-xs text-gray-500">{(p.teams ?? []).join(', ') || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Set results modal */}
      {resultStage && (
        <SetResultsModal stage={resultStage} onClose={() => setResultStage(null)} onSave={setResults} saving={saving} />
      )}
    </div>
  )
}

function SetResultsModal({ stage, onClose, onSave, saving }) {
  const [winners, setWinners] = useState(new Set(
    (stage.teams ?? []).filter((t) => t.is_winner).map((t) => t.id)
  ))
  const toggle = (id) => setWinners((prev) => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
        <h3 className="font-oswald text-lg font-bold text-gray-900 mb-1">Set Results</h3>
        <p className="text-sm text-gray-500 mb-4">{stage.name} — select winners/qualifiers</p>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {(stage.teams ?? []).map((t) => (
            <label key={t.id} className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${winners.has(t.id) ? 'bg-green-50 border-green-400 text-green-800' : 'border-gray-200 text-gray-700 hover:border-blue-300'}`}>
              <input type="checkbox" checked={winners.has(t.id)} onChange={() => toggle(t.id)} className="accent-green-600" />
              {t.name}
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={() => onSave(stage.id, [...winners])} disabled={saving} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors">
            {saving ? 'Saving…' : 'Save Results'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  )
}
