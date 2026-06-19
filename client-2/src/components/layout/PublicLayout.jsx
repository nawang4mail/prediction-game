import { Outlet } from 'react-router-dom'
import Navbar from './Navbar.jsx'
import { useEntryStatus } from '../../context/EntryContext.jsx'

export default function PublicLayout() {
  const { pendingCount } = useEntryStatus()
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar pendingCount={pendingCount} />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
