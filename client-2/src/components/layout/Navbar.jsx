import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'

const navLinks = [
  { to: '/prediction', label: 'My Prediction' },
  { to: '/games', label: 'Games' },
  { to: '/leaderboard', label: 'Leaderboard' },
]

export default function Navbar({ pendingCount = 0 }) {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 bg-gray-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/leaderboard"
            className="font-oswald text-white text-xl font-bold tracking-widest uppercase z-10"
          >
            ⚽ WC Predict
          </Link>

          {/* Desktop links — absolutely centered */}
          <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-8">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `font-inter text-sm font-semibold uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'text-white border-b-2 border-orange-500 pb-0.5'
                      : 'text-gray-400 hover:text-white'
                  }`
                }
              >
                {label}
                {label === 'My Prediction' && pendingCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center w-2 h-2 rounded-full bg-orange-500" />
                )}
              </NavLink>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-gray-400 hover:text-white p-2"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-6 py-4 text-sm font-semibold uppercase tracking-wider border-b border-gray-700 last:border-0 ${
                  isActive ? 'text-white bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`
              }
            >
              {label}
              {label === 'My Prediction' && pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-2 h-2 rounded-full bg-orange-500" />
              )}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
