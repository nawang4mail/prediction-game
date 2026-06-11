import { useState, useEffect } from 'react';
import api from '../services/api.js';

export function useLeaderboard(pollInterval = 15000) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: rows } = await api.get('/leaderboard');
        setData(rows);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    load();
    const id = setInterval(load, pollInterval);
    return () => clearInterval(id);
  }, [pollInterval]);

  return { data, loading, error };
}
