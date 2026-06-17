import { Outlet } from 'react-router-dom';
import PendingApprovalBanner from './PendingApprovalBanner.jsx';

// Wraps the public pages so the pending-approval banner (US-71) renders once,
// above every public page, instead of only inside My Predictions.
export default function PublicLayout() {
  return (
    <>
      <PendingApprovalBanner />
      <Outlet />
    </>
  );
}
