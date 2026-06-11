import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const navItems = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/matches', label: 'Matches' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/predictions', label: 'Predictions' },
  { to: '/admin/settings', label: 'Settings' },
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
      <nav className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <span className="text-green-700 font-bold text-sm shrink-0">⚽ Admin</span>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/admin'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition
                  ${isActive
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
          <button
            onClick={handleLogout}
            className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0 transition"
          >
            Logout
          </button>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
