import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import Modal from '../../components/admin/Modal.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import api from '../../services/api.js';

const EMPTY_FORM = { team_a: '', team_b: '', label: '', match_date: '' };
const RESULT_OPTIONS = [
  { value: '', label: '— Pending —' },
  { value: 'team_a', label: (m) => `${m.team_a} wins` },
  { value: 'team_b', label: (m) => `${m.team_b} wins` },
  { value: 'draw', label: 'Draw' },
];

function resultBadge(match) {
  if (!match.result) return <span className="text-xs text-gray-400">Pending</span>;
  const label =
    match.result === 'team_a' ? match.team_a
    : match.result === 'team_b' ? match.team_b
    : 'Draw';
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      {label}
    </span>
  );
}

// Mirrors the server gameScope fallback: explicit selection, else the active
// (open/locked) game, else the most recent.
function resolveScopedGame(games) {
  const selected = sessionStorage.getItem('admin_game_id');
  if (selected) return games.find((g) => String(g.id) === String(selected)) ?? null;
  return games.find((g) => g.status === 'open' || g.status === 'locked') ?? games[0] ?? null;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState([]);
  const [status, setStatus] = useState(null); // scoped game status
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'add' | { edit: match }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fixtures are editable only before kickoff (draft/open); results may still be
  // recorded once a game is open or locked; a finished game is fully read-only.
  const canEditFixtures = status === 'draft' || status === 'open';
  const canSetResult = status === 'open' || status === 'locked';

  const load = useCallback(async () => {
    try {
      const [{ data }, { data: games }] = await Promise.all([
        api.get('/admin/matches'),
        api.get('/admin/games'),
      ]);
      setMatches(data);
      setStatus(resolveScopedGame(games)?.status ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleResult = async (matchId, value) => {
    try {
      await api.put(`/admin/matches/${matchId}/result`, { result: value || null });
      await load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save result.');
    }
  };

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setError('');
    setModal('add');
  };

  const openEdit = (match) => {
    setForm({
      team_a: match.team_a,
      team_b: match.team_b,
      label: match.label ?? '',
      match_date: match.match_date ? match.match_date.slice(0, 16) : '',
    });
    setError('');
    setModal({ edit: match });
  };

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        team_a: form.team_a.trim(),
        team_b: form.team_b.trim(),
        label: form.label.trim() || null,
        match_date: form.match_date || null,
      };
      if (modal === 'add') {
        await api.post('/admin/matches', payload);
      } else {
        await api.put(`/admin/matches/${modal.edit.id}`, payload);
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
      await api.delete(`/admin/matches/${deleteTarget.id}`);
      await load();
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Matches</h2>
          <p className="text-sm text-gray-500">
            {matches.length} {matches.length === 1 ? 'match' : 'matches'} added
          </p>
        </div>
        {canEditFixtures && (
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-green-700 hover:bg-green-800 disabled:bg-gray-300
              text-white text-sm font-medium rounded-lg transition"
          >
            + Add Match
          </button>
        )}
      </div>

      {status === 'locked' && (
        <div
          data-testid="matches-locked-banner"
          className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3"
        >
          🔒 The game has started — fixtures are locked. You can still record results below.
        </div>
      )}
      {status === 'finished' && (
        <div
          data-testid="matches-finished-banner"
          className="mb-4 text-sm text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-4 py-3"
        >
          🔒 This game is finished — matches are read-only.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-sm">No matches yet. Add the first one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Match</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Label</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Result</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {matches.map((m, i) => (
                <tr key={m.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {m.team_a} <span className="text-gray-400 font-normal">vs</span> {m.team_b}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{m.label ?? '—'}</td>
                  <td className="px-4 py-3">
                    {canSetResult ? (
                      <select
                        value={m.result ?? ''}
                        onChange={(e) => handleResult(m.id, e.target.value)}
                        data-testid={`result-${m.id}`}
                        className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
                      >
                        {RESULT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {typeof opt.label === 'function' ? opt.label(m) : opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      resultBadge(m)
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canEditFixtures ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(m)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(m)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-300">locked</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal
          title={modal === 'add' ? 'Add Match' : 'Edit Match'}
          onClose={() => setModal(null)}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team A *</label>
                <input
                  name="team_a"
                  value={form.team_a}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Brazil"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team B *</label>
                <input
                  name="team_b"
                  value={form.team_b}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Argentina"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
              <input
                name="label"
                value={form.label}
                onChange={handleChange}
                placeholder="e.g. Group A – Match 1"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Match Date</label>
              <input
                type="datetime-local"
                name="match_date"
                value={form.match_date}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete "${deleteTarget.team_a} vs ${deleteTarget.team_b}"? All predictions for this match will also be removed.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AdminLayout>
  );
}
