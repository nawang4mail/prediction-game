import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api.js';
import { allTokens } from '../services/entries.js';

// Global warning (US-71): whenever any of this device's entries — across every
// game — is still awaiting admin approval (status 'declined', US-65), this banner
// stays pinned to the top of every public page until none are pending. Re-checks
// on each navigation so it clears once the admin approves.
export default function PendingApprovalBanner() {
  const location = useLocation();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const tokens = allTokens();
    let active = true;
    const result = tokens.length
      ? api
          .post('/participants/statuses', { tokens })
          .then(({ data }) => data.filter((s) => s.status === 'declined').length)
      : Promise.resolve(0);
    result
      .then((n) => active && setPending(n))
      .catch(() => active && setPending(0));
    return () => {
      active = false;
    };
  }, [location.pathname]);

  if (pending === 0) return null;

  return (
    <div
      data-testid="pending-approval-banner"
      className="sticky top-0 z-50 bg-amber-500 text-amber-950 text-sm font-medium text-center px-4 py-2 shadow"
    >
      ⏳ {pending} {pending === 1 ? 'entry is' : 'entries are'} pending admin approval.
    </div>
  );
}
