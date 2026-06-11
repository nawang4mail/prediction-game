import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';

export default function SettingsPage() {
  const [form, setForm] = useState({ prize_text: '', rules_text: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // 'saved' | 'error'

  useEffect(() => {
    api.get('/admin/settings')
      .then(({ data }) => setForm({ prize_text: data.prize_text ?? '', rules_text: data.rules_text ?? '' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      await api.put('/admin/settings', form);
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
