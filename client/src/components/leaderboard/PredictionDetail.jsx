import { useState, useEffect } from 'react';
import api from '../../services/api.js';

const LABEL_MAP = { team_a: (p) => p.team_a, team_b: (p) => p.team_b, draw: () => 'Draw' };

function predictionLabel(prediction, row) {
  if (!prediction) return null;
  return LABEL_MAP[prediction]?.(row) ?? prediction;
}

function resultLabel(result, row) {
  if (!result) return null;
  return LABEL_MAP[result]?.(row) ?? result;
}

function StatusBadge({ prediction, matchResult }) {
  if (!matchResult) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">
        Pending
      </span>
    );
  }
  if (!prediction) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-400">
        No pick
      </span>
    );
  }
  const correct = prediction === matchResult;
  return correct ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">
      ✓ Correct
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600 font-medium">
      ✗ Wrong
    </span>
  );
}

function BracketDetail({ stages }) {
  if (!stages.length) {
    return <p className="text-xs text-gray-400 py-1">No stages available yet.</p>;
  }
  return (
    <div className="space-y-2">
      {stages.map((s) => (
        <div key={s.id}>
          <p className="text-[11px] font-semibold text-green-700 mb-1">{s.name}</p>
          {s.teams.length === 0 ? (
            <p className="text-xs text-gray-300 italic px-1">No picks</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {s.teams.map((t) => (
                <span
                  key={t.id}
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    t.is_winner ? 'bg-green-200 text-green-800 font-medium' : 'bg-white text-gray-700'
                  }`}
                >
                  {t.is_winner ? '✓ ' : ''}
                  {t.name}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PredictionDetail({ userId, displayName }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/leaderboard/${userId}/predictions`)
      .then(({ data }) => setData(data))
      .finally(() => setLoading(false));
  }, [userId]);

  const isBracketDetail = data && !Array.isArray(data) && data.bracket;
  const predictions = Array.isArray(data) ? data : [];

  return (
    <tr>
      <td colSpan={3} className="bg-green-50 border-b border-green-100 px-4 py-3">
        <p className="text-xs font-semibold text-green-700 mb-2">
          {displayName}'s Predictions
        </p>

        {loading ? (
          <div className="space-y-1.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-7 bg-green-100 rounded animate-pulse" />
            ))}
          </div>
        ) : isBracketDetail ? (
          <BracketDetail stages={data.stages} />
        ) : predictions.length === 0 ? (
          <p className="text-xs text-gray-400 py-1">No matches available yet.</p>
        ) : (
          <div className="space-y-1.5">
            {predictions.map((p) => (
              <div
                key={p.match_id}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs
                  ${p.prediction && p.match_result && p.prediction === p.match_result
                    ? 'bg-green-100'
                    : p.prediction && p.match_result
                    ? 'bg-red-50'
                    : 'bg-white'}
                `}
              >
                <span className="text-gray-700 font-medium truncate max-w-[140px] sm:max-w-none">
                  {p.match_label}
                </span>
                <div className="flex items-center gap-2 ml-2 shrink-0">
                  <span className="text-gray-500">
                    {predictionLabel(p.prediction, p) ?? (
                      <span className="text-gray-300 italic">No pick</span>
                    )}
                  </span>
                  {p.match_result && (
                    <span className="text-gray-400 text-[10px]">
                      → {resultLabel(p.match_result, p)}
                    </span>
                  )}
                  <StatusBadge prediction={p.prediction} matchResult={p.match_result} />
                </div>
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}
