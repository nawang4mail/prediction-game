import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import api from '../../services/api.js';
import { GAME_TYPES, gameTypeLabel } from '../../constants/gameTypes.js';

const STATUS_STYLES = {
  draft: 'bg-blue-100 text-blue-700',
  open: 'bg-green-100 text-green-700',
  locked: 'bg-amber-100 text-amber-700',
  finished: 'bg-gray-200 text-gray-600',
};

export default function GamesPage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [type, setType] = useState('guess_winners');
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null); // { game, status, message } — status change
  const [deleteTarget, setDeleteTarget] = useState(null); // draft to delete

  const load = async () => {
    const { data } = await api.get('/admin/games');
    setGames(data);
  };

  useEffect(() => {
    api.get('/admin/games')
      .then(({ data }) => setGames(data))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/admin/games', { name, type });
      setName('');
      setType('guess_winners');
      await load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to create game');
    }
  };

  // The type is fixed once a game leaves draft, so this only fires for drafts.
  const changeType = async (game, nextType) => {
    setError(null);
    try {
      await api.put(`/admin/games/${game.id}/type`, { type: nextType });
      await load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to change game type');
    }
  };

  const changeStatus = async (game, status) => {
    setError(null);
    try {
      await api.put(`/admin/games/${game.id}/status`, { status });
      await load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to update game');
    }
  };

  const handleDelete = async () => {
    setError(null);
    try {
      await api.delete(`/admin/games/${deleteTarget.id}`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to delete game');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Games</h2>
        <p className="text-sm text-gray-500">
          New games start as a draft you can prepare anytime. You can open as many
          games as you like — several can run at once; finished games keep their full
          history.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex flex-wrap gap-3 mb-6 max-w-2xl">
        <input
          name="game_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New game name, e.g. World Cup 2026"
          required
          className="flex-1 min-w-[12rem] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          name="game_type"
          aria-label="Game type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {Object.entries(GAME_TYPES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm font-medium rounded-lg transition"
        >
          + New Draft
        </button>
      </form>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 max-w-md">
          {error}
        </p>
      )}

      {loading ? (
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Game</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Created</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {games.map((game) => (
                <tr key={game.id}>
                  <td className="px-4 py-3 font-medium text-gray-800">{game.name}</td>
                  <td className="px-4 py-3">
                    {game.status === 'draft' ? (
                      <select
                        aria-label={`Type for ${game.name}`}
                        value={game.type}
                        onChange={(e) => changeType(game, e.target.value)}
                        className="border border-gray-300 rounded-lg px-2 py-1 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        {Object.entries(GAME_TYPES).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-xs text-gray-600">{gameTypeLabel(game.type)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[game.status]}`}
                    >
                      {game.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(game.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    {game.status === 'draft' && (
                      <>
                        <button
                          onClick={() =>
                            setConfirm({
                              game,
                              status: 'open',
                              message: `Open "${game.name}"? Participants will be able to join and make predictions.`,
                            })
                          }
                          className="text-green-600 hover:text-green-800 text-xs font-medium"
                        >
                          Open
                        </button>
                        <button
                          onClick={() => setDeleteTarget(game)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </>
                    )}
                    {game.status === 'open' && (
                      <button
                        onClick={() =>
                          setConfirm({
                            game,
                            status: 'locked',
                            message: `Start "${game.name}"? Participants can no longer join or change predictions.`,
                          })
                        }
                        className="text-amber-600 hover:text-amber-800 text-xs font-medium"
                      >
                        Start (lock)
                      </button>
                    )}
                    {game.status === 'locked' && (
                      <>
                        <button
                          onClick={() => changeStatus(game, 'open')}
                          className="text-green-600 hover:text-green-800 text-xs font-medium"
                        >
                          Reopen
                        </button>
                        <button
                          onClick={() =>
                            setConfirm({
                              game,
                              status: 'finished',
                              message: `Finish "${game.name}"? Its leaderboard becomes final and read-only. This cannot be undone.`,
                            })
                          }
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Finish
                        </button>
                      </>
                    )}
                    {game.status === 'finished' && (
                      <span className="text-xs text-gray-400">archived</span>
                    )}
                  </td>
                </tr>
              ))}
              {games.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    No games yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          message={confirm.message}
          confirmLabel={
            confirm.status === 'finished' ? 'Finish' : confirm.status === 'open' ? 'Open' : 'Start'
          }
          onConfirm={async () => {
            await changeStatus(confirm.game, confirm.status);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          message={`Delete draft "${deleteTarget.name}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </AdminLayout>
  );
}
