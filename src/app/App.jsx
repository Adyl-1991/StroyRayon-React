import { Outlet } from 'react-router-dom'
import { Footer } from '../components/layout/Footer'
import { Header } from '../components/layout/Header'
import { MobileNav } from '../components/layout/MobileNav'
import { PwaInstallPrompt } from '../components/pwa/PwaInstallPrompt'

export function App() {
  return (
    <div className="app-shell">
      <Header />
      <Outlet />
      <Footer />
      <MobileNav />
      <PwaInstallPrompt />
    </div>
  )
}
