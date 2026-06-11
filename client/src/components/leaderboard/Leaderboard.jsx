import { useState, useEffect } from 'react';
import api from '../../services/api.js';
import LeaderboardRow from './LeaderboardRow.jsx';

const POLL_INTERVAL = 15000;

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const { data } = await api.get('/leaderboard');
      setRows(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, POLL_INTERVAL);
    return () => clearInterval(id);
  }, []);

  if (loading) return <p className="text-center text-gray-400">Loading...</p>;

  return (
    <div className="max-w-lg mx-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="py-2 w-10">#</th>
            <th className="py-2">Player</th>
            <th className="py-2 text-right">Points</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <LeaderboardRow key={row.id} row={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
