import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'
import { useAdminGame } from '../../context/AdminGameContext.jsx'

const STATUS_FLOW = { draft: 'open', open: 'locked', locked: 'finished' }
const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-600',
  open: 'bg-green-100 text-green-700',
  locked: 'bg-yellow-100 text-yellow-700',
  finished: 'bg-blue-100 text-blue-700',
}
const TYPE_LABELS = { guess_winners: 'Guess Winners', bracket_prediction: 'Bracket' }

export default function AdminGamesPage() {
  const { games, loading, refresh, select } = useAdminGame()
  const navigate = useNavigate()
  const [selected, setSelected] = useState(new Set())

  // Clicking a game name scopes the panel to it and jumps to its picks editor.
  const openGame = (game) => {
    select(game.id)
    navigate(game.type === 'bracket_prediction' ? '/admin/bracket' : '/admin/matches')
  }
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState('guess_winners')
  const [createError, setCreateError] = useState('')

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newName.trim()) { setCreateError('Name is required.'); return }
    setCreating(true); setCreateError('')
    try {
      const { data } = await api.post('/admin/games', { name: newName.trim(), type: newType })
      await refresh()
      select(data.id)
      setShowCreate(false); setNewName(''); setNewType('guess_winners')
    } catch (err) {
      setCreateError(err.response?.data?.message ?? 'Failed to create game.')
    } finally {
      setCreating(false)
    }
  }

  const advanceStatus = async (game) => {
    const next = STATUS_FLOW[game.status]
    if (!next || !confirm(`Change "${game.name}" from "${game.status}" to "${next}"?`)) return
    try {
      await api.put(`/admin/games/${game.id}/status`, { status: next })
      refresh()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
  }

  const deleteGame = async (game) => {
    if (!confirm(`Delete "${game.name}"? This cannot be undone.`)) return
    try {
      await api.delete(`/admin/games/${game.id}`)
      refresh()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed to delete.') }
  }

  const bulkDelete = async () => {
    if (!confirm(`Delete ${selected.size} game(s)?`)) return
    try {
      await api.post('/admin/games/bulk-delete', { ids: [...selected] })
      setSelected(new Set())
      refresh()
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-oswald text-2xl font-bold text-gray-900 uppercase tracking-wide flex-1">
          Games
        </h2>
        {selected.size > 0 && (
          <button onClick={bulkDelete} className="px-4 py-2 rounded-xl bg-red-100 text-red-700 text-sm font-semibold hover:bg-red-200 transition-colors">
            Delete {selected.size} selected
          </button>
        )}
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
        >
          + Create Game
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">New Game</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Game Name</label>
              <input
                type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-400 outline-none"
                placeholder="World Cup 2026"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Type</label>
              <select value={newType} onChange={(e) => setNewType(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-blue-400 outline-none">
                <option value="guess_winners">Guess Winners</option>
                <option value="bracket_prediction">Bracket Prediction</option>
              </select>
            </div>
          </div>
          {createError && <p className="text-red-600 text-sm">{createError}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-60 transition-colors">
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-colors">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : games.length === 0 ? (
          <p className="p-8 text-center text-gray-400 text-sm">No games yet. Create one above.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="py-3 pl-4 w-8"><input type="checkbox" onChange={(e) => {
                  if (e.target.checked) setSelected(new Set(games.map((g) => g.id)))
                  else setSelected(new Set())
                }} checked={selected.size === games.length && games.length > 0} readOnly /></th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {games.map((game) => (
                <tr key={game.id} className="hover:bg-gray-50">
                  <td className="py-3 pl-4">
                    <input type="checkbox" checked={selected.has(game.id)} onChange={() => toggleSelect(game.id)} />
                  </td>
                  <td className="py-3 px-4 text-sm">
                    <button
                      onClick={() => openGame(game)}
                      className="font-medium text-blue-600 hover:text-blue-800 hover:underline text-left"
                      title={`Open ${game.type === 'bracket_prediction' ? 'Bracket' : 'Matches'} editor`}
                    >
                      {game.name}
                    </button>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">{TYPE_LABELS[game.type] ?? game.type}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[game.status]}`}>
                      {game.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      {STATUS_FLOW[game.status] && (
                        <button onClick={() => advanceStatus(game)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold transition-colors">
                          → {STATUS_FLOW[game.status]}
                        </button>
                      )}
                      {(game.status === 'draft' || game.status === 'finished') && (
                        <button onClick={() => deleteGame(game)} className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 font-semibold transition-colors">
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
