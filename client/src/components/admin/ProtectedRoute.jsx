import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { GamesProvider } from '../../context/GamesContext.jsx';

export default function ProtectedRoute() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/admin/login" replace />;
  return (
    <GamesProvider>
      <Outlet />
    </GamesProvider>
  );
}
