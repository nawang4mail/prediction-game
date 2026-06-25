// Design-system bundle entry for /design-sync (claude.ai/design).
//
// This app has no library build, so the sync needs a single side-effect-free
// module that re-exports the components to expose on window.PredictionGameDS.
// We deliberately DO NOT import main.jsx/App.jsx (they call createRoot().render
// at module load, which would throw in the preview sandbox).
//
// PreviewProvider supplies the router context the layout/page components read;
// it is wired as cfg.provider so every preview card renders inside it.
import { MemoryRouter } from 'react-router-dom'

// Reusable components
export { default as TeamLabel, TeamIcon, TeamName } from './src/components/TeamLabel.jsx'
export { default as TeamSelect } from './src/components/TeamSelect.jsx'
export { default as TeamMultiSelect } from './src/components/TeamMultiSelect.jsx'

// Layout
export { default as Navbar } from './src/components/layout/Navbar.jsx'
export { default as PublicLayout } from './src/components/layout/PublicLayout.jsx'
export { default as AdminLayout } from './src/components/layout/AdminLayout.jsx'

// Public pages
export { default as LeaderboardPage } from './src/pages/LeaderboardPage.jsx'
export { default as GamesPage } from './src/pages/GamesPage.jsx'
export { default as JoinPage } from './src/pages/JoinPage.jsx'
export { default as PlayPage } from './src/pages/PlayPage.jsx'
export { default as PredictionPage } from './src/pages/PredictionPage.jsx'
export { default as MatchesPage } from './src/pages/MatchesPage.jsx'

// Admin pages
export { default as AdminLoginPage } from './src/pages/admin/AdminLoginPage.jsx'
export { default as AdminDashboard } from './src/pages/admin/AdminDashboard.jsx'
export { default as AdminGamesPage } from './src/pages/admin/AdminGamesPage.jsx'
export { default as AdminMatchesPage } from './src/pages/admin/AdminMatchesPage.jsx'
export { default as AdminBracketPage } from './src/pages/admin/AdminBracketPage.jsx'
export { default as AdminUsersPage } from './src/pages/admin/AdminUsersPage.jsx'
export { default as AdminSettingsPage } from './src/pages/admin/AdminSettingsPage.jsx'
export { default as AdminPredictionsPage } from './src/pages/admin/AdminPredictionsPage.jsx'
export { default as AdminTeamsPage } from './src/pages/admin/AdminTeamsPage.jsx'

// Preview-only wrapper: supplies router context to cards. Not a component card.
export function PreviewProvider({ children }) {
  return <MemoryRouter>{children}</MemoryRouter>
}
