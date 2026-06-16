import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import Modal from '../../components/admin/Modal.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import api from '../../services/api.js';
import { useGames } from '../../context/GamesContext.jsx';
import { resolveScopedGame } from '../../utils/scopedGame.js';
import { isBracket } from '../../constants/gameTypes.js';

const EMPTY_FORM = {
  name: '',
  description: '',
  pick_count: 1,
  points_per_correct: 1,
  all_correct_bonus: 0,
  teamsText: '',
  parentIds: [],
};

const parseTeams = (text) =>
  text
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean);

export default function BracketPage() {
  // The scoped game comes from the shared admin games list (US-69).
  const { games } = useGames();
  const game = resolveScopedGame(games);
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'add' | { edit: stage }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [winners, setWinners] = useState({}); // { [stageId]: number[] of winning team ids }

  const status = game?.status ?? null;
  const canEdit = status === 'draft' || status === 'open';
  const canSetResults = status === 'open' || status === 'locked';

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/bracket');
      setStages(data);
      setWinners(
        Object.fromEntries(
          data.map((s) => [s.id, s.teams.filter((t) => t.is_winner).map((t) => t.id)])
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleWinner = (stageId, teamId) => {
    setWinners((prev) => {
      const current = prev[stageId] ?? [];
      const next = current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId];
      return { ...prev, [stageId]: next };
    });
  };

  const saveResults = async (stage) => {
    try {
      await api.put(`/admin/bracket/${stage.id}/results`, { team_ids: winners[stage.id] ?? [] });
      await load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save results');
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setError('');
    setModal('add');
  };

  const openEdit = (stage) => {
    setForm({
      name: stage.name,
      description: stage.description ?? '',
      pick_count: stage.pick_count,
      points_per_correct: stage.points_per_correct,
      all_correct_bonus: stage.all_correct_bonus,
      teamsText: stage.teams.map((t) => t.name).join('\n'),
      parentIds: stage.parent_ids ?? [],
    });
    setError('');
    setModal({ edit: stage });
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: form.name,
      description: form.description,
      pick_count: Number(form.pick_count),
      points_per_correct: Number(form.points_per_correct),
      all_correct_bonus: Number(form.all_correct_bonus),
      teams: parseTeams(form.teamsText),
      parent_ids: form.parentIds,
    };
    try {
      if (modal === 'add') {
        await api.post('/admin/bracket', payload);
      } else {
        await api.put(`/admin/bracket/${modal.edit.id}`, payload);
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to save stage');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/admin/bracket/${deleteTarget.id}`);
      await load();
    } finally {
      setDeleteTarget(null);
    }
  };

  const toggleParent = (id) => {
    setForm((f) => ({
      ...f,
      parentIds: f.parentIds.includes(id)
        ? f.parentIds.filter((x) => x !== id)
        : [...f.parentIds, id],
    }));
  };

  const stageName = (id) => stages.find((s) => s.id === id)?.name ?? `Stage ${id}`;
  const editingId = modal && modal !== 'add' ? modal.edit.id : null;
  const parentCandidates = stages.filter((s) => s.id !== editingId);
  const combined = form.parentIds.length > 0;

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Bracket Stages</h2>
          <p className="text-sm text-gray-500">
            {stages.length} {stages.length === 1 ? 'stage' : 'stages'}
          </p>
        </div>
        {canEdit && isBracket(game?.type) && (
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-lg transition"
          >
            + Add Stage
          </button>
        )}
      </div>

      {!loading && !isBracket(game?.type) && (
        <div
          data-testid="not-bracket-banner"
          className="text-sm text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-4 py-3"
        >
          This game is not a Bracket Prediction game. Stages apply only to Bracket games.
        </div>
      )}

      {isBracket(game?.type) && status === 'locked' && (
        <div
          data-testid="bracket-locked-banner"
          className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3"
        >
          🔒 The game has started — stages are locked.
        </div>
      )}
      {isBracket(game?.type) && status === 'finished' && (
        <div
          data-testid="bracket-finished-banner"
          className="mb-4 text-sm text-gray-600 bg-gray-100 border border-gray-200 rounded-lg px-4 py-3"
        >
          🔒 This game is finished — stages are read-only.
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : isBracket(game?.type) && stages.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">🏆</p>
          <p className="text-sm">No stages yet. Add the first one.</p>
        </div>
      ) : (
        isBracket(game?.type) && (
          <div className="space-y-3">
            {stages.map((stage) => (
              <div
                key={stage.id}
                data-testid="stage-card"
                className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-gray-800">{stage.name}</h3>
                    {stage.description && (
                      <p className="text-xs text-gray-600 mt-0.5 italic">{stage.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">
                      Pick {stage.pick_count} of {stage.teams.length} · {stage.points_per_correct} pt
                      {stage.points_per_correct === 1 ? '' : 's'} each
                      {stage.all_correct_bonus > 0
                        ? ` · +${stage.all_correct_bonus} all-correct bonus`
                        : ''}
                    </p>
                    {stage.parent_ids?.length > 0 && (
                      <p className="text-xs text-blue-600 mt-0.5" data-testid="combined-label">
                        🔗 Combined from {stage.parent_ids.map(stageName).join(' + ')}
                      </p>
                    )}
                  </div>
                  {canEdit && (
                    <div className="space-x-3 shrink-0">
                      <button
                        onClick={() => openEdit(stage)}
                        className="text-green-600 hover:text-green-800 text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(stage)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {stage.teams.map((t) => {
                    const isWinner = (winners[stage.id] ?? []).includes(t.id);
                    const cls = isWinner
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700';
                    return canSetResults ? (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => toggleWinner(stage.id, t.id)}
                        className={`px-2 py-0.5 rounded-full text-xs transition ${cls}`}
                      >
                        {isWinner ? '✓ ' : ''}
                        {t.name}
                      </button>
                    ) : (
                      <span key={t.id} className={`px-2 py-0.5 rounded-full text-xs ${cls}`}>
                        {isWinner ? '✓ ' : ''}
                        {t.name}
                      </span>
                    );
                  })}
                </div>
                {canSetResults && (
                  <div className="mt-3">
                    <button
                      onClick={() => saveResults(stage)}
                      className="text-xs font-medium text-green-700 hover:text-green-900"
                    >
                      Save results
                    </button>
                    <span className="text-xs text-gray-400 ml-2">
                      Tap teams that qualified/won, then save.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {modal && (
        <Modal title={modal === 'add' ? 'Add Stage' : 'Edit Stage'} onClose={() => setModal(null)}>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Stage name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Quarter-finalists"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Description (optional)
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Explain this stage to players, e.g. the 8 teams that reach the quarter-finals"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pick count</label>
                <input
                  type="number"
                  min="1"
                  value={form.pick_count}
                  onChange={(e) => setForm({ ...form, pick_count: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pts / correct</label>
                <input
                  type="number"
                  min="1"
                  value={form.points_per_correct}
                  onChange={(e) => setForm({ ...form, points_per_correct: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">All-correct</label>
                <input
                  type="number"
                  min="0"
                  value={form.all_correct_bonus}
                  onChange={(e) => setForm({ ...form, all_correct_bonus: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            {parentCandidates.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Combine from earlier stages (optional)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {parentCandidates.map((s) => {
                    const on = form.parentIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleParent(s.id)}
                        className={`px-2 py-1 rounded-lg text-xs transition ${
                          on ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {on ? '✓ ' : ''}
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {combined ? (
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Teams are inherited from {form.parentIds.map(stageName).join(' + ')}. Each player
                picks from the teams they advanced there.
              </p>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Teams (one per line)
                </label>
                <textarea
                  value={form.teamsText}
                  onChange={(e) => setForm({ ...form, teamsText: e.target.value })}
                  rows={6}
                  placeholder={'Brazil\nArgentina\nFrance\n...'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete stage "${deleteTarget.name}"? This also clears any player picks for it.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AdminLayout>
  );
}
