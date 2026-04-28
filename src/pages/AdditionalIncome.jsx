import { useState, useMemo } from 'react'
import {
  Plus, Trash2, Edit2, X, Check, AlertCircle,
  Car, Box, Radio, Building, ChevronRight, ChevronLeft, MessageCircle
} from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import {
  formatCurrency, monthLabel, monthShort, monthsFromStart, currentMonth, formatDate,
  generatePeriods, periodLabel, periodShort, currentPeriodFor, monthlyEquivalent,
  FREQUENCY_LABELS, FREQUENCY_PERIODS_PER_YEAR
} from '../utils/format.js'
import AttachmentManager from '../components/AttachmentManager.jsx'
import PaymentMethodDialog from '../components/PaymentMethodDialog.jsx'
import { getMethodInfo } from '../utils/paymentMethods.js'

const STREAM_TYPES = [
  { id: 'parking', label: 'חניה', icon: Car, color: 'blue' },
  { id: 'storage', label: 'מחסן', icon: Box, color: 'amber' },
  { id: 'antenna', label: 'אנטנה', icon: Radio, color: 'purple' },
  { id: 'commercial', label: 'מסחרי', icon: Building, color: 'emerald' },
  { id: 'other', label: 'אחר', icon: Building, color: 'slate' }
]

const colorClasses = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
  slate: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' }
}

