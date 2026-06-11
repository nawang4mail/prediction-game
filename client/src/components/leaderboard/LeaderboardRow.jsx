import { useState } from 'react';
import PredictionDetail from './PredictionDetail.jsx';

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };

const rankStyle = {
  1: 'text-yellow-500 font-bold',
  2: 'text-gray-400 font-bold',
  3: 'text-amber-600 font-bold',
};

export default function LeaderboardRow({ row }) {
  const [open, setOpen] = useState(false);

  const isTop3 = row.rank <= 3;

  return (
    <tbody
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <tr
        className={`border-b border-gray-100 cursor-pointer transition-colors
          ${open ? 'bg-green-50' : 'hover:bg-gray-50'}
          ${row.rank === 1 ? 'bg-yellow-50/40' : ''}
        `}
        onClick={() => setOpen((v) => !v)}
      >
        <td className="py-4 pl-4 pr-2 w-12">
          <span className={`text-sm ${rankStyle[row.rank] ?? 'text-gray-400'}`}>
            {MEDAL[row.rank] ?? row.rank}
          </span>
        </td>
        <td className="py-4 px-2">
          <span className={`text-sm ${isTop3 ? 'font-semibold text-gray-800' : 'text-gray-700'}`}>
            {row.display_name}
          </span>
        </td>
        <td className="py-4 pl-2 pr-4 text-right">
          <span className={`text-sm font-bold tabular-nums
            ${row.rank === 1 ? 'text-yellow-600' : 'text-gray-800'}
          `}>
            {row.total_points}
            <span className="text-xs font-normal text-gray-400 ml-0.5">pts</span>
          </span>
          <span className="ml-2 text-gray-300 text-xs">{open ? '▲' : '▼'}</span>
        </td>
      </tr>
      {open && <PredictionDetail userId={row.id} displayName={row.display_name} />}
    </tbody>
  );
}
