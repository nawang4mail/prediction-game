import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api.js';
import LeaderboardRow from './LeaderboardRow.jsx';

const POLL_INTERVAL = 15000;

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [lastChanged, setLastChanged] = useState(null);
  const prevDataRef = useRef('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/leaderboard');
      const incoming = JSON.stringify(data);
      if (incoming !== prevDataRef.current) {
        prevDataRef.current = incoming;
        setRows(data);
        setLastChanged(new Date());
      }
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-14 bg-white/10 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <p className="text-red-400 text-sm">Failed to load leaderboard.</p>
        <button
          onClick={load}
          className="mt-3 text-xs text-green-400 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-16">
        <p className="text-4xl mb-4">⚽</p>
        <p className="text-green-300 text-sm">No players yet. Check back soon!</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-green-50 border-b border-green-100">
              <th className="py-3 pl-4 pr-2 text-left text-xs font-semibold text-green-700 uppercase tracking-wider w-12">
                Rank
              </th>
              <th className="py-3 px-2 text-left text-xs font-semibold text-green-700 uppercase tracking-wider">
                Player
              </th>
              <th className="py-3 pl-2 pr-4 text-right text-xs font-semibold text-green-700 uppercase tracking-wider">
                Points
              </th>
            </tr>
          </thead>
          {rows.map((row) => (
            <LeaderboardRow key={row.id} row={row} />
          ))}
        </table>
      </div>

      {lastChanged && (
        <p className="text-center text-green-600 text-xs mt-4">
          Last updated {lastChanged.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          {' · '}live
        </p>
      )}
    </div>
  );
}
