import { NavLink, useLocation } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  FileText,
  BrainCircuit,
  Clapperboard,
  Calendar,
  ChevronsLeft,
  ChevronsRight,
  Key,
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/roteiros', label: 'Roteiros', icon: FileText },
  { path: '/inteligencia', label: 'Inteligência', icon: BrainCircuit },
  { path: '/editor', label: 'Editor', icon: Clapperboard },
  { path: '/calendario', label: 'Calendário', icon: Calendar },
  { path: '/config', label: 'Config', icon: Key },
]

interface NavbarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function Navbar({ collapsed, onToggle }: NavbarProps) {
  const location = useLocation()
  const sidebarWidth = collapsed ? 'w-[72px]' : 'w-[240px]'

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        className={`fixed left-0 top-0 h-full bg-[#171717] border-r border-[#27272A] z-50 hidden xl:flex flex-col ${sidebarWidth} transition-all duration-300`}
        style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center justify-center border-b border-[#27272A] px-4 overflow-hidden">
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                key="logo-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-[#7C3AED]" />
                <span className="font-semibold text-base text-white tracking-tight whitespace-nowrap">
                  Fábrica GilCFP
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="logo-collapsed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-2 h-2 rounded-full bg-[#7C3AED]"
              />
            )}
          </AnimatePresence>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive: active }) =>
                  `flex items-center gap-3 h-10 px-3 rounded-lg transition-all duration-150 relative ${
                    active
                      ? 'bg-[#262626] text-[#7C3AED]'
                      : 'text-[#A1A1AA] hover:bg-[#262626] hover:text-white'
                  }`
                }
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#7C3AED] rounded-r-full"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }}
                  />
                )}
                <Icon size={20} className="flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </NavLink>
            )
          })}
        </nav>

        {/* Collapse Toggle */}
        <div className="p-3 border-t border-[#27272A]">
          <button
            onClick={onToggle}
            className="flex items-center justify-center gap-2 h-10 w-full rounded-lg text-[#71717A] hover:bg-[#262626] hover:text-white transition-all duration-150"
          >
            {collapsed ? <ChevronsRight size={20} /> : <ChevronsLeft size={20} />}
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm whitespace-nowrap"
                >
                  Recolher
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#171717] border-t border-[#27272A] z-50 xl:hidden">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all duration-150 relative ${
                  isActive
                    ? 'text-[#7C3AED]'
                    : 'text-[#71717A]'
                }`}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="mobileActiveIndicator"
                    className="absolute -bottom-0 w-8 h-[2px] bg-[#7C3AED] rounded-t-full"
                  />
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Mobile bottom padding */}
      <div className="h-16 xl:hidden" />
    </>
  )
}
