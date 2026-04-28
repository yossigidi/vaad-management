import { useState, useMemo, useEffect } from 'react'
import { Check, AlertCircle, ChevronRight, ChevronLeft, MessageCircle, Phone, Mail, X, Banknote, FileText, Building2, Smartphone } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import {
  formatCurrency, monthShort, monthLabel, monthsFromStart, currentMonth,
  generatePeriods, periodLabel, periodShort, currentPeriodFor,
  FREQUENCY_LABELS, FREQUENCY_PERIODS_PER_YEAR
} from '../utils/format.js'

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'מזומן', icon: Banknote, emoji: '💵', color: 'emerald' },
  { id: 'check', label: 'צ׳ק', icon: FileText, emoji: '📝', color: 'blue' },
  { id: 'transfer', label: 'העברה בנקאית', icon: Building2, emoji: '🏦', color: 'purple' },
  { id: 'bit', label: 'ביט', icon: Smartphone, emoji: '📱', color: 'amber' }
]

export const getMethodInfo = (id) => PAYMENT_METHODS.find(m => m.id === id) || PAYMENT_METHODS[0]

export default function Payments() {
  const { building, tenants, payments, setPayment } = useData()
  const frequency = building?.paymentFrequency || 'monthly'

  // Amount per period (e.g., yearly = monthlyFee × 12)
  const periodsPerYear = FREQUENCY_PERIODS_PER_YEAR[frequency]
  const amountPerPeriod = (building?.monthlyFee || 0) * (12 / periodsPerYear)

  const periods = useMemo(
    () => building ? generatePeriods(frequency, building.startMonth) : [],
    [building, frequency]
  )

  const [selectedMonth, setSelectedMonth] = useState(() =>
    building ? currentPeriodFor(frequency, building.startMonth) : currentMonth()
  )
  const [view, setView] = useState('grid') // 'grid' | 'month'
  const [showMultiPay, setShowMultiPay] = useState(false)
  const [multiPayPrefilledTenant, setMultiPayPrefilledTenant] = useState(null)
  const [methodDialog, setMethodDialog] = useState(null) // {tenantId, period} or null

  // Keep selected period valid when frequency changes
  useMemo(() => {
    if (periods.length > 0 && !periods.includes(selectedMonth)) {
      setSelectedMonth(periods[periods.length - 1])
    }
  }, [periods, selectedMonth])

  const months = periods // Keep variable name for backward compat in this file
  const sortedTenants = useMemo(
    () => [...tenants].filter(t => t.active).sort((a, b) => a.apartmentNumber - b.apartmentNumber),
    [tenants]
  )

  const getPayment = (tenantId, month) => {
    return payments.find(p => p.tenantId === tenantId && p.month === month)
  }

  const togglePayment = (tenantId, month) => {
    const existing = getPayment(tenantId, month)
    if (existing?.paid) {
      // Unmark - direct toggle off
      if (confirm('לסמן כלא שולם?')) {
        setPayment(tenantId, month, false)
      }
    } else {
      // Mark paid - open method selection dialog
      setMethodDialog({ tenantId, period: month })
    }
  }

  // Stats for selected month
  const monthStats = useMemo(() => {
    const paidCount = sortedTenants.filter(t => getPayment(t.id, selectedMonth)?.paid).length
    const expected = sortedTenants.length * amountPerPeriod
    const collected = paidCount * amountPerPeriod
    return {
      paidCount,
      unpaidCount: sortedTenants.length - paidCount,
      expected,
      collected,
      percent: expected ? Math.round((collected / expected) * 100) : 0
    }
  }, [sortedTenants, selectedMonth, payments, amountPerPeriod])

  const debtors = sortedTenants.filter(t => !getPayment(t.id, selectedMonth)?.paid)

  const reminderText = (tenantName) => {
    return `שלום ${tenantName},\nתזכורת ידידותית - דמי הוועד עבור ${periodLabel(selectedMonth, frequency)} בסך ${formatCurrency(amountPerPeriod)} עדיין לא שולמו.\nאנא דאגו להעביר בהקדם.\nתודה,\nועד בית ${building.name}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">תשלומי ועד</h1>
          <p className="text-slate-500">
            {formatCurrency(amountPerPeriod)} לדירה {frequency === 'monthly' ? 'לחודש' : frequency === 'bi-monthly' ? 'לחודשיים' : 'לשנה'}
            {frequency !== 'monthly' && (
              <span className="text-xs text-slate-400 mr-2">(שווה ל-{formatCurrency(building.monthlyFee)}/חודש)</span>
            )}
          </p>
        </div>
        <div className="flex bg-white rounded-xl p-1 border border-slate-200">
          <button
            onClick={() => setView('grid')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${view === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
          >
            טבלה כללית
          </button>
          <button
            onClick={() => setView('month')}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${view === 'month' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
          >
            חודש בודד
          </button>
        </div>
      </div>

      {view === 'month' ? (
        <>
          {/* Month selector */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
            <button
              onClick={() => {
                const idx = months.indexOf(selectedMonth)
                if (idx > 0) setSelectedMonth(months[idx - 1])
              }}
              disabled={months.indexOf(selectedMonth) === 0}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="font-bold text-xl text-slate-900 bg-transparent border-none focus:outline-none cursor-pointer"
            >
              {months.map(m => (
                <option key={m} value={m}>{periodLabel(m, frequency)}</option>
              ))}
            </select>
            <button
              onClick={() => {
                const idx = months.indexOf(selectedMonth)
                if (idx < months.length - 1) setSelectedMonth(months[idx + 1])
              }}
              disabled={months.indexOf(selectedMonth) === months.length - 1}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="text-sm text-slate-500">שילמו</div>
              <div className="text-2xl font-bold text-emerald-600">{monthStats.paidCount}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="text-sm text-slate-500">חייבים</div>
              <div className="text-2xl font-bold text-red-600">{monthStats.unpaidCount}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="text-sm text-slate-500">נגבה</div>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(monthStats.collected)}</div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <div className="text-sm text-slate-500">צפי</div>
              <div className="text-2xl font-bold text-slate-900">{formatCurrency(monthStats.expected)}</div>
            </div>
          </div>

          {/* Multi-period payment button */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="font-bold text-blue-900">דייר שילם מספר תקופות בבת אחת?</div>
              <div className="text-sm text-blue-700">
                למשל - הביא צ'ק על {frequency === 'monthly' ? '3 חודשים' : 'מספר תקופות'} מראש
              </div>
            </div>
            <button
              onClick={() => { setMultiPayPrefilledTenant(null); setShowMultiPay(true) }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold whitespace-nowrap"
            >
              💰 רשום תשלום מרובה
            </button>
          </div>

          {/* Tenants list */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="divide-y divide-slate-100">
              {sortedTenants.map(tenant => {
                const payment = getPayment(tenant.id, selectedMonth)
                const isPaid = !!payment?.paid
                return (
                  <div
                    key={tenant.id}
                    className={`p-4 flex items-center gap-4 ${!isPaid ? 'bg-red-50' : ''}`}
                  >
                    <button
                      onClick={() => togglePayment(tenant.id, selectedMonth)}
                      className={`
                        w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all flex-shrink-0
                        ${isPaid
                          ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                          : 'bg-red-100 text-red-600 hover:bg-red-200 border-2 border-red-300'
                        }
                      `}
                    >
                      {isPaid ? <Check size={24} /> : <AlertCircle size={20} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-900">דירה {tenant.apartmentNumber} - {tenant.name}</div>
                      <div className={`text-sm ${isPaid ? 'text-emerald-600' : 'text-red-600 font-semibold'}`}>
                        {isPaid ? (
                          <span className="flex items-center gap-1 flex-wrap">
                            <span>שולם</span>
                            {payment.method && (
                              <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded px-1.5 text-xs">
                                <span>{getMethodInfo(payment.method).emoji}</span>
                                <span>{getMethodInfo(payment.method).label}</span>
                              </span>
                            )}
                            {payment.paidDate && (
                              <span className="text-slate-400 text-xs">· {new Date(payment.paidDate).toLocaleDateString('he-IL')}</span>
                            )}
                          </span>
                        ) : 'לא שולם'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isPaid && tenant.phone && (
                        <a
                          href={`https://wa.me/972${tenant.phone.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(reminderText(tenant.name))}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
                          title="שלח תזכורת בוואטסאפ"
                        >
                          <MessageCircle size={18} />
                        </a>
                      )}
                      <div className="text-left">
                        <div className="font-bold text-slate-900">{formatCurrency(amountPerPeriod)}</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Debtors quick reminder */}
          {debtors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <h3 className="font-bold text-red-700 mb-2">
                שלח תזכורת ל-{debtors.length} חייבים
              </h3>
              <div className="flex flex-wrap gap-2">
                {debtors.filter(t => t.phone).map(t => (
                  <a
                    key={t.id}
                    href={`https://wa.me/972${t.phone.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(reminderText(t.name))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-sm hover:bg-red-100 transition-colors flex items-center gap-1"
                  >
                    <MessageCircle size={14} />
                    דירה {t.apartmentNumber}
                  </a>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="text-right p-3 font-semibold text-slate-700 sticky right-0 bg-slate-50 z-10 min-w-[140px]">
                    דייר
                  </th>
                  {months.map(m => (
                    <th key={m} className="text-center p-2 font-semibold text-slate-700 text-xs whitespace-nowrap">
                      {periodShort(m, frequency)}
                    </th>
                  ))}
                  <th className="text-center p-3 font-semibold text-slate-700 bg-slate-50">סה"כ</th>
                </tr>
              </thead>
              <tbody>
                {sortedTenants.map(tenant => {
                  const tenantPayments = months.map(m => ({
                    month: m,
                    payment: getPayment(tenant.id, m)
                  }))
                  const paidCount = tenantPayments.filter(p => p.payment?.paid).length
                  const unpaidCount = tenantPayments.length - paidCount
                  const debt = unpaidCount * amountPerPeriod
                  return (
                    <tr key={tenant.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 sticky right-0 bg-white z-10 border-l border-slate-100">
                        <div className="font-semibold text-slate-900 text-sm">דירה {tenant.apartmentNumber}</div>
                        <div className="text-xs text-slate-500 truncate max-w-[120px]">{tenant.name}</div>
                      </td>
                      {tenantPayments.map(({ month, payment }) => {
                        const isPaid = !!payment?.paid
                        return (
                          <td key={month} className="p-1 text-center">
                            <button
                              onClick={() => togglePayment(tenant.id, month)}
                              className={`
                                w-9 h-9 rounded-lg font-bold transition-all
                                ${isPaid
                                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                  : 'bg-red-100 text-red-600 hover:bg-red-200 border-2 border-red-300'
                                }
                              `}
                              title={isPaid
                                ? `שולם ${payment.method ? `(${getMethodInfo(payment.method).label}) ` : ''}- ${periodLabel(month, frequency)}`
                                : `לא שולם - ${periodLabel(month, frequency)}`
                              }
                            >
                              {isPaid ? <Check size={16} className="mx-auto" /> : '✕'}
                            </button>
                          </td>
                        )
                      })}
                      <td className="p-3 text-center bg-slate-50 border-r border-slate-100">
                        <div className={`text-sm font-bold ${debt > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {debt > 0 ? formatCurrency(debt) : '✓'}
                        </div>
                        <div className="text-xs text-slate-500">{paidCount}/{months.length}</div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showMultiPay && (
        <MultiPaymentDialog
          tenants={sortedTenants}
          periods={periods}
          frequency={frequency}
          amountPerPeriod={amountPerPeriod}
          getPayment={getPayment}
          setPayment={setPayment}
          prefilledTenantId={multiPayPrefilledTenant}
          onClose={() => { setShowMultiPay(false); setMultiPayPrefilledTenant(null) }}
        />
      )}

      {methodDialog && (
        <PaymentMethodDialog
          tenant={sortedTenants.find(t => t.id === methodDialog.tenantId)}
          period={methodDialog.period}
          frequency={frequency}
          amount={amountPerPeriod}
          onConfirm={(method, paidDate, note) => {
            setPayment(methodDialog.tenantId, methodDialog.period, true, { method, paidDate, note })
            setMethodDialog(null)
          }}
          onClose={() => setMethodDialog(null)}
        />
      )}
    </div>
  )
}

function PaymentMethodDialog({ tenant, period, frequency, amount, onConfirm, onClose }) {
  const [method, setMethod] = useState('cash')
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-slate-900">איך שילם?</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700"><X size={20} /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          דירה {tenant?.apartmentNumber} - {tenant?.name} · {periodLabel(period, frequency)} · <strong>{formatCurrency(amount)}</strong>
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {PAYMENT_METHODS.map(m => {
            const Icon = m.icon
            const isActive = method === m.id
            const colorMap = {
              emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700',
              blue: 'border-blue-500 bg-blue-50 text-blue-700',
              purple: 'border-purple-500 bg-purple-50 text-purple-700',
              amber: 'border-amber-500 bg-amber-50 text-amber-700'
            }
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${isActive ? colorMap[m.color] : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <div className="text-2xl">{m.emoji}</div>
                <div className="font-semibold text-sm">{m.label}</div>
              </button>
            )
          })}
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">תאריך התשלום</label>
          <input
            type="date"
            value={paidDate}
            onChange={e => setPaidDate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>

        {showNote ? (
          <div className="mb-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              הערה (למשל: מספר צ׳ק)
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder={method === 'check' ? 'מספר צ׳ק...' : ''}
              autoFocus
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="text-sm text-blue-600 hover:underline mb-3"
          >
            + הוסף הערה
          </button>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(method, paidDate, note)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold"
          >
            ✓ סמן כשולם
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-semibold"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}

function MultiPaymentDialog({ tenants, periods, frequency, amountPerPeriod, getPayment, setPayment, prefilledTenantId, onClose }) {
  const [tenantId, setTenantId] = useState(prefilledTenantId || tenants[0]?.id || '')
  const [startPeriod, setStartPeriod] = useState(() => {
    return periods[0] || ''
  })
  const [count, setCount] = useState(1)
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Suggest first unpaid period when tenant changes
  useMemo(() => {
    if (tenantId) {
      const firstUnpaid = periods.find(p => !getPayment(tenantId, p)?.paid)
      if (firstUnpaid) setStartPeriod(firstUnpaid)
    }
  }, [tenantId])

  const startIdx = periods.indexOf(startPeriod)
  const selectedPeriods = startIdx >= 0
    ? periods.slice(startIdx, Math.min(startIdx + count, periods.length))
    : []
  const totalAmount = selectedPeriods.length * amountPerPeriod

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!tenantId || selectedPeriods.length === 0) return
    setSubmitting(true)
    try {
      const fullNote = note ? `${note} · תשלום מרובה (${selectedPeriods.length} תקופות)` : `תשלום מרובה (${selectedPeriods.length} תקופות)`
      for (const p of selectedPeriods) {
        await setPayment(tenantId, p, true, { paidDate, method, note: fullNote })
      }
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const tenant = tenants.find(t => t.id === tenantId)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900">💰 תשלום מרובה תקופות</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">דייר</label>
            <select
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              required
            >
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  דירה {t.apartmentNumber} - {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {frequency === 'monthly' ? 'חודש התחלה' : 'תקופת התחלה'}
            </label>
            <select
              value={startPeriod}
              onChange={e => setStartPeriod(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              required
            >
              {periods.map(p => {
                const isPaid = tenantId && getPayment(tenantId, p)?.paid
                return (
                  <option key={p} value={p}>
                    {periodLabel(p, frequency)} {isPaid ? '✓ שולם' : ''}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              מספר תקופות לסימון
            </label>
            <div className="flex gap-2 items-center">
              <button
                type="button"
                onClick={() => setCount(Math.max(1, count - 1))}
                className="bg-slate-100 hover:bg-slate-200 w-10 h-10 rounded-lg font-bold text-xl"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max={periods.length - startIdx}
                value={count}
                onChange={e => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-center text-xl font-bold"
              />
              <button
                type="button"
                onClick={() => setCount(Math.min(periods.length - startIdx, count + 1))}
                className="bg-slate-100 hover:bg-slate-200 w-10 h-10 rounded-lg font-bold text-xl"
              >
                +
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {frequency === 'monthly' ? 'מספר חודשים' : frequency === 'bi-monthly' ? 'מספר תקופות דו-חודשיות' : 'מספר שנים'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">אמצעי תשלום</label>
            <div className="grid grid-cols-4 gap-1.5">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`p-2 rounded-lg border-2 text-center text-xs ${method === m.id ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-slate-200 text-slate-600'}`}
                >
                  <div className="text-lg">{m.emoji}</div>
                  <div>{m.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">תאריך התשלום</label>
            <input
              type="date"
              value={paidDate}
              onChange={e => setPaidDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">הערה (אופציונלי)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder={method === 'check' ? 'מספר צ׳ק...' : 'הערה'}
            />
          </div>

          {/* Preview */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-2">
            <div className="flex justify-between font-semibold text-emerald-900">
              <span>תקופות לסימון:</span>
              <span>{selectedPeriods.length}</span>
            </div>
            <div className="flex justify-between text-emerald-800">
              <span>סכום כולל:</span>
              <span className="font-bold">{formatCurrency(totalAmount)}</span>
            </div>
            {selectedPeriods.length > 0 && (
              <div className="text-xs text-emerald-700 border-t border-emerald-200 pt-2">
                {periodLabel(selectedPeriods[0], frequency)}
                {selectedPeriods.length > 1 && ` ← ${periodLabel(selectedPeriods[selectedPeriods.length - 1], frequency)}`}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting || selectedPeriods.length === 0}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold disabled:opacity-50"
            >
              {submitting ? 'שומר...' : `סמן ${selectedPeriods.length} כשולם`}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-semibold"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
