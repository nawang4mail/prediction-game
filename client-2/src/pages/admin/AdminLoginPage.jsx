import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api.js'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('admin_token')) navigate('/admin/dashboard', { replace: true })
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username.trim() || !password) { setError('Username and password are required.'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/admin/auth/login', { username, password })
      localStorage.setItem('admin_token', data.token)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.message ?? 'Invalid credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-oswald text-3xl font-bold text-white uppercase tracking-widest">
            ⚽ WC Predict
          </span>
          <p className="text-gray-400 text-sm mt-1">Admin Panel</p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 shadow-xl">
          <h1 className="font-oswald text-xl font-bold text-white uppercase tracking-wide mb-6">
            Sign In
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm transition-colors"
                placeholder="admin"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-sm transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6">
          <a href="/leaderboard" className="text-gray-500 hover:text-gray-300 text-xs transition-colors">
            ← Back to Leaderboard
          </a>
        </p>
      </div>
    </div>
  )
}
