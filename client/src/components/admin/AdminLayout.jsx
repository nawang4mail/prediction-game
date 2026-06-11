import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const navItems = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/matches', label: 'Matches' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/predictions', label: 'Predictions' },
];

export default function AdminLayout({ children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex gap-4">
          {navItems.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/admin'}
              className={({ isActive }) =>
                `text-sm font-medium ${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
        <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-700">
          Logout
        </button>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
