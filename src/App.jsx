import { useState, lazy, Suspense } from 'react'
import {
  LayoutDashboard, Users, Wallet, Receipt, Hammer, FileText,
  Settings as SettingsIcon, Building2, Menu, X, MessageSquare, LogOut, Lock,
  TrendingUp
} from 'lucide-react'
import { useAuth } from './context/AuthContext.jsx'
import { useData } from './context/DataContext.jsx'

// Auth pages - small, can stay eager
import Login from './pages/auth/Login.jsx'

// Lazy-loaded pages (each becomes its own chunk, downloaded on demand)
const Signup = lazy(() => import('./pages/auth/Signup.jsx'))
const ChangePassword = lazy(() => import('./pages/auth/ChangePassword.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Tenants = lazy(() => import('./pages/Tenants.jsx'))
const Payments = lazy(() => import('./pages/Payments.jsx'))
const Expenses = lazy(() => import('./pages/Expenses.jsx'))
const Projects = lazy(() => import('./pages/Projects.jsx'))
const Reports = lazy(() => import('./pages/Reports.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const Communications = lazy(() => import('./pages/Communications.jsx'))
const AdditionalIncome = lazy(() => import('./pages/AdditionalIncome.jsx'))
const TenantDashboard = lazy(() => import('./pages/TenantDashboard.jsx'))

const ADMIN_PAGES = [
  { id: 'dashboard', label: 'דשבורד', icon: LayoutDashboard, component: Dashboard },
  { id: 'tenants', label: 'דיירים', icon: Users, component: Tenants },
  { id: 'payments', label: 'תשלומי ועד', icon: Wallet, component: Payments },
  { id: 'income', label: 'הכנסות נוספות', icon: TrendingUp, component: AdditionalIncome },
  { id: 'expenses', label: 'הוצאות', icon: Receipt, component: Expenses },
  { id: 'projects', label: 'פרויקטים', icon: Hammer, component: Projects },
  { id: 'communications', label: 'תקשורת', icon: MessageSquare, component: Communications },
  { id: 'reports', label: 'דוחות', icon: FileText, component: Reports },
  { id: 'settings', label: 'הגדרות', icon: SettingsIcon, component: Settings }
]

const PageLoader = () => (
  <div className="flex items-center justify-center py-20">
    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
  </div>
)

const FullScreenLoader = ({ label = 'טוען...' }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center">
      <div className="animate-spin h-10 w-10 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
      <p className="text-slate-500">{label}</p>
    </div>
  </div>
)

export default function App() {
  const { loading, user, profile, isAdmin, isTenant, mustChangePassword, logout } = useAuth()
  const { building, loading: dataLoading } = useData()
  const [authPage, setAuthPage] = useState('login')
  const [activePage, setActivePage] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  if (loading) {
    return <FullScreenLoader />
  }

  // Not logged in
  if (!user || !profile) {
    return authPage === 'signup' ? (
      <Suspense fallback={<FullScreenLoader />}>
        <Signup onLogin={() => setAuthPage('login')} />
      </Suspense>
    ) : (
      <Login onSignup={() => setAuthPage('signup')} />
    )
  }

  // Forced password change
  if (mustChangePassword) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <ChangePassword forced />
      </Suspense>
    )
  }

  // Voluntary password change
  if (showChangePassword) {
    return (
      <Suspense fallback={<FullScreenLoader />}>
        <div>
          <ChangePassword />
          <div className="fixed top-4 left-4 z-50">
            <button
              onClick={() => setShowChangePassword(false)}
              className="bg-white shadow-lg px-4 py-2 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
            >
              ← חזור
            </button>
          </div>
        </div>
      </Suspense>
    )
  }

  // Tenant view
  if (isTenant) {
    return (
      <Suspense fallback={<FullScreenLoader label="טוען נתונים..." />}>
        <TenantDashboard onChangePassword={() => setShowChangePassword(true)} />
      </Suspense>
    )
  }

  // Loading building data for admin
  if (isAdmin && dataLoading && !building) {
    return <FullScreenLoader label="טוען נתוני בניין..." />
  }

  const ActiveComponent = ADMIN_PAGES.find(p => p.id === activePage)?.component || Dashboard

  return (
    <div className="min-h-screen flex bg-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

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
                <h1 className="font-bold text-lg leading-tight">{building?.name || 'ועד בית'}</h1>
                <p className="text-blue-100 text-sm">{building?.address}</p>
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
            {ADMIN_PAGES.map(page => {
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

        <div className="p-4 border-t border-slate-200 space-y-1">
          <div className="text-xs text-slate-500 px-2">
            מחובר כ: <strong className="text-slate-700">{profile.username}</strong> · קוד: <strong className="font-mono">{profile.buildingCode}</strong>
          </div>
          <button
            onClick={() => setShowChangePassword(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            <Lock size={14} />
            שנה סיסמה
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
          >
            <LogOut size={14} />
            התנתק
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-700">
            <Menu size={24} />
          </button>
          <h1 className="font-semibold text-slate-900">
            {ADMIN_PAGES.find(p => p.id === activePage)?.label}
          </h1>
          <div className="w-6" />
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Suspense fallback={<PageLoader />}>
            <ActiveComponent />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
