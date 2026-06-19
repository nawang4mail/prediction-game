import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EntryProvider } from './context/EntryContext.jsx'
import PublicLayout from './components/layout/PublicLayout.jsx'
import LeaderboardPage from './pages/LeaderboardPage.jsx'
import GamesPage from './pages/GamesPage.jsx'
import JoinPage from './pages/JoinPage.jsx'
import PredictionPage from './pages/PredictionPage.jsx'
import AdminLayout from './components/layout/AdminLayout.jsx'
import AdminLoginPage from './pages/admin/AdminLoginPage.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminGamesPage from './pages/admin/AdminGamesPage.jsx'
import AdminMatchesPage from './pages/admin/AdminMatchesPage.jsx'
import AdminBracketPage from './pages/admin/AdminBracketPage.jsx'
import AdminUsersPage from './pages/admin/AdminUsersPage.jsx'
import AdminSettingsPage from './pages/admin/AdminSettingsPage.jsx'
import AdminPredictionsPage from './pages/admin/AdminPredictionsPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <EntryProvider>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route index element={<Navigate to="/leaderboard" replace />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/games" element={<GamesPage />} />
            <Route path="/games/:id/join" element={<JoinPage />} />
            <Route path="/prediction" element={<PredictionPage />} />
          </Route>

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="games" element={<AdminGamesPage />} />
            <Route path="matches" element={<AdminMatchesPage />} />
            <Route path="bracket" element={<AdminBracketPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
            <Route path="predictions" element={<AdminPredictionsPage />} />
          </Route>
        </Routes>
      </EntryProvider>
    </BrowserRouter>
  )
}
