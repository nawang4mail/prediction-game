import { useState } from 'react';
import PredictionDetail from './PredictionDetail.jsx';

export default function LeaderboardRow({ row }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        className="border-b hover:bg-gray-50 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <td className="py-3 text-gray-400">{row.rank}</td>
        <td className="py-3 font-medium">{row.display_name}</td>
        <td className="py-3 text-right font-bold">{row.total_points}</td>
      </tr>
      {open && <PredictionDetail userId={row.id} />}
    </>
  );
}
