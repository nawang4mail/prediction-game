// Resolve which game the admin panel is scoped to, mirroring the server's
// gameScope fallback: an explicit selection (sessionStorage), else the active
// (open/locked) game, else the most recent one (newest first, drafts included
// so a draft being prepared is still scoped to).
export function resolveScopedGame(games, selectedId = sessionStorage.getItem('admin_game_id')) {
  if (selectedId) return games.find((g) => String(g.id) === String(selectedId)) ?? null;
  return games.find((g) => g.status === 'open' || g.status === 'locked') ?? games[0] ?? null;
}
