import Leaderboard from '../components/leaderboard/Leaderboard.jsx';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <h1 className="text-2xl font-bold text-center mb-6">World Cup Predictions</h1>
      <Leaderboard />
    </main>
  );
}
