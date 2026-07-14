import { useState } from 'react'
import { Outlet } from 'react-router'
import Navbar from './Navbar'
import Footer from './Footer'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const sidebarWidth = collapsed ? 'xl:pl-[72px]' : 'xl:pl-[240px]'

  return (
    <div className={`flex min-h-screen bg-[#0A0A0A] ${sidebarWidth} transition-all duration-300`}>
      <Navbar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  )
}
