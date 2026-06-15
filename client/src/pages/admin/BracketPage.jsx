import AdminLayout from '../../components/admin/AdminLayout.jsx';

// US-45 introduces this tab for Bracket Prediction games; stage management is
// built out in US-46. This placeholder keeps the type-aware nav functional.
export default function BracketPage() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-800">Bracket</h2>
        <p className="text-sm text-gray-500">
          Manage the stages of this Bracket Prediction game.
        </p>
      </div>
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🏆</p>
        <p className="text-sm">Stage management is coming soon.</p>
      </div>
    </AdminLayout>
  );
}
