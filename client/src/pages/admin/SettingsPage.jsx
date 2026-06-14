import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';

export default function SettingsPage() {
  const [form, setForm] = useState({
    prize_text: '',
    rules_text: '',
    finish_message: '',
    entry_cost: '0',
    commission_pct: '0',
  });
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // 'saved' | 'error'

  useEffect(() => {
    Promise.all([api.get('/admin/settings'), api.get('/admin/prize-tiers')])
      .then(([{ data }, { data: t }]) => {
        setForm({
          prize_text: data.prize_text ?? '',
          rules_text: data.rules_text ?? '',
          finish_message: data.finish_message ?? '',
          entry_cost: data.entry_cost ?? '0',
          commission_pct: data.commission_pct ?? '0',
        });
        setTiers(t.map((tier) => ({ label: tier.label, percentage: String(tier.percentage) })));
      })
      .finally(() => setLoading(false));
  }, []);

  const addTier = () => setTiers((t) => [...t, { label: '', percentage: '' }]);
  const removeTier = (i) => setTiers((t) => t.filter((_, idx) => idx !== i));
  const updateTier = (i, field, value) =>
    setTiers((t) => t.map((tier, idx) => (idx === i ? { ...tier, [field]: value } : tier)));

  const tierTotal = tiers.reduce((sum, t) => sum + (Number(t.percentage) || 0), 0);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await Promise.all([
        api.put('/admin/settings', form),
        api.put('/admin/prize-tiers', {
          tiers: tiers.map((t) => ({ label: t.label, percentage: Number(t.percentage) || 0 })),
        }),
      ]);
      setStatus('saved');
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-xl">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">Settings</h2>
        <p className="text-sm text-gray-500 mb-6">
          Prize and Rules text displayed on the public homepage.
        </p>

        {loading ? (
          <div className="space-y-4">
            <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />
            <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🏆 Prize
              </label>
              <textarea
                value={form.prize_text}
                onChange={(e) => setForm((p) => ({ ...p, prize_text: e.target.value }))}
                rows={4}
                placeholder="e.g. Winner takes the trophy and bragging rights!"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">Leave empty to hide the Prize section.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📋 Rules
              </label>
              <textarea
                value={form.rules_text}
                onChange={(e) => setForm((p) => ({ ...p, rules_text: e.target.value }))}
                rows={7}
                placeholder={"e.g.\n1. Predict each match result: Team A wins, Team B wins, or Draw.\n2. Each correct prediction earns 1 point.\n3. Maximum 10 points possible.\n4. Ties are broken by earliest entry."}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">Leave empty to hide the Rules section.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ✓ Finish Message
              </label>
              <textarea
                value={form.finish_message}
                onChange={(e) => setForm((p) => ({ ...p, finish_message: e.target.value }))}
                rows={2}
                placeholder="e.g. Game set — your predictions are saved. Good luck!"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
              />
              <p className="text-xs text-gray-400 mt-1">
                Shown to players when they tap Finish. Leave empty to use the default message.
              </p>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-1">💰 Prize Pool</h3>
              <p className="text-xs text-gray-400 mb-4">
                The prize pool is the total collected minus commission. Each tier takes a
                percentage of that pool.
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Entry cost per player ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.entry_cost}
                    onChange={(e) => setForm((p) => ({ ...p, entry_cost: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Commission (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={form.commission_pct}
                    onChange={(e) => setForm((p) => ({ ...p, commission_pct: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {tiers.map((tier, i) => (
                  <div key={i} className="flex gap-2 items-center" data-testid={`tier-row-${i}`}>
                    <input
                      value={tier.label}
                      onChange={(e) => updateTier(i, 'label', e.target.value)}
                      placeholder={`Prize ${i + 1} (e.g. 1st Prize)`}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <div className="relative w-28">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={tier.percentage}
                        onChange={(e) => updateTier(i, 'percentage', e.target.value)}
                        placeholder="%"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-7 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">%</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeTier(i)}
                      className="text-red-500 hover:text-red-700 text-sm px-2"
                      aria-label="Remove tier"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-3">
                <button
                  type="button"
                  onClick={addTier}
                  className="text-sm text-green-700 hover:text-green-900 font-medium"
                >
                  + Add prize tier
                </button>
                <span
                  data-testid="tier-total"
                  className={`text-xs font-medium ${tierTotal > 100 ? 'text-red-600' : 'text-gray-500'}`}
                >
                  Tiers total: {tierTotal}%
                </span>
              </div>
              {tierTotal > 100 && (
                <p className="text-xs text-red-600 mt-1">
                  Tier percentages add up to more than 100% of the prize pool.
                </p>
              )}
            </div>

            {status === 'saved' && (
              <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                ✓ Settings saved successfully.
              </p>
            )}
            {status === 'error' && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                Failed to save. Please try again.
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white text-sm font-medium rounded-lg transition"
            >
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
