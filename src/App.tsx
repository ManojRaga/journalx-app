import { Outlet } from 'react-router-dom'

import { Nav } from './components/layout/Nav'
import { AppDataProvider } from './shared/context/AppDataProvider'
import { ToasterProvider } from './shared/components/ToasterProvider'

export function AppLayout() {
  return (
    <AppDataProvider>
      <div className="flex h-full bg-gradient-to-br from-midnight via-onyx to-black text-pearl">
        <Nav />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
      <ToasterProvider />
    </AppDataProvider>
  )
}
