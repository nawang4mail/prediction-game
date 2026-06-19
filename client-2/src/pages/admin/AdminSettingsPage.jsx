import { useState, useEffect } from 'react'
import api from '../../services/api.js'
import { useAdminGame } from '../../context/AdminGameContext.jsx'

export default function AdminSettingsPage() {
  const { selectedId } = useAdminGame()
  const [settings, setSettings] = useState({ prize_text: '', rules_text: '', finish_message: '', entry_cost: '', commission_pct: '' })
  const [tiers, setTiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tierSaving, setTierSaving] = useState(false)

  useEffect(() => {
    if (!selectedId) return
    setLoading(true)
    Promise.all([
      api.get('/admin/settings'),
      api.get('/admin/prize-tiers'),
    ]).then(([s, t]) => {
      setSettings({
        prize_text: s.data.prize_text ?? '',
        rules_text: s.data.rules_text ?? '',
        finish_message: s.data.finish_message ?? '',
        entry_cost: s.data.entry_cost ?? '',
        commission_pct: s.data.commission_pct ?? '',
      })
      setTiers(t.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [selectedId])

  const saveSettings = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/admin/settings', settings)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
    finally { setSaving(false) }
  }

  const addTier = () => setTiers((prev) => [...prev, { label: '', percentage: '' }])
  const removeTier = (i) => setTiers((prev) => prev.filter((_, idx) => idx !== i))
  const updateTier = (i, field, val) => setTiers((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t))

  const saveTiers = async () => {
    setTierSaving(true)
    try {
      await api.put('/admin/prize-tiers', { tiers })
    } catch (err) { alert(err.response?.data?.message ?? 'Failed.') }
    finally { setTierSaving(false) }
  }

  const total = tiers.reduce((s, t) => s + Number(t.percentage || 0), 0)

  if (loading) return <div className="h-64 bg-white rounded-2xl animate-pulse shadow-sm" />

  return (
    <div className="space-y-6 max-w-2xl">
      <h2 className="font-oswald text-2xl font-bold text-gray-900 uppercase tracking-wide">Settings</h2>

      <form onSubmit={saveSettings} className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Game Settings</h3>

        {[
          { key: 'prize_text', label: 'Prize Text', rows: 3 },
          { key: 'rules_text', label: 'Rules Text', rows: 3 },
          { key: 'finish_message', label: 'Finish Message', rows: 2 },
        ].map(({ key, label, rows }) => (
          <div key={key}>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
            <textarea
              value={settings[key]}
              onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
              rows={rows}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400 resize-none"
            />
          </div>
        ))}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Entry Cost</label>
            <input type="number" min={0} step="0.01" value={settings.entry_cost} onChange={(e) => setSettings({ ...settings, entry_cost: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Commission %</label>
            <input type="number" min={0} max={100} step="0.1" value={settings.commission_pct} onChange={(e) => setSettings({ ...settings, commission_pct: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" placeholder="0" />
          </div>
        </div>

        <button type="submit" disabled={saving} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors">
          {saved ? '✓ Saved' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>

      {/* Prize Tiers */}
      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-gray-900 flex-1">Prize Tiers</h3>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${total === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            Total: {total}%
          </span>
        </div>
        {total !== 100 && tiers.length > 0 && (
          <p className="text-xs text-red-600">Tiers must sum to 100%</p>
        )}
        <div className="space-y-2">
          {tiers.map((t, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input value={t.label} onChange={(e) => updateTier(i, 'label', e.target.value)} placeholder="1st Prize" className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
              <input type="number" min={0} max={100} value={t.percentage} onChange={(e) => updateTier(i, 'percentage', e.target.value)} placeholder="%" className="w-20 px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-blue-400" />
              <button onClick={() => removeTier(i)} className="text-gray-400 hover:text-red-500 text-lg font-bold transition-colors">×</button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={addTier} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors">+ Add Tier</button>
          <button onClick={saveTiers} disabled={tierSaving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl disabled:opacity-60 transition-colors">
            {tierSaving ? 'Saving…' : 'Save Tiers'}
          </button>
        </div>
      </div>
    </div>
  )
}
