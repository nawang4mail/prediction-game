import api from './api.js';

// Manages the player's set of entries on this device (US-41). Each entry is
// { token, name, game_id, is_self }. The axios interceptor sends the "current"
// token from localStorage.entry_token, so that key stays the active-entry
// pointer while pg_entries holds the full list.
const LIST_KEY = 'pg_entries';
const CURRENT_KEY = 'entry_token';

export const getEntries = () => {
  try {
    return JSON.parse(localStorage.getItem(LIST_KEY)) || [];
  } catch {
    return [];
  }
};

const saveEntries = (list) => localStorage.setItem(LIST_KEY, JSON.stringify(list));

export const getCurrentToken = () => localStorage.getItem(CURRENT_KEY);

export const setCurrentToken = (token) => {
  if (token) localStorage.setItem(CURRENT_KEY, token);
  else localStorage.removeItem(CURRENT_KEY);
};

export const upsertEntry = (entry) => {
  const list = getEntries().filter((e) => e.token !== entry.token);
  list.push(entry);
  saveEntries(list);
};

// Forgets an entry on this device (US-68). Caller decides the next current token.
export const removeEntry = (token) => {
  saveEntries(getEntries().filter((e) => e.token !== token));
};

export const entriesForGame = (gameId) =>
  getEntries().filter((e) => String(e.game_id) === String(gameId));

// Every entry token tracked on this device, across all games (US-71).
export const allTokens = () => getEntries().map((e) => e.token);

// Computes the next auto-numbered name for a "myself" entry: the base name is
// the player's first self-entry in this game; subsequent ones get " #N".
export const nextSelfName = (gameId) => {
  const selves = entriesForGame(gameId).filter((e) => e.is_self);
  const base = selves[0]?.name ?? '';
  return `${base} #${selves.length + 1}`;
};

// Seeds the list from a pre-US-41 single token, if present and not already
// tracked. Clears the pointer if the token is no longer valid.
export const migrateLegacy = async () => {
  const token = getCurrentToken();
  if (!token || getEntries().some((e) => e.token === token)) return;
  try {
    const { data: me } = await api.get('/participants/me');
    upsertEntry({ token, name: me.participant.display_name, game_id: me.game.id, is_self: true });
  } catch {
    setCurrentToken(null);
  }
};
