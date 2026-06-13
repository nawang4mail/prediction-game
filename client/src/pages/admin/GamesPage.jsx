import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import ConfirmDialog from '../../components/admin/ConfirmDialog.jsx';
import api from '../../services/api.js';

const STATUS_STYLES = {
  open: 'bg-green-100 text-green-700',
  locked: 'bg-amber-100 text-amber-700',
  finished: 'bg-gray-200 text-gray-600',
};

export default function GamesPage() {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [confirm, setConfirm] = useState(null); // { game, status, message }

  const load = async () => {
    const { data } = await api.get('/admin/games');
    setGames(data);
  };

  useEffect(() => {
    api.get('/admin/games')
      .then(({ data }) => setGames(data))
      .finally(() => setLoading(false));
  }, []);

  const hasActive = games.some((g) => g.status !== 'finished');

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post('/admin/games', { name });
      setName('');
      await load();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Failed to create game');
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

  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Games</h2>
        <p className="text-sm text-gray-500">
          One game can be active (open or locked) at a time. Finished games keep their full
          history.
        </p>
      </div>

      <form onSubmit={handleCreate} className="flex gap-3 mb-6 max-w-md">
        <input
          name="game_name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New game name, e.g. World Cup 2026"
          required
          disabled={hasActive}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={hasActive}
          className="px-4 py-2 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition"
        >
          + New Game
        </button>
      </form>
      {hasActive && (
        <p className="text-xs text-gray-400 -mt-4 mb-6">
          Finish the current game to create a new one.
        </p>
      )}

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
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
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
          confirmLabel={confirm.status === 'finished' ? 'Finish' : 'Start'}
          onConfirm={async () => {
            await changeStatus(confirm.game, confirm.status);
            setConfirm(null);
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </AdminLayout>
  );
}
