import { useState } from 'react'
import { NavLink } from 'react-router-dom'

const navLinks = [
  { to: '/my-game', label: 'My Game' },
  { to: '/leagues', label: 'Leagues' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/matches', label: 'Matches' },
]

export default function Navbar({ pendingCount = 0 }) {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 shadow-lg" style={{ backgroundColor: '#0b0b0d' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left: logo + desktop nav links */}
          <div className="flex items-center gap-8 pt-4">
            <NavLink to="/leaderboard" className="shrink-0 pb-3" aria-label="MATKA home">
              <span className="logo-matka text-3xl sm:text-4xl uppercase leading-none">MATKA</span>
            </NavLink>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-end gap-6 h-full">
              {navLinks.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `text-sm uppercase tracking-wide font-semibold transition-all pb-3 border-b-4 ${
                      isActive
                        ? 'text-white border-white font-bold'
                        : 'text-gray-400 border-transparent hover:text-white hover:border-white/50'
                    }`
                  }
                >
                  {label}
                  {label === 'My Game' && pendingCount > 0 && (
                    <span className="ml-1.5 inline-flex items-center justify-center w-2 h-2 rounded-full bg-[#f05a00]" />
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center pb-2">
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
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden bg-gray-900 border-t border-gray-800">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-6 py-4 text-sm font-semibold uppercase tracking-wider border-b border-gray-800 last:border-0 ${
                  isActive ? 'text-white bg-gray-800' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              {label}
              {label === 'My Game' && pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center w-2 h-2 rounded-full bg-[#f05a00]" />
              )}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  )
}
