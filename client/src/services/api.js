import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const entryToken = localStorage.getItem('entry_token');
  if (entryToken && (config.url ?? '').startsWith('/participants')) {
    config.headers['x-entry-token'] = entryToken;
  }

  // Admin pages operate on the game selected in the layout dropdown;
  // without a selection the server falls back to the active game.
  const gameId = sessionStorage.getItem('admin_game_id');
  const url = config.url ?? '';
  if (
    gameId &&
    url.startsWith('/admin') &&
    !url.startsWith('/admin/games') &&
    !url.startsWith('/admin/auth')
  ) {
    config.params = { ...config.params, game_id: gameId };
  }
  return config;
});

export default api;
