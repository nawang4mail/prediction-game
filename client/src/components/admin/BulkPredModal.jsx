import { useState, useEffect } from 'react';
import Modal from './Modal.jsx';
import api from '../../services/api.js';

const CODE_MAP = { '1': 'team_a', '2': 'team_b', '3': 'draw', '-': null };
const PRED_LABEL = {
  team_a: (m) => m.team_a,
  team_b: (m) => m.team_b,
  draw: () => 'Draw',
};

function parseLine(line, matches) {
  const parts = line.trim().split(/\s+/);
  const name = parts[0] ?? '';
  const codes = parts.slice(1);
  const predictions = {};
  let error = null;

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    if (!Object.prototype.hasOwnProperty.call(CODE_MAP, code)) {
      error = `Invalid code "${code}" — use 1, 2, 3, or -`;
      break;
    }
    if (i < matches.length) {
      predictions[matches[i].id] = CODE_MAP[code];
    }
  }

  if (!name) error = 'Name is required';
  return { name, predictions, error };
}

export default function BulkPredModal({ onClose, onDone }) {
  const [step, setStep] = useState('input'); // 'input' | 'preview' | 'result'
  const [text, setText] = useState('');
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [preview, setPreview] = useState([]);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/matches')
      .then(({ data }) => setMatches(data))
      .finally(() => setLoadingMatches(false));
  }, []);

  const handlePreview = () => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setPreview(lines.map((l) => parseLine(l, matches)));
    setStep('preview');
  };

  const hasErrors = preview.some((r) => r.error);
  const validCount = preview.filter((r) => !r.error).length;

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const entries = preview
        .filter((r) => !r.error)
        .map((r) => ({ name: r.name, predictions: r.predictions }));
      const { data } = await api.post('/admin/users/bulk-with-predictions', { entries });
      setResult(data);
      setStep('result');
      onDone();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const shortLabel = (m) =>
    m.label ? m.label.split('–')[0].trim() : `${m.team_a} v ${m.team_b}`;

  return (
    <Modal title="Bulk Add with Predictions" onClose={onClose}>
      {/* ── Step 1: Input ── */}
      {step === 'input' && (
        <div className="space-y-4">
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
            <p className="font-semibold text-gray-700">Format: <code className="bg-white px-1 rounded border">Name 1 2 3 - 1 …</code></p>
            <p>One user per line. Prediction codes per match in order:</p>
            <p><code className="font-mono">1</code> = Team A wins &nbsp;·&nbsp; <code className="font-mono">2</code> = Team B wins &nbsp;·&nbsp; <code className="font-mono">3</code> = Draw &nbsp;·&nbsp; <code className="font-mono">-</code> = no pick</p>
          </div>

          {loadingMatches ? (
            <div className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ) : matches.length === 0 ? (
            <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">No matches added yet. Add matches first.</p>
          ) : (
            <div className="text-xs text-gray-500 space-y-0.5">
              <p className="font-semibold text-gray-600 mb-1">Match order:</p>
              {matches.map((m, i) => (
                <p key={m.id}>
                  <span className="font-mono text-green-700 w-4 inline-block">{i + 1}</span>
                  {' '}→ {m.team_a} vs {m.team_b}
                  {m.label ? ` (${m.label})` : ''}
                </p>
              ))}
            </div>
          )}

          <textarea
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder={'Alice 1 2 3 - 1\nBob 2 1 - 3 2\nCharlie 3 - 1 2 -'}
            className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500 resize-y"
          />

          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={handlePreview}
              disabled={!text.trim() || matches.length === 0}
              className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white rounded-lg"
            >
              Preview →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Preview ── */}
      {step === 'preview' && (
        <div className="space-y-4">
          {hasErrors && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              Fix the highlighted errors before submitting.
            </p>
          )}

          <div className="overflow-x-auto rounded-xl border border-gray-200 max-h-72 overflow-y-auto">
            <table className="text-xs min-w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-500 border-b">Name</th>
                  {matches.map((m) => (
                    <th key={m.id} className="px-2 py-2 font-semibold text-gray-500 border-b text-center min-w-[60px]" title={`${m.team_a} vs ${m.team_b}`}>
                      {shortLabel(m)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.map((row, i) => (
                  <tr key={i} className={row.error ? 'bg-red-50' : 'bg-white'}>
                    <td className="px-3 py-2 font-medium">
                      {row.name || <span className="text-red-400 italic">empty</span>}
                      {row.error && (
                        <span className="block text-red-500 font-normal">{row.error}</span>
                      )}
                    </td>
                    {matches.map((m) => {
                      const pred = row.predictions[m.id];
                      return (
                        <td key={m.id} className="px-2 py-2 text-center text-gray-600">
                          {pred ? (PRED_LABEL[pred]?.(m) ?? pred) : <span className="text-gray-300">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex justify-between items-center">
            <button type="button" onClick={() => setStep('input')} className="text-sm text-gray-500 hover:text-gray-700">
              ← Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={hasErrors || saving}
              className="px-4 py-2 text-sm bg-green-700 hover:bg-green-800 disabled:bg-gray-300 text-white rounded-lg"
            >
              {saving ? 'Adding…' : `Add ${validCount} user${validCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Result ── */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="text-sm rounded-lg border px-4 py-3 space-y-1 bg-green-50 border-green-200">
            <p className="font-semibold text-green-700">
              ✓ Added {result.added.length} user{result.added.length !== 1 ? 's' : ''} with predictions.
            </p>
            {result.skipped.length > 0 && (
              <p className="text-amber-600 text-xs">
                Skipped {result.skipped.length} duplicate{result.skipped.length !== 1 ? 's' : ''}:{' '}
                {result.skipped.map((s) => s.display_name).join(', ')}
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800">
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
