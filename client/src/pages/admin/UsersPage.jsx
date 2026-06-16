import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import Modal from '../../components/admin/Modal.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import BulkPredModal from '../../components/admin/BulkPredModal.jsx';
import api from '../../services/api.js';

// Mirrors the server gameScope fallback: explicit selection, else the active
// (open/locked) game, else the most recent.
function resolveScopedGame(games) {
  const selected = sessionStorage.getItem('admin_game_id');
  if (selected) return games.find((g) => String(g.id) === String(selected)) ?? null;
  return games.find((g) => g.status === 'open' || g.status === 'locked') ?? games[0] ?? null;
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [readOnly, setReadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'add' | 'bulk' | { edit: user }
  const [showBulkPred, setShowBulkPred] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [bulkNames, setBulkNames] = useState('');
  const [bulkResult, setBulkResult] = useState(null); // { added, skipped }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusTarget, setStatusTarget] = useState(null); // user being declined (US-65)
  const [statusMsg, setStatusMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [{ data }, { data: games }] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/games'),
      ]);
      setUsers(data);
      setReadOnly(resolveScopedGame(games)?.status === 'finished');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setDisplayName('');
    setPhone('');
    setError('');
    setModal('add');
  };

  const openBulk = () => {
    setBulkNames('');
    setBulkResult(null);
    setError('');
    setModal('bulk');
  };

  const handleBulkSave = async (e) => {
    e.preventDefault();
    const names = bulkNames.split('\n').map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    setSaving(true);
    setError('');
    try {
      const { data } = await api.post('/admin/users/bulk', { names });
      setBulkResult(data);
      await load();
    } catch {
      setError('Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (user) => {
    setDisplayName(user.display_name);
    setPhone(user.phone ?? '');
    setError('');
    setModal({ edit: user });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const name = displayName.trim();
    if (!name) return;
    setSaving(true);
    setError('');
    try {
      const payload = { display_name: name, phone: phone.trim() || null };
      if (modal === 'add') {
        await api.post('/admin/users', payload);
      } else {
        await api.put(`/admin/users/${modal.edit.id}`, payload);
      }
      await load();
      setModal(null);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/users/${deleteTarget.id}`);
      await load();
    } finally {
      setDeleteTarget(null);
    }
  };

  // Approve/decline a user's entry (US-65). Declining carries a message.
  const changeStatus = async (user, status, message) => {
    setError('');
    try {
      await api.put(`/admin/users/${user.id}/status`, { status, message });
      await load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to update status.');
    }
  };

  const confirmDecline = async () => {
    await changeStatus(statusTarget, 'declined', statusMsg.trim() || null);
    setStatusTarget(null);
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Users</h2>
          <p className="text-sm text-gray-500">{users.length} participant{users.length !== 1 ? 's' : ''}</p>
        </div>
        {!readOnly && (
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={openBulk}
              className="px-4 py-2 border border-green-700 text-green-700 hover:bg-green-50 text-sm font-medium rounded-lg transition"
            >
              + Bulk Add
            </button>
            <button
              onClick={() => setShowBulkPred(true)}
              className="px-4 py-2 border border-blue-600 text-blue-600 hover:bg-blue-50 text-sm font-medium rounded-lg transition"
            >
              + Bulk Add + Predictions
            </button>
            <button
              onClick={openAdd}
              className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-lg transition"
            >
              + Add User
            </button>
          </div>
        )}
      </div>

      {readOnly && (
        <div
          data-testid="users-finished-banner"
          className="mb-4 text-sm text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-4 py-3"
        >
          🔒 This game is finished — the participant list is locked.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">👥</p>
          <p className="text-sm">No users yet. Add the first participant.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Display Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u, i) => (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{u.display_name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{u.phone ?? '—'}</td>
                  <td className="px-4 py-3" data-testid={`status-${u.id}`}>
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.status === 'declined'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {u.status === 'declined' ? 'Declined' : 'Approved'}
                    </span>
                    {u.status === 'declined' && u.status_message && (
                      <p
                        className="text-[11px] text-gray-400 mt-0.5 max-w-[180px] truncate"
                        title={u.status_message}
                      >
                        {u.status_message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden sm:table-cell">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {readOnly ? (
                      <span className="text-xs text-gray-300">locked</span>
                    ) : (
                      <div className="flex justify-end gap-2">
                        {u.status === 'declined' ? (
                          <button
                            onClick={() => changeStatus(u, 'approved', null)}
                            data-testid={`approve-${u.id}`}
                            className="text-xs text-green-600 hover:text-green-800 font-medium"
                          >
                            Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setStatusMsg(u.status_message ?? '');
                              setError('');
                              setStatusTarget(u);
                            }}
                            data-testid={`decline-${u.id}`}
                            className="text-xs text-amber-600 hover:text-amber-800 font-medium"
                          >
                            Decline
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(u)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(u)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'bulk' && (
        <Modal title="Bulk Add Users" onClose={() => setModal(null)}>
          <form onSubmit={handleBulkSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Display Names <span className="text-gray-400 font-normal">(one per line)</span>
              </label>
              <textarea
                autoFocus
                value={bulkNames}
                onChange={(e) => setBulkNames(e.target.value)}
                rows={6}
                placeholder={"Alice\nBob\nCharlie\nDiana"}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y font-mono"
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            {bulkResult && (
              <div className="text-xs rounded-lg border px-3 py-2 space-y-1 bg-green-50 border-green-200">
                <p className="font-medium text-green-700">✓ Added {bulkResult.added.length} user{bulkResult.added.length !== 1 ? 's' : ''}.</p>
                {bulkResult.skipped.length > 0 && (
                  <p className="text-amber-600">
                    Skipped {bulkResult.skipped.length} duplicate{bulkResult.skipped.length !== 1 ? 's' : ''}:{' '}
                    {bulkResult.skipped.map((s) => s.display_name).join(', ')}
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                {bulkResult ? 'Close' : 'Cancel'}
              </button>
              {!bulkResult && (
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg">
                  {saving ? 'Adding…' : 'Add All'}
                </button>
              )}
            </div>
          </form>
        </Modal>
      )}

      {(modal === 'add' || (modal && modal.edit)) && (
        <Modal
          title={modal === 'add' ? 'Add User' : 'Edit User'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Display Name *</label>
              <input
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                placeholder="e.g. Alice"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Phone Number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1234567890"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.display_name}"? All their predictions will also be removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {showBulkPred && (
        <BulkPredModal
          onClose={() => { setShowBulkPred(false); load(); }}
          onDone={load}
        />
      )}

      {statusTarget && (
        <Modal title={`Decline ${statusTarget.display_name}`} onClose={() => setStatusTarget(null)}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Message to the player <span className="text-gray-400 font-normal">(shown on their predictions)</span>
              </label>
              <textarea
                autoFocus
                value={statusMsg}
                onChange={(e) => setStatusMsg(e.target.value)}
                rows={3}
                placeholder="e.g. Please contact the admin to confirm your entry."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStatusTarget(null)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDecline}
                data-testid="confirm-decline"
                className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
              >
                Decline
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
}
