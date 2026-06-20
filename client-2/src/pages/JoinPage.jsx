import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import { upsertEntry } from '../services/entries.js'
import { useEntryStatus } from '../context/EntryContext.jsx'

export default function JoinPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { reload } = useEntryStatus()
  const [game, setGame] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Load game info
    api.get('/games').then(({ data }) => {
      const g = data.find((g) => String(g.id) === String(id))
      setGame(g ?? null)
    }).catch(() => {})
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Display name is required.'); return }
    if (name.trim().length > 50) { setError('Name must be 50 characters or less.'); return }
    setSubmitting(true)
    try {
      const { data } = await api.post('/participants', {
        game_id: Number(id),
        display_name: name.trim(),
        phone: phone.trim() || null,
      })
      // Store entry on device
      upsertEntry({
        token: data.entry_token,
        name: data.participant?.display_name ?? name.trim(),
        game_id: Number(id),
        is_self: true,
        status: data.participant?.status ?? 'declined',
      })
      reload()
      navigate(`/my-game?game=${id}`, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
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
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {submitting ? 'Joining…' : 'Join Game'}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed">
            After submitting, your entry will be reviewed by the organizer before you can make predictions.
          </p>
        </div>
      </div>
    </div>
  )
}
