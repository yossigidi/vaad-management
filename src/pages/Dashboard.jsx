import { useMemo } from 'react'
import {
  Wallet,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Hammer,
  Receipt,
  Building2
} from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { formatCurrency, currentMonth, monthLabel, monthsFromStart } from '../utils/format.js'

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
    <div className="flex items-start justify-between mb-3">
      <div className={`p-3 rounded-xl ${color.bg}`}>
        <Icon size={24} className={color.text} />
      </div>
    </div>
    <div className="text-3xl font-bold text-slate-900 mb-1">{value}</div>
    <div className="text-sm text-slate-500">{label}</div>
    {sub && <div className="text-xs text-slate-400 mt-2">{sub}</div>}
  </div>
)

export default function Dashboard() {
  const { building, tenants, payments, expenses, projects, projectPayments } = useData()
  const month = currentMonth()

  const stats = useMemo(() => {
    const activeTenants = tenants.filter(t => t.active)
    const expectedThisMonth = activeTenants.length * building.monthlyFee

    const paidThisMonth = payments
      .filter(p => p.month === month && p.paid)
      .reduce((sum, p) => sum + (p.amount || building.monthlyFee), 0)

    const debtors = activeTenants.filter(t => {
      const p = payments.find(x => x.tenantId === t.id && x.month === month)
      return !p || !p.paid
    })

    // total income (all months)
    const totalIncome = payments.filter(p => p.paid).reduce((s, p) => s + (p.amount || 0), 0)

    // total expenses
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)

    // expenses this month
    const expensesThisMonth = expenses
      .filter(e => e.date?.startsWith(month))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)

    // active projects
    const activeProjects = projects.filter(p => p.status === 'active')

    // total debt across all months
    const allMonths = monthsFromStart(building.startMonth)
    let totalDebt = 0
    activeTenants.forEach(t => {
      allMonths.forEach(m => {
        const p = payments.find(x => x.tenantId === t.id && x.month === m)
        if (!p || !p.paid) totalDebt += building.monthlyFee
      })
    })

    return {
      expectedThisMonth,
      paidThisMonth,
      paidPercent: expectedThisMonth ? Math.round((paidThisMonth / expectedThisMonth) * 100) : 0,
      debtors,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses,
      expensesThisMonth,
      activeProjects,
      totalDebt
    }
  }, [tenants, payments, expenses, projects, projectPayments, building, month])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">דשבורד</h1>
        <p className="text-slate-500">מבט מהיר על מצב הוועד - {monthLabel(month)}</p>
      </div>

      {/* Building info card */}
      <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-4 rounded-xl">
            <Building2 size={32} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold">{building.name}</h2>
            <p className="text-blue-100">{building.address}</p>
          </div>
          <div className="text-left">
            <div className="text-blue-200 text-sm">דמי ועד חודשי</div>
            <div className="text-2xl font-bold">{formatCurrency(building.monthlyFee)}</div>
            <div className="text-blue-200 text-xs mt-1">{tenants.filter(t => t.active).length} דיירים פעילים</div>
          </div>
        </div>
      </div>

      {/* Main stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CheckCircle2}
          label={`נגבה ${monthLabel(month)}`}
          value={formatCurrency(stats.paidThisMonth)}
          sub={`מתוך ${formatCurrency(stats.expectedThisMonth)} (${stats.paidPercent}%)`}
          color={{ bg: 'bg-emerald-50', text: 'text-emerald-600' }}
        />
        <StatCard
          icon={AlertCircle}
          label="חייבים החודש"
          value={stats.debtors.length}
          sub={`חוב מצטבר: ${formatCurrency(stats.totalDebt)}`}
          color={{ bg: 'bg-red-50', text: 'text-red-600' }}
        />
        <StatCard
          icon={Wallet}
          label="יתרה בקופה"
          value={formatCurrency(stats.balance)}
          sub={`הכנסות: ${formatCurrency(stats.totalIncome)}`}
          color={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
        />
        <StatCard
          icon={TrendingDown}
          label="הוצאות החודש"
          value={formatCurrency(stats.expensesThisMonth)}
          sub={`סה"כ: ${formatCurrency(stats.totalExpenses)}`}
          color={{ bg: 'bg-amber-50', text: 'text-amber-600' }}
        />
      </div>

      {/* Progress bar for current month */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-slate-900">התקדמות גביה - {monthLabel(month)}</h3>
          <span className="text-2xl font-bold text-blue-600">{stats.paidPercent}%</span>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-l from-emerald-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${stats.paidPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-sm text-slate-500">
          <span>{formatCurrency(stats.paidThisMonth)} נגבה</span>
          <span>{formatCurrency(stats.expectedThisMonth)} צפי</span>
        </div>
      </div>

      {/* Debtors list */}
      {stats.debtors.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-red-100">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="text-red-500" size={20} />
            <h3 className="font-semibold text-slate-900">
              חייבים החודש ({stats.debtors.length})
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {stats.debtors.map(t => (
              <div
                key={t.id}
                className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center"
              >
                <div className="text-red-700 font-semibold text-sm">דירה {t.apartmentNumber}</div>
                <div className="text-red-600 text-xs truncate">{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active projects */}
      {stats.activeProjects.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Hammer className="text-amber-500" size={20} />
            <h3 className="font-semibold text-slate-900">
              פרויקטים פעילים ({stats.activeProjects.length})
            </h3>
          </div>
          <div className="space-y-3">
            {stats.activeProjects.map(p => {
              const projectPays = projectPayments.filter(pp => pp.projectId === p.id && pp.paid)
              const collected = projectPays.reduce((s, pp) => s + (pp.amount || 0), 0)
              const percent = p.totalAmount ? Math.round((collected / p.totalAmount) * 100) : 0
              return (
                <div key={p.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-slate-900">{p.name}</h4>
                      <p className="text-sm text-slate-500">
                        {formatCurrency(p.perTenantAmount)} לדייר · סה"כ {formatCurrency(p.totalAmount)}
                      </p>
                    </div>
                    <span className="text-xl font-bold text-amber-600">{percent}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-slate-500">
                    <span>נגבה: {formatCurrency(collected)}</span>
                    <span>{projectPays.length} מתוך {tenants.filter(t => t.active).length} שילמו</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
