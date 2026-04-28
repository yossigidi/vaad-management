import { useState } from 'react'
import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  Hammer,
  FileText,
  Settings as SettingsIcon,
  Building2,
  Menu,
  X
} from 'lucide-react'
import { useData } from './context/DataContext.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Tenants from './pages/Tenants.jsx'
import Payments from './pages/Payments.jsx'
import Expenses from './pages/Expenses.jsx'
import Projects from './pages/Projects.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'

const PAGES = [
  { id: 'dashboard', label: 'דשבורד', icon: LayoutDashboard, component: Dashboard },
  { id: 'tenants', label: 'דיירים', icon: Users, component: Tenants },
  { id: 'payments', label: 'תשלומי ועד', icon: Wallet, component: Payments },
  { id: 'expenses', label: 'הוצאות', icon: Receipt, component: Expenses },
  { id: 'projects', label: 'פרויקטים', icon: Hammer, component: Projects },
  { id: 'reports', label: 'דוחות', icon: FileText, component: Reports },
  { id: 'settings', label: 'הגדרות', icon: SettingsIcon, component: Settings }
]

export default function App() {
  const { building } = useData()
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const ActiveComponent = PAGES.find(p => p.id === activePage)?.component || Dashboard

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 right-0 z-50
        w-72 bg-white border-l border-slate-200 shadow-xl lg:shadow-none
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        <div className="p-6 border-b border-slate-200 bg-gradient-to-bl from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Building2 size={28} />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">{building.name}</h1>
                <p className="text-blue-100 text-sm">{building.address}</p>
              </div>
            </div>
            <button
              className="lg:hidden text-white p-1"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto scrollbar-thin">
          <ul className="space-y-1">
            {PAGES.map(page => {
              const Icon = page.icon
              const isActive = activePage === page.id
              return (
                <li key={page.id}>
                  <button
                    onClick={() => {
                      setActivePage(page.id)
                      setSidebarOpen(false)
                    }}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg
                      text-right transition-colors
                      ${isActive
                        ? 'bg-blue-50 text-blue-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-100'
                      }
                    `}
                  >
                    <Icon size={20} />
                    <span className="flex-1 text-right">{page.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-slate-200 text-xs text-slate-500 text-center">
          ניהול ועד בית v1.0
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-700">
            <Menu size={24} />
          </button>
          <h1 className="font-semibold text-slate-900">
            {PAGES.find(p => p.id === activePage)?.label}
          </h1>
          <div className="w-6" />
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <ActiveComponent />
        </div>
      </main>
    </div>
  )
}
