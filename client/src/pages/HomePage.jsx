import { Link } from 'react-router-dom';
import Leaderboard from '../components/leaderboard/Leaderboard.jsx';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-800 to-green-950">
      <header className="px-4 pt-10 pb-8 text-center">
        <div className="text-5xl mb-3">🏆</div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          World Cup 2026
        </h1>
        <p className="text-green-300 mt-1 text-sm">Prediction Leaderboard</p>
      </header>

      <main className="px-4 pb-16">
        <Leaderboard />
      </main>

      <footer className="fixed bottom-4 right-4">
        <Link
          to="/admin/login"
          className="text-xs text-green-600 hover:text-green-400 transition-colors"
        >
          Admin
        </Link>
      </footer>
    </div>
  );
}
