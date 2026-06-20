import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'

export default function JoinPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [game, setGame] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    // Load game info
    api.get('/games').then(({ data }) => {
      const g = data.find((g) => String(g.id) === String(id))
      setGame(g ?? null)
    }).catch(() => {})
  }, [id])

  // Nothing is saved here — we only collect name/phone, then move to the pick
  // page where the player makes their selections and submits. The entry is only
  // written to the database on final submit (US-99).
  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Display name is required.'); return }
    if (name.trim().length > 50) { setError('Name must be 50 characters or less.'); return }
    navigate(`/leagues/${id}/play`, {
      state: { display_name: name.trim(), phone: phone.trim() || null },
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 py-10 px-4">
        <div className="max-w-md mx-auto">
          <Link
            to="/leagues"
            className="inline-flex items-center gap-1.5 text-blue-200 hover:text-white text-sm mb-4 transition-colors"
          >
            ← Back to Leagues
          </Link>
          <h1 className="font-oswald text-4xl font-bold text-white uppercase tracking-wider">
            Join Game
          </h1>
          {game && (
            <p className="text-blue-200 text-sm mt-1 font-inter">{game.name}</p>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="display-name">
                Display Name <span className="text-red-500">*</span>
              </label>
              <input
                id="display-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-inter transition-colors"
              />
              <p className="text-xs text-gray-400 mt-1">{name.length}/50</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5" htmlFor="phone">
                Phone Number <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 234 567 8900"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-inter transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
            >
              Continue to Picks →
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
            Next you'll make your picks. Your entry is only saved when you submit them.
          </p>
        </div>
      </div>
    </div>
  )
}
