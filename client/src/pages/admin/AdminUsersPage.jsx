import { useState, useEffect, useCallback } from 'react'
import api from '../../services/api.js'
import { useAdminGame } from '../../context/AdminGameContext.jsx'

const STATUS_COLORS = {
  approved: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
}

export default function AdminUsersPage() {
  const { selectedId, selectedGame } = useAdminGame()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [showAdd, setShowAdd] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [showBulkPreds, setShowBulkPreds] = useState(false)
  const [addForm, setAddForm] = useState({ display_name: '', phone: '' })
  const [bulkText, setBulkText] = useState('')
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [declineModal, setDeclineModal] = useState(null)
  const [declineMsg, setDeclineMsg] = useState('')
  const [saving, setSaving] = useState(false)

  const canManage = selectedGame?.status !== 'finished'

  const load = useCallback(() => {
    if (!selectedId) return
    setLoading(true)
    api.get('/admin/users').then(({ data }) => setUsers(data)).catch(() => {}).finally(() => setLoading(false))
  }, [selectedId])

  useEffect(load, [load])

  const filtered = users.filter((u) => {
    if (filter === 'Approved') return u.status === 'approved'
    if (filter === 'Pending') return u.status === 'declined'
    return true
  })

  const approve = async (id) => {
    await api.put(`/admin/users/${id}/status`, { status: 'approved' })
    load()
  }

  const decline = async (id, msg) => {
    await api.put(`/admin/users/${id}/status`, { status: 'declined', status_message: msg })
    setDeclineModal(null); setDeclineMsg('')
    load()
  }

  const deleteUser = async (id) => {
    if (!confirm('Delete this user? Their predictions will be removed.')) return
    await api.delete(`/admin/users/${id}`)
    load()
  }

  const addUser = async (e) => {
    e.preventDefault()
    if (!addForm.display_name.trim()) return
    setSaving(true)
    try {
      await api.post('/admin/users', { display_name: addForm.display_name.trim(), phone: addForm.phone.trim() || null })
      setAddForm({ display_name: '', phone: '' }); setShowAdd(false); load()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
    finally { setSaving(false) }
  }

  const bulkAdd = async () => {
    const names = bulkText.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!names.length) return
    setSaving(true)
    try {
      await api.post('/admin/users/bulk', { names })
      setBulkText(''); setShowBulk(false); load()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
    finally { setSaving(false) }
  }

  const bulkWithPreds = async () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!lines.length) return
    setSaving(true)
    try {
      await api.post('/admin/users/bulk-with-predictions', { lines })
      setBulkText(''); setShowBulkPreds(false); load()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
    finally { setSaving(false) }
  }

  const saveEdit = async (id) => {
    setSaving(true)
    try {
      await api.put(`/admin/users/${id}`, editForm)
      setEditId(null); load()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
    finally { setSaving(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-oswald text-2xl font-bold text-gray-900 uppercase tracking-wide flex-1">Users</h2>
        {canManage && (
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => { setShowAdd((v) => !v); setShowBulk(false); setShowBulkPreds(false) }} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">+ Add</button>
            <button onClick={() => { setShowBulk((v) => !v); setShowAdd(false); setShowBulkPreds(false) }} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors">Bulk Add</button>
            <button onClick={() => { setShowBulkPreds((v) => !v); setShowAdd(false); setShowBulk(false) }} className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold transition-colors">Bulk + Predictions</button>
          </div>
        )}
      </div>

      {showAdd && (
        <form onSubmit={addUser} className="bg-white rounded-2xl shadow-sm p-5 flex gap-3 flex-wrap">
          <input value={addForm.display_name} onChange={(e) => setAddForm({ ...addForm, display_name: e.target.value })} placeholder="Display Name *" className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
          <input value={addForm.phone} onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })} placeholder="Phone (optional)" className="w-40 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
          <button type="submit" disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg disabled:opacity-60 hover:bg-blue-700 transition-colors">{saving ? 'Adding…' : 'Add'}</button>
          <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
        </form>
      )}

      {showBulk && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Bulk Add — one name per line</h3>
          <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={6} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 font-mono" placeholder={"Alice\nBob\nCharlie"} />
          <div className="flex gap-2">
            <button onClick={bulkAdd} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg disabled:opacity-60 hover:bg-blue-700 transition-colors">{saving ? 'Adding…' : 'Add All'}</button>
            <button onClick={() => setShowBulk(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {showBulkPreds && (
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <h3 className="font-semibold text-gray-900 text-sm">Bulk Add with Predictions — format: <code className="bg-gray-100 px-1 rounded text-xs">Name pick1 pick2 …</code></h3>
          <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} rows={6} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 font-mono" placeholder={"Alice A B draw\nBob B B A"} />
          <div className="flex gap-2">
            <button onClick={bulkWithPreds} disabled={saving} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg disabled:opacity-60 hover:bg-blue-700 transition-colors">{saving ? 'Adding…' : 'Add All'}</button>
            <button onClick={() => setShowBulkPreds(false)} className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {['All', 'Approved', 'Pending'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'}`}>{f}</button>
        ))}
        <span className="ml-auto text-xs text-gray-400 self-center">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">No users.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Phone</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  {editId === u.id ? (
                    <>
                      <td className="py-2 px-4">
                        <input value={editForm.display_name ?? ''} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} className="px-2 py-1 rounded border border-gray-200 text-sm outline-none w-40" />
                      </td>
                      <td className="py-2 px-4">
                        <input value={editForm.phone ?? ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="px-2 py-1 rounded border border-gray-200 text-sm outline-none w-32" />
                      </td>
                      <td className="py-2 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[u.status] ?? 'bg-gray-100 text-gray-500'}`}>{u.status}</span>
                      </td>
                      <td className="py-2 px-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => saveEdit(u.id)} disabled={saving} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-60">Save</button>
                          <button onClick={() => setEditId(null)} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg font-semibold hover:bg-gray-200">Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-900">{u.display_name}</p>
                        {u.status_message && <p className="text-xs text-gray-400 italic">"{u.status_message}"</p>}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">{u.phone || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[u.status] ?? 'bg-gray-100 text-gray-500'}`}>{u.status}</span>
                      </td>
                      <td className="py-3 px-4">
                        {canManage && (
                          <div className="flex items-center justify-end gap-2">
                            {u.status === 'declined' && (
                              <button onClick={() => approve(u.id)} className="text-xs px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 font-semibold rounded-lg transition-colors">Approve</button>
                            )}
                            {u.status === 'approved' && (
                              <button onClick={() => { setDeclineModal(u.id); setDeclineMsg('') }} className="text-xs px-3 py-1.5 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 font-semibold rounded-lg transition-colors">Decline</button>
                            )}
                            <button onClick={() => { setEditId(u.id); setEditForm({ display_name: u.display_name, phone: u.phone ?? '' }) }} className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold rounded-lg transition-colors">Edit</button>
                            <button onClick={() => deleteUser(u.id)} className="text-xs px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 font-semibold rounded-lg transition-colors">Delete</button>
                          </div>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {declineModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-oswald text-lg font-bold text-gray-900 mb-3">Decline Entry</h3>
            <input value={declineMsg} onChange={(e) => setDeclineMsg(e.target.value)} placeholder="Optional message to participant" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => decline(declineModal, declineMsg)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors">Decline</button>
              <button onClick={() => setDeclineModal(null)} className="px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
