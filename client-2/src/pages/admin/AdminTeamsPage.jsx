import { useState, useEffect } from 'react'
import api from '../../services/api.js'
import { useTeams } from '../../context/TeamsContext.jsx'

const EMPTY_FORM = { full_name: '', short_name: '', type: 'country', icon_url: '' }

// Global Teams reference CRUD (US-114). Countries are seeded; this page is mainly
// for adding club logos and fixing entries. Saving here also refreshes the shared
// teams context so pickers and icons update immediately.
export default function AdminTeamsPage() {
  const { reload: reloadTeams } = useTeams()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState(null) // null | { mode: 'add' } | { mode: 'edit', id }
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('')

  const load = () => {
    setLoading(true)
    api.get('/admin/teams').then(({ data }) => setTeams(data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openAdd = () => { setForm(EMPTY_FORM); setFormError(''); setEditor({ mode: 'add' }) }
  const openEdit = (t) => {
    setForm({ full_name: t.full_name, short_name: t.short_name, type: t.type, icon_url: '' })
    setFormError('')
    setEditor({ mode: 'edit', id: t.id })
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim() || !form.short_name.trim()) { setFormError('Full name and short name are required.'); return }
    setSaving(true)
    setFormError('')
    try {
      const payload = {
        full_name: form.full_name.trim(),
        short_name: form.short_name.trim(),
        type: form.type,
        icon_url: form.icon_url.trim() || undefined,
      }
      if (editor.mode === 'add') await api.post('/admin/teams', payload)
      else await api.put(`/admin/teams/${editor.id}`, payload)
      setEditor(null)
      load()
      reloadTeams()
    } catch (err) { setFormError(err.response?.data?.message ?? 'Failed to save team.') }
    finally { setSaving(false) }
  }

  const remove = async (t) => {
    if (!confirm(`Delete ${t.full_name}? Existing matches/stages keep the name but lose its icon.`)) return
    await api.delete(`/admin/teams/${t.id}`)
    load()
    reloadTeams()
  }

  const q = filter.trim().toLowerCase()
  const shown = teams.filter((t) => !q || t.full_name.toLowerCase().includes(q) || t.short_name.toLowerCase().includes(q))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-oswald text-2xl font-bold text-gray-900 uppercase tracking-wide flex-1">Teams</h2>
        <button onClick={openAdd} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">+ Add Team</button>
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search teams…"
        className="w-full sm:w-72 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400"
      />

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : shown.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">No teams found.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Team</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Short</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {shown.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      {t.icon ? (
                        <img src={t.icon} alt="" className="w-12 h-8 object-contain rounded-sm ring-1 ring-black/10" />
                      ) : (
                        <span className="w-12 h-8 rounded-sm bg-gray-100 inline-block" />
                      )}
                      <span className="text-sm font-medium text-gray-900">{t.full_name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-sm text-gray-500">{t.short_name}</td>
                  <td className="py-2.5 px-4">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${t.type === 'club' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(t)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition-colors">Edit</button>
                      <button onClick={() => remove(t)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold transition-colors">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400">{teams.length} teams total</p>

      {/* Add / Edit modal */}
      {editor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={submit} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h3 className="font-oswald text-lg font-bold text-gray-900">{editor.mode === 'add' ? 'Add Team' : 'Edit Team'}</h3>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Full Name *</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" placeholder="Manchester City" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Short Name *</label>
                <input value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" placeholder="MCI" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400">
                  <option value="country">Country</option>
                  <option value="club">Club</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Icon URL</label>
              <input value={form.icon_url} onChange={(e) => setForm({ ...form, icon_url: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" placeholder="https://…/logo.png" />
              <p className="text-[11px] text-gray-400 mt-1">
                {editor.mode === 'edit' ? 'Leave blank to keep the current icon. ' : ''}
                The image is downloaded and stored locally.
              </p>
            </div>
            {formError && <p className="text-sm text-red-600">{formError}</p>}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors">{saving ? 'Saving…' : 'Save Team'}</button>
              <button type="button" onClick={() => setEditor(null)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
