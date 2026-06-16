import { useState, useEffect } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import api from '../../services/api.js';

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color ?? 'text-gray-800'}`}>{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const money = (n) =>
  `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/dashboard')
      .then(({ data }) => setStats(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminLayout>
      <h2 className="text-lg font-semibold text-gray-800 mb-6">Dashboard</h2>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {/* Bracket Prediction games have no matches (US-64). */}
          {stats.matches && (
            <StatCard
              label="Matches"
              value={stats.matches.total}
              sub={`${stats.matches.with_result} result${stats.matches.with_result !== 1 ? 's' : ''} set · ${stats.matches.pending} pending`}
              color="text-green-700"
            />
          )}
          <StatCard
            label="Users"
            value={stats.users}
            sub="on the leaderboard"
          />
          {stats.matches && (
            <StatCard
              label="Predictions"
              value={stats.predictions}
              sub="total picks recorded"
            />
          )}
          <StatCard
            label="Max Points"
            value={stats.matches ? stats.matches.with_result : stats.max_points}
            sub="available to score"
            color="text-blue-600"
          />
        </div>
      )}

      {!loading && stats.finance && (
        <div className="mb-8" data-testid="finance-section">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Prize Pool</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <StatCard
              label="Total Collected"
              value={money(stats.finance.total_collected)}
              sub={`${stats.users} × ${money(stats.finance.entry_cost)} entry`}
              color="text-green-700"
            />
            <StatCard
              label="Commission"
              value={money(stats.finance.commission_amount)}
              sub={`${stats.finance.commission_pct}% of collected`}
              color="text-amber-600"
            />
            <StatCard
              label="Prize Pool"
              value={money(stats.finance.prize_pool)}
              sub="collected − commission"
              color="text-blue-600"
            />
          </div>
          {stats.finance.tiers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Prize</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Share</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.finance.tiers.map((t, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">{t.label}</td>
                      <td className="px-4 py-3 text-right text-gray-500">{t.percentage}%</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">{money(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <h3 className="text-sm font-semibold text-gray-700 mb-3">Top 5 Players</h3>
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : stats.top5.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <p className="text-3xl mb-2">⚽</p>
          <p className="text-sm">No players yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">Rank</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Player</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.top5.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 text-gray-400 font-medium">{r.rank}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.display_name}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-700">{r.total_points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
