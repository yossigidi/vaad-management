import { useMemo, useState } from 'react'
import {
  Building2, Wallet, CheckCircle2, AlertCircle, Hammer,
  Receipt, Calendar, TrendingDown, LogOut, Lock, User
} from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  formatCurrency, monthLabel, monthsFromStart, currentMonth, formatDate,
  generatePeriods, periodLabel, FREQUENCY_PERIODS_PER_YEAR
} from '../utils/format.js'

export default function TenantDashboard({ onChangePassword }) {
  const { building, payments, expenses, projects, projectPayments, myPayments, myProjectPayments, myTenant } = useData()
  const { profile, logout } = useAuth()
  const [tab, setTab] = useState('mine')

  const frequency = building?.paymentFrequency || 'monthly'
  const periodsPerYear = FREQUENCY_PERIODS_PER_YEAR[frequency]
  const amountPerPeriod = (building?.monthlyFee || 0) * (12 / periodsPerYear)
  const months = useMemo(() => building ? generatePeriods(frequency, building.startMonth) : [], [building, frequency])
  const month = currentMonth()

  const myStats = useMemo(() => {
    if (!building || !myTenant) return null
    const totalPaid = myPayments.filter(p => p.paid).reduce((s, p) => s + (p.amount || amountPerPeriod), 0)
    const paidMonths = myPayments.filter(p => p.paid).map(p => p.month)
    const unpaidMonths = months.filter(m => !paidMonths.includes(m))
    const totalDebt = unpaidMonths.length * amountPerPeriod
    const myProjectDebt = projects
      .filter(p => p.status === 'active')
      .reduce((s, p) => {
        const myPP = myProjectPayments.find(pp => pp.projectId === p.id)
        return s + (myPP?.paid ? 0 : (p.perTenantAmount || 0))
      }, 0)
    return { totalPaid, paidMonths, unpaidMonths, totalDebt, myProjectDebt }
  }, [building, myTenant, myPayments, myProjectPayments, months, projects])

  const generalStats = useMemo(() => {
    if (!building) return null
    const totalIncome = payments.filter(p => p.paid).reduce((s, p) => s + (p.amount || 0), 0)
    const totalExpenses = expenses.filter(e => !e.projectId).reduce((s, e) => s + Number(e.amount || 0), 0)
    return {
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses
    }
  }, [building, payments, expenses])

  if (!building || !myTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-slate-500">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-l from-blue-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Building2 size={24} />
            </div>
            <div>
              <h1 className="font-bold leading-tight">{building.name}</h1>
              <p className="text-blue-100 text-xs">דירה {myTenant.apartmentNumber}{myTenant.name ? ` · ${myTenant.name}` : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onChangePassword}
              className="p-2 hover:bg-white/10 rounded-lg"
              title="שנה סיסמה"
            >
              <Lock size={18} />
            </button>
            <button
              onClick={logout}
              className="p-2 hover:bg-white/10 rounded-lg"
              title="התנתק"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Personal status */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={16} className="text-emerald-500" />
              <div className="text-xs text-slate-500">שילמתי</div>
            </div>
            <div className="text-xl font-bold text-emerald-600">{formatCurrency(myStats.totalPaid)}</div>
            <div className="text-xs text-slate-500 mt-1">{myStats.paidMonths.length} חודשים</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className={myStats.totalDebt > 0 ? 'text-red-500' : 'text-slate-400'} />
              <div className="text-xs text-slate-500">חוב ועד</div>
            </div>
            <div className={`text-xl font-bold ${myStats.totalDebt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {myStats.totalDebt > 0 ? formatCurrency(myStats.totalDebt) : '✓ אין חוב'}
            </div>
            <div className="text-xs text-slate-500 mt-1">{myStats.unpaidMonths.length} חודשים</div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Hammer size={16} className="text-amber-500" />
              <div className="text-xs text-slate-500">חוב פרויקטים</div>
            </div>
            <div className={`text-xl font-bold ${myStats.myProjectDebt > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
              {myStats.myProjectDebt > 0 ? formatCurrency(myStats.myProjectDebt) : '✓'}
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={16} className="text-blue-500" />
              <div className="text-xs text-slate-500">קופת ועד</div>
            </div>
            <div className="text-xl font-bold text-blue-600">{formatCurrency(generalStats.balance)}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-white rounded-xl p-1 border border-slate-200 w-fit">
          <button
            onClick={() => setTab('mine')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === 'mine' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
          >
            התשלומים שלי
          </button>
          <button
            onClick={() => setTab('expenses')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === 'expenses' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
          >
            הוצאות שוטפות
          </button>
          <button
            onClick={() => setTab('projects')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === 'projects' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
          >
            פרויקטים
          </button>
        </div>

        {tab === 'mine' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  <Calendar size={18} />
                  היסטוריית תשלומי ועד
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  דמי ועד: {formatCurrency(amountPerPeriod)} {frequency === 'monthly' ? 'לחודש' : frequency === 'bi-monthly' ? 'לחודשיים' : 'לשנה'}
                </p>
              </div>
              <div className="divide-y divide-slate-100">
                {months.map(m => {
                  const p = myPayments.find(x => x.month === m)
                  const isPaid = !!p?.paid
                  return (
                    <div key={m} className={`p-4 flex items-center gap-3 ${!isPaid ? 'bg-red-50' : ''}`}>
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPaid ? 'bg-emerald-500 text-white' : 'bg-red-100 text-red-600 border-2 border-red-300'}`}>
                        {isPaid ? <CheckCircle2 size={20} /> : <AlertCircle size={18} />}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{periodLabel(m, frequency)}</div>
                        <div className={`text-xs ${isPaid ? 'text-emerald-600' : 'text-red-600 font-semibold'}`}>
                          {isPaid
                            ? `שולם ${p?.paidDate ? '· ' + new Date(p.paidDate).toLocaleDateString('he-IL') : ''}`
                            : 'לא שולם'
                          }
                        </div>
                      </div>
                      <div className={`font-bold ${isPaid ? 'text-slate-900' : 'text-red-600'}`}>
                        {formatCurrency(amountPerPeriod)}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'expenses' && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                <Receipt size={18} />
                הוצאות שוטפות של הבניין
              </h3>
              <p className="text-sm text-slate-500 mt-1">סה"כ הוצאות: {formatCurrency(generalStats.totalExpenses)}</p>
            </div>
            {expenses.filter(e => !e.projectId).length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt size={48} className="mx-auto text-slate-300 mb-2" />
                אין הוצאות רשומות
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {expenses.filter(e => !e.projectId).sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(e => (
                  <div key={e.id} className="p-4 flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${e.type === 'fixed' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                      <Receipt size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{e.description}</div>
                      <div className="flex gap-2 text-xs text-slate-500 mt-0.5">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">{e.category}</span>
                        <span>{formatDate(e.date)}</span>
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">{formatCurrency(e.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'projects' && (
          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                <Hammer size={48} className="mx-auto text-slate-300 mb-3" />
                <p className="text-slate-500">אין פרויקטים פעילים כרגע</p>
              </div>
            ) : (
              projects.map(p => {
                const projectPays = projectPayments.filter(pp => pp.projectId === p.id && pp.paid)
                const collected = projectPays.reduce((s, pp) => s + (pp.amount || 0), 0)
                const projectExpenses = expenses.filter(e => e.projectId === p.id)
                const spent = projectExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
                const myPP = myProjectPayments.find(pp => pp.projectId === p.id)
                const iPaid = !!myPP?.paid
                return (
                  <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100">
                      <div className="flex items-start gap-3">
                        <div className="bg-amber-100 text-amber-600 p-2 rounded-lg">
                          <Hammer size={20} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900">{p.name}</h3>
                          {p.description && <p className="text-sm text-slate-500 mt-1">{p.description}</p>}
                        </div>
                        <div className={`text-xs font-semibold px-2 py-1 rounded ${p.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {p.status === 'active' ? 'פעיל' : 'הושלם'}
                        </div>
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-slate-50 rounded-lg p-2 text-center">
                          <div className="text-xs text-slate-500">סה"כ</div>
                          <div className="font-bold text-slate-900">{formatCurrency(p.totalAmount)}</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <div className="text-xs text-blue-600">שלי</div>
                          <div className="font-bold text-blue-700">{formatCurrency(p.perTenantAmount)}</div>
                        </div>
                        <div className={`rounded-lg p-2 text-center ${iPaid ? 'bg-emerald-50' : 'bg-red-50'}`}>
                          <div className={`text-xs ${iPaid ? 'text-emerald-600' : 'text-red-600'}`}>סטטוס שלי</div>
                          <div className={`font-bold ${iPaid ? 'text-emerald-700' : 'text-red-700'}`}>
                            {iPaid ? '✓ שולם' : '✗ לא שולם'}
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-500">התקדמות גביה</span>
                          <span className="font-semibold">{p.totalAmount ? Math.round((collected / p.totalAmount) * 100) : 0}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${p.totalAmount ? Math.round((collected / p.totalAmount) * 100) : 0}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <span>נגבה: <strong className="text-emerald-600">{formatCurrency(collected)}</strong></span>
                        <span>הוצא: <strong className="text-amber-600">{formatCurrency(spent)}</strong></span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        <div className="text-center text-xs text-slate-400 py-4">
          ניהול ועד בית · {profile?.username}
        </div>
      </main>
    </div>
  )
}