export default function AdditionalIncome() {
  const {
    building, incomeStreams, incomeReceipts,
    addIncomeStream, updateIncomeStream, deleteIncomeStream, setIncomeReceipt
  } = useData()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [view, setView] = useState('list') // 'list' | 'month'
  const [selectedMonth, setSelectedMonth] = useState(currentMonth())
  const [freqTab, setFreqTab] = useState('monthly') // 'monthly' | 'bi-monthly' | 'yearly'
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [methodDialog, setMethodDialog] = useState(null) // {streamId, period} or null

  const emptyForm = {
    type: 'parking',
    name: '',
    monthlyAmount: '',
    frequency: 'monthly',
    renterName: '',
    renterPhone: '',
    notes: '',
    active: true,
    attachments: []
  }
  const [form, setForm] = useState(emptyForm)

  const months = useMemo(() => building ? monthsFromStart(building.startMonth) : [], [building])
  const activeStreams = useMemo(() => incomeStreams.filter(s => s.active), [incomeStreams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.monthlyAmount) return
    const payload = {
      ...form,
      monthlyAmount: parseFloat(form.monthlyAmount) || 0
    }
    if (editingId) {
      await updateIncomeStream(editingId, payload)
    } else {
      await addIncomeStream(payload)
    }
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const startEdit = (stream) => {
    setForm({
      type: stream.type || 'other',
      name: stream.name,
      monthlyAmount: String(stream.monthlyAmount),
      frequency: stream.frequency || 'monthly',
      renterName: stream.renterName || '',
      renterPhone: stream.renterPhone || '',
      notes: stream.notes || '',
      active: stream.active !== false,
      attachments: stream.attachments || []
    })
    setEditingId(stream.id)
    setShowForm(true)
  }

  const handleDelete = (stream) => {
    if (confirm(`למחוק את "${stream.name}"? כל היסטוריית התשלומים תימחק.`)) {
      deleteIncomeStream(stream.id)
    }
  }

  const stats = useMemo(() => {
    // Monthly equivalent: bi-monthly = amount/2 per month, yearly = amount/12 per month
    const expectedMonthly = activeStreams.reduce((s, x) =>
      s + monthlyEquivalent(x.monthlyAmount, x.frequency), 0
    )
    const totalCollected = incomeReceipts
      .filter(r => r.paid)
      .reduce((s, r) => s + (Number(r.amount) || 0), 0)
    // Debtors = streams with current period unpaid
    const debtors = activeStreams.filter(s => {
      const period = currentPeriodFor(s.frequency || 'monthly', building?.startMonth || '2026-01')
      const r = incomeReceipts.find(x => x.streamId === s.id && x.month === period)
      return !r || !r.paid
    })
    const collectedThisPeriod = activeStreams.reduce((s, x) => {
      const period = currentPeriodFor(x.frequency || 'monthly', building?.startMonth || '2026-01')
      const r = incomeReceipts.find(rec => rec.streamId === x.id && rec.month === period)
      return s + (r?.paid ? Number(r.amount || 0) : 0)
    }, 0)
    return { expectedMonthly, collectedThisMonth: collectedThisPeriod, totalCollected, debtors }
  }, [activeStreams, incomeReceipts, building])

  // Streams filtered to selected frequency tab
  const freqStreams = useMemo(() =>
    activeStreams.filter(s => (s.frequency || 'monthly') === freqTab)
  , [activeStreams, freqTab])

  // Periods for the selected frequency
  const freqPeriods = useMemo(() =>
    building ? generatePeriods(freqTab, building.startMonth) : []
  , [building, freqTab])

  // Default selectedPeriod when tab changes - pick last period
  useMemo(() => {
    if (freqPeriods.length > 0 && !freqPeriods.includes(selectedPeriod)) {
      setSelectedPeriod(freqPeriods[freqPeriods.length - 1])
    }
  }, [freqPeriods, selectedPeriod])

  const monthStats = useMemo(() => {
    const paidStreams = freqStreams.filter(s => {
      const r = incomeReceipts.find(x => x.streamId === s.id && x.month === selectedPeriod)
      return r?.paid
    })
    const collected = paidStreams.reduce((s, x) => s + (Number(x.monthlyAmount) || 0), 0)
    const expected = freqStreams.reduce((s, x) => s + (Number(x.monthlyAmount) || 0), 0)
    return {
      paidCount: paidStreams.length,
      unpaidCount: freqStreams.length - paidStreams.length,
      collected,
      expected,
      percent: expected ? Math.round((collected / expected) * 100) : 0
    }
  }, [freqStreams, incomeReceipts, selectedPeriod])

  // Counts per frequency for the tabs
  const freqCounts = useMemo(() => ({
    monthly: activeStreams.filter(s => (s.frequency || 'monthly') === 'monthly').length,
    'bi-monthly': activeStreams.filter(s => s.frequency === 'bi-monthly').length,
    yearly: activeStreams.filter(s => s.frequency === 'yearly').length
  }), [activeStreams])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">הכנסות נוספות</h1>
          <p className="text-slate-500">חניות, מחסנים, השכרות וכל הכנסה חוזרת אחרת</p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-white rounded-xl p-1 border border-slate-200">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${view === 'list' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
            >
              רשימה
            </button>
            <button
              onClick={() => setView('month')}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${view === 'month' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
            >
              גביה חודשית
            </button>
          </div>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <Plus size={18} />
            הוסף הכנסה
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500">צפי חודשי</div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.expectedMonthly)}</div>
          <div className="text-xs text-slate-400">{activeStreams.length} מקורות פעילים</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
          <div className="text-sm text-slate-500">נגבה החודש</div>
          <div className="text-2xl font-bold text-emerald-600">{formatCurrency(stats.collectedThisMonth)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
          <div className="text-sm text-slate-500">סה"כ הכנסות</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.totalCollected)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
          <div className="text-sm text-slate-500">חייבים החודש</div>
          <div className="text-2xl font-bold text-red-600">{stats.debtors.length}</div>
        </div>
      </div>

      {view === 'month' ? (
        <>
          {/* Frequency tabs */}
          <div className="flex bg-white rounded-xl p-1 border border-slate-200 w-fit">
            {['monthly', 'bi-monthly', 'yearly'].map(f => (
              <button
                key={f}
                onClick={() => setFreqTab(f)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-1 ${freqTab === f ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {FREQUENCY_LABELS[f]}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${freqTab === f ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {freqCounts[f]}
                </span>
              </button>
            ))}
          </div>

          {/* Period selector */}
          {freqPeriods.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between">
              <button
                onClick={() => {
                  const idx = freqPeriods.indexOf(selectedPeriod)
                  if (idx > 0) setSelectedPeriod(freqPeriods[idx - 1])
                }}
                disabled={freqPeriods.indexOf(selectedPeriod) === 0}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30"
              >
                <ChevronRight size={20} />
              </button>
              <select
                value={selectedPeriod}
                onChange={e => setSelectedPeriod(e.target.value)}
                className="font-bold text-xl text-slate-900 bg-transparent border-none focus:outline-none cursor-pointer"
              >
                {freqPeriods.map(p => (
                  <option key={p} value={p}>{periodLabel(p, freqTab)}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  const idx = freqPeriods.indexOf(selectedPeriod)
                  if (idx < freqPeriods.length - 1) setSelectedPeriod(freqPeriods[idx + 1])
                }}
                disabled={freqPeriods.indexOf(selectedPeriod) === freqPeriods.length - 1}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">שילמו</div>
              <div className="text-xl font-bold text-emerald-600">{monthStats.paidCount}</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">חייבים</div>
              <div className="text-xl font-bold text-red-600">{monthStats.unpaidCount}</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">נגבה</div>
              <div className="text-lg font-bold text-slate-900">{formatCurrency(monthStats.collected)}</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
              <div className="text-xs text-slate-500">צפי</div>
              <div className="text-lg font-bold text-slate-900">{formatCurrency(monthStats.expected)}</div>
            </div>
          </div>

          {freqStreams.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
              <p className="text-slate-500">
                אין הכנסות {FREQUENCY_LABELS[freqTab]}. עבור לתצוגת רשימה כדי להוסיף.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {freqStreams.map(stream => {
                  const typeInfo = STREAM_TYPES.find(t => t.id === stream.type) || STREAM_TYPES[STREAM_TYPES.length - 1]
                  const Icon = typeInfo.icon
                  const colors = colorClasses[typeInfo.color]
                  const receipt = incomeReceipts.find(r => r.streamId === stream.id && r.month === selectedPeriod)
                  const isPaid = !!receipt?.paid
                  return (
                    <div key={stream.id} className={`p-4 flex items-center gap-4 ${!isPaid ? 'bg-red-50' : ''}`}>
                      <button
                        onClick={() => {
                          if (isPaid) {
                            if (confirm('לסמן כלא שולם?')) setIncomeReceipt(stream.id, selectedPeriod, false)
                          } else {
                            setMethodDialog({ streamId: stream.id, period: selectedPeriod })
                          }
                        }}
                        className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold flex-shrink-0
                          ${isPaid ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-red-100 text-red-600 hover:bg-red-200 border-2 border-red-300'}`}
                      >
                        {isPaid ? <Check size={24} /> : <AlertCircle size={20} />}
                      </button>
                      <div className={`p-2 rounded-lg ${colors.bg}`}>
                        <Icon size={18} className={colors.text} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900">{stream.name}</div>
                        <div className="text-xs text-slate-500">
                          {stream.renterName ? `שוכר: ${stream.renterName}` : 'ללא שוכר'} · {typeInfo.label}
                        </div>
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-slate-900">{formatCurrency(stream.monthlyAmount)}</div>
                        <div className={`text-xs ${isPaid ? 'text-emerald-600' : 'text-red-600 font-semibold'}`}>
                          {isPaid ? (
                            receipt?.method ? (
                              <span>שולם {getMethodInfo(receipt.method).emoji} {getMethodInfo(receipt.method).label}</span>
                            ) : 'שולם'
                          ) : 'לא שולם'}
                        </div>
                      </div>
                      {!isPaid && stream.renterPhone && (
                        <a
                          href={`https://wa.me/972${stream.renterPhone.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(`שלום ${stream.renterName || ''}, תזכורת - תשלום ${stream.name} עבור ${periodLabel(selectedPeriod, freqTab)} בסך ${formatCurrency(stream.monthlyAmount)} עדיין לא שולם.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                        >
                          <MessageCircle size={18} />
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        // List view
        <>
          {incomeStreams.length === 0 ? (
            <EmptyState onAdd={() => setShowForm(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {incomeStreams.sort((a, b) => (a.name || '').localeCompare(b.name || '')).map(stream => {
                const typeInfo = STREAM_TYPES.find(t => t.id === stream.type) || STREAM_TYPES[STREAM_TYPES.length - 1]
                const Icon = typeInfo.icon
                const colors = colorClasses[typeInfo.color]
                const receipts = incomeReceipts.filter(r => r.streamId === stream.id)
                const totalReceived = receipts.filter(r => r.paid).reduce((s, r) => s + (Number(r.amount) || 0), 0)
                const paidCount = receipts.filter(r => r.paid).length
                return (
                  <div key={stream.id} className={`bg-white rounded-2xl p-5 shadow-sm border ${stream.active ? 'border-slate-100' : 'border-slate-200 opacity-60'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`p-2 rounded-lg ${colors.bg}`}>
                          <Icon size={20} className={colors.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-slate-900 truncate">{stream.name}</h3>
                          <p className="text-xs text-slate-500">{typeInfo.label}</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(stream)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(stream)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 mb-3">
                      <div className="text-xs text-slate-500">
                        סכום {stream.frequency === 'bi-monthly' ? 'דו-חודשי' : stream.frequency === 'yearly' ? 'שנתי' : 'חודשי'}
                      </div>
                      <div className="text-2xl font-bold text-slate-900">{formatCurrency(stream.monthlyAmount)}</div>
                      {stream.frequency && stream.frequency !== 'monthly' && (
                        <div className="text-xs text-slate-400 mt-1">
                          ≈ {formatCurrency(monthlyEquivalent(stream.monthlyAmount, stream.frequency))}/חודש
                        </div>
                      )}
                    </div>

                    {stream.renterName && (
                      <div className="text-sm text-slate-600 mb-1">
                        שוכר: <strong>{stream.renterName}</strong>
                      </div>
                    )}
                    {stream.renterPhone && (
                      <div className="text-sm text-slate-500 mb-2" dir="ltr">
                        {stream.renterPhone}
                      </div>
                    )}
                    {stream.notes && (
                      <div className="text-xs text-slate-500 bg-slate-50 rounded p-2 mb-2">
                        {stream.notes}
                      </div>
                    )}

                    <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <span>נגבה: <strong className="text-emerald-600">{formatCurrency(totalReceived)}</strong></span>
                      <span>{paidCount} חודשים</span>
                    </div>
                    {stream.attachments?.length > 0 && (
                      <div className="text-xs text-blue-600 font-semibold bg-blue-50 rounded px-2 py-1 inline-block mt-2 mr-2">
                        📎 {stream.attachments.length} מסמכים
                      </div>
                    )}
                    {!stream.active && (
                      <div className="text-xs text-amber-600 font-semibold bg-amber-50 rounded px-2 py-1 inline-block mt-2">
                        לא פעיל
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {editingId ? 'ערוך הכנסה' : 'הכנסה חדשה'}
              </h3>
              <button
                onClick={() => { setShowForm(false); setEditingId(null) }}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">סוג</label>
                <div className="grid grid-cols-3 gap-2">
                  {STREAM_TYPES.map(t => {
                    const Icon = t.icon
                    const colors = colorClasses[t.color]
                    const isActive = form.type === t.id
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setForm({ ...form, type: t.id })}
                        className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1 ${isActive ? `${colors.border} ${colors.bg} ${colors.text} font-semibold` : 'border-slate-200 text-slate-600'}`}
                      >
                        <Icon size={18} />
                        <span className="text-xs">{t.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שם / תיאור</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="חניה 1, מחסן קומה ב'..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תדירות גביה</label>
                <div className="grid grid-cols-3 gap-2">
                  {['monthly', 'bi-monthly', 'yearly'].map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setForm({ ...form, frequency: f })}
                      className={`p-2 rounded-lg border-2 text-sm font-semibold ${form.frequency === f ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
                    >
                      {FREQUENCY_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  סכום {form.frequency === 'monthly' ? 'חודשי' : form.frequency === 'bi-monthly' ? 'דו-חודשי' : 'שנתי'} (₪)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.monthlyAmount}
                  onChange={e => setForm({ ...form, monthlyAmount: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  required
                />
                {form.monthlyAmount && form.frequency !== 'monthly' && (
                  <p className="text-xs text-slate-500 mt-1">
                    שווה ערך חודשי: <strong>{formatCurrency(monthlyEquivalent(form.monthlyAmount, form.frequency))}</strong>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שם שוכר (אופציונלי)</label>
                <input
                  type="text"
                  value={form.renterName}
                  onChange={e => setForm({ ...form, renterName: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="שם השוכר"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">טלפון שוכר (אופציונלי)</label>
                <input
                  type="tel"
                  value={form.renterPhone}
                  onChange={e => setForm({ ...form, renterPhone: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="050-1234567"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">הערות</label>
                <textarea
                  value={form.notes}
                  onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  rows={2}
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={e => setForm({ ...form, active: e.target.checked })}
                  className="rounded"
                />
                פעיל (חישוב בצפי החודשי)
              </label>

              <div className="border-t border-slate-200 pt-4">
                <AttachmentManager
                  attachments={form.attachments}
                  onChange={(atts) => setForm({ ...form, attachments: atts })}
                  label="חוזים ומסמכים"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
                  {editingId ? 'עדכן' : 'הוסף'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingId(null) }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {methodDialog && (() => {
        const stream = activeStreams.find(s => s.id === methodDialog.streamId)
        return (
          <PaymentMethodDialog
            subtitle={`${stream?.name || ''} · ${periodLabel(methodDialog.period, stream?.frequency || 'monthly')}`}
            amount={stream?.monthlyAmount || 0}
            onConfirm={(method, paidDate, note) => {
              setIncomeReceipt(methodDialog.streamId, methodDialog.period, true, { method, paidDate, note })
              setMethodDialog(null)
            }}
            onClose={() => setMethodDialog(null)}
          />
        )
      })()}
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
      <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Car size={28} className="text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-1">אין הכנסות נוספות</h3>
      <p className="text-slate-500 mb-4">הוסף חניות, מחסנים, השכרות וכל הכנסה חוזרת אחרת של הבניין</p>
      <button
        onClick={onAdd}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
      >
        הוסף הכנסה ראשונה
      </button>
    </div>
  )
}
