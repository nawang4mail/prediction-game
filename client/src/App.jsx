import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/admin/ProtectedRoute.jsx';

import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/admin/LoginPage.jsx';
import DashboardPage from './pages/admin/DashboardPage.jsx';
import GamesPage from './pages/admin/GamesPage.jsx';
import MatchesPage from './pages/admin/MatchesPage.jsx';
import UsersPage from './pages/admin/UsersPage.jsx';
import PredictionsPage from './pages/admin/PredictionsPage.jsx';
import SettingsPage from './pages/admin/SettingsPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/admin/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/admin/games" element={<GamesPage />} />
            <Route path="/admin/matches" element={<MatchesPage />} />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/predictions" element={<PredictionsPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
