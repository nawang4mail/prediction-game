import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const GamesContext = createContext(null);

// One shared admin games list for the whole admin panel. The layout's tabs and
// every admin page read the same list, so a mutation (e.g. creating the first
// game) updates the tabs immediately — no page reload needed (US-69).
export function GamesProvider({ children }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(
    () =>
      api.get('/admin/games').then(({ data }) => {
        setGames(data);
        return data;
      }),
    []
  );

  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);

  return (
    <GamesContext.Provider value={{ games, loading, refresh }}>
      {children}
    </GamesContext.Provider>
  );
}

export const useGames = () => useContext(GamesContext);
