import { useState, useMemo, useRef } from 'react'
import {
  Wallet, Upload, Save, RefreshCw, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, FileText, X, Trash2, Search, AlertCircle, Calendar
} from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { formatCurrency, formatDate, compareStringDesc } from '../utils/format.js'
import { parseBankCSV, autoMatchTransaction } from '../utils/bankParser.js'

export default function Treasury() {
  const {
    building, tenants, payments, expenses, projects, projectPayments,
    incomeStreams, incomeReceipts, bankTransactions, balanceUpdates,
    addBalanceUpdate, deleteBalanceUpdate,
    addBankTransactions, updateBankTransaction, deleteBankTransaction, deleteBatchTransactions
  } = useData()

  const [tab, setTab] = useState('overview')
  const [showBalanceForm, setShowBalanceForm] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importPreview, setImportPreview] = useState(null) // {transactions, errors, fileName}
  const [importing, setImporting] = useState(false)
  const fileRef = useRef()

  // ===== Calculated balance =====
  const calculated = useMemo(() => {
    const vaadIncome = payments.filter(p => p.paid).reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const projectIncome = projectPayments.filter(p => p.paid).reduce((s, p) => s + (Number(p.amount) || 0), 0)
    const additionalIncome = incomeReceipts.filter(r => r.paid).reduce((s, r) => s + (Number(r.amount) || 0), 0)
    const totalIncome = vaadIncome + projectIncome + additionalIncome
    const totalExpenses = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
    return {
      vaadIncome,
      projectIncome,
      additionalIncome,
      totalIncome,
      totalExpenses,
      balance: totalIncome - totalExpenses
    }
  }, [payments, projectPayments, incomeReceipts, expenses])

  // ===== Latest manual balance =====
  const latestManual = useMemo(() => {
    const sorted = [...balanceUpdates].sort((a, b) => compareStringDesc(a.date, b.date))
    return sorted[0] || null
  }, [balanceUpdates])

  const discrepancy = latestManual ? Math.round((calculated.balance - latestManual.amount) * 100) / 100 : null

  // ===== Bank transactions stats =====
  const bankStats = useMemo(() => {
    const totalIncome = bankTransactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
    const totalExpense = bankTransactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)
    const matched = bankTransactions.filter(t => t.matchedTo).length
    const unmatched = bankTransactions.length - matched
    return { totalIncome, totalExpense, matched, unmatched, total: bankTransactions.length }
  }, [bankTransactions])

  // ===== File import =====
  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target.result
      const result = parseBankCSV(text)
      setImportPreview({ ...result, fileName: file.name })
      setShowImportDialog(true)
    }
    reader.onerror = () => alert('שגיאה בקריאת הקובץ')
    // Try UTF-8 first, fallback handled by browser
    reader.readAsText(file, 'UTF-8')
  }

  const handleTextPaste = (text, fileName = 'paste') => {
    const result = parseBankCSV(text)
    setImportPreview({ ...result, fileName })
    setShowImportDialog(true)
  }

  const confirmImport = async () => {
    if (!importPreview?.transactions?.length) return
    setImporting(true)
    try {
      // Auto-match before saving
      const enriched = importPreview.transactions.map(tx => ({
        ...tx,
        matchedTo: autoMatchTransaction(tx, {
          tenants, payments, expenses, incomeStreams, building
        })
      }))
      const batchId = `batch-${Date.now()}`
      await addBankTransactions(enriched, batchId, importPreview.fileName)
      setShowImportDialog(false)
      setImportPreview(null)
      setTab('reconcile')
    } catch (err) {
      alert('שגיאה בייבוא: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">מצב קופה</h1>
        <p className="text-slate-500">חישוב יתרה אוטומטי, עדכון ידני, וייבוא מהבנק</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 border border-slate-200 w-fit overflow-x-auto">
        <button
          onClick={() => setTab('overview')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap ${tab === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
        >
          סקירה
        </button>
        <button
          onClick={() => setTab('reconcile')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap flex items-center gap-1 ${tab === 'reconcile' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
        >
          התאמה לבנק
          {bankStats.total > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === 'reconcile' ? 'bg-white/20' : 'bg-blue-100 text-blue-700'}`}>
              {bankStats.total}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('history')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap ${tab === 'history' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
        >
          היסטוריה ידנית
        </button>
      </div>

      {tab === 'overview' && (
        <>
          {/* Main balance cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Calculated */}
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-2 text-blue-100 text-sm mb-2">
                <RefreshCw size={16} />
                יתרה מחושבת
              </div>
              <div className="text-4xl font-bold mb-1">{formatCurrency(calculated.balance)}</div>
              <div className="text-blue-100 text-xs">לפי הנתונים שהוזנו במערכת</div>
            </div>

            {/* Manual */}
            <div className={`rounded-2xl p-6 shadow-lg ${latestManual ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white' : 'bg-white border-2 border-dashed border-slate-300'}`}>
              {latestManual ? (
                <>
                  <div className="flex items-center gap-2 text-emerald-100 text-sm mb-2">
                    <Wallet size={16} />
                    יתרה אמיתית (מהבנק)
                  </div>
                  <div className="text-4xl font-bold mb-1">{formatCurrency(latestManual.amount)}</div>
                  <div className="text-emerald-100 text-xs">עודכן {formatDate(latestManual.date)}</div>
                  <button
                    onClick={() => setShowBalanceForm(true)}
                    className="mt-3 bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-sm font-semibold"
                  >
                    עדכן שוב
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-slate-500 text-sm mb-2">
                    <Wallet size={16} />
                    יתרה אמיתית (מהבנק)
                  </div>
                  <div className="text-2xl font-bold text-slate-400 mb-3">לא הוזן עדיין</div>
                  <button
                    onClick={() => setShowBalanceForm(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold w-full"
                  >
                    עדכן יתרה
                  </button>
                </>
              )}
            </div>

            {/* Discrepancy */}
            {latestManual && (
              <div className={`rounded-2xl p-6 shadow-lg ${Math.abs(discrepancy) < 1 ? 'bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-200' : 'bg-gradient-to-br from-red-50 to-white border-2 border-red-300'}`}>
                <div className="flex items-center gap-2 text-sm mb-2">
                  {Math.abs(discrepancy) < 1 ? (
                    <>
                      <CheckCircle2 size={16} className="text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">הכל תואם ✓</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={16} className="text-red-600" />
                      <span className="text-red-700 font-semibold">פער</span>
                    </>
                  )}
                </div>
                <div className={`text-4xl font-bold mb-1 ${Math.abs(discrepancy) < 1 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {discrepancy > 0 ? '+' : ''}{formatCurrency(discrepancy)}
                </div>
                <div className="text-slate-600 text-xs">
                  {Math.abs(discrepancy) < 1
                    ? 'הספר מתאים למציאות'
                    : discrepancy > 0
                      ? 'במציאות יש פחות - אולי שכחת לרשום הוצאה'
                      : 'במציאות יש יותר - אולי שכחת לרשום הכנסה'
                  }
                </div>
              </div>
            )}
          </div>

          {/* Income/Expense breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <TrendingUp className="text-emerald-500" size={18} />
                הכנסות מצטברות
              </h3>
              <div className="space-y-2">
                <Row label="דמי ועד" value={calculated.vaadIncome} color="text-slate-700" />
                <Row label="פרויקטים" value={calculated.projectIncome} color="text-slate-700" />
                <Row label="הכנסות נוספות (חניות/מחסנים)" value={calculated.additionalIncome} color="text-slate-700" />
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold">
                  <span>סה"כ</span>
                  <span className="text-emerald-600">{formatCurrency(calculated.totalIncome)}</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                <TrendingDown className="text-red-500" size={18} />
                הוצאות מצטברות
              </h3>
              <div className="text-3xl font-bold text-red-600">{formatCurrency(calculated.totalExpenses)}</div>
              <div className="text-sm text-slate-500 mt-1">{expenses.length} רישומים</div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3">פעולות מהירות</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => setShowBalanceForm(true)}
                className="flex items-center gap-3 p-4 border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 rounded-xl transition-colors"
              >
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <Wallet size={20} className="text-emerald-600" />
                </div>
                <div className="text-right flex-1">
                  <div className="font-semibold text-slate-900">עדכן יתרת בנק</div>
                  <div className="text-xs text-slate-500">הזן את היתרה האמיתית מהבנק</div>
                </div>
              </button>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-3 p-4 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-colors"
              >
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Upload size={20} className="text-blue-600" />
                </div>
                <div className="text-right flex-1">
                  <div className="font-semibold text-slate-900">ייבא תנועות מהבנק</div>
                  <div className="text-xs text-slate-500">העלה קובץ CSV/Excel מאתר הבנק</div>
                </div>
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt,.tsv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </>
      )}

      {tab === 'reconcile' && (
        <ReconcileView
          bankTransactions={bankTransactions}
          tenants={tenants}
          payments={payments}
          expenses={expenses}
          incomeStreams={incomeStreams}
          building={building}
          onUpdateTransaction={updateBankTransaction}
          onDeleteTransaction={deleteBankTransaction}
          onDeleteBatch={deleteBatchTransactions}
          onImport={() => fileRef.current?.click()}
          onPaste={handleTextPaste}
          fileRefForPaste={fileRef}
          handleFileSelect={handleFileSelect}
        />
      )}

      {tab === 'history' && (
        <BalanceHistory
          balanceUpdates={balanceUpdates}
          calculatedBalance={calculated.balance}
          onAdd={() => setShowBalanceForm(true)}
          onDelete={deleteBalanceUpdate}
        />
      )}

      {showBalanceForm && (
        <BalanceUpdateForm
          calculatedBalance={calculated.balance}
          onClose={() => setShowBalanceForm(false)}
          onSave={async (amount, date, notes) => {
            await addBalanceUpdate(amount, date, notes)
            setShowBalanceForm(false)
          }}
        />
      )}

      {showImportDialog && importPreview && (
        <ImportPreviewDialog
          preview={importPreview}
          tenants={tenants}
          building={building}
          incomeStreams={incomeStreams}
          payments={payments}
          expenses={expenses}
          onConfirm={confirmImport}
          onCancel={() => { setShowImportDialog(false); setImportPreview(null) }}
          importing={importing}
        />
      )}
    </div>
  )
}

const Row = ({ label, value, color }) => (
  <div className="flex justify-between text-sm">
    <span className="text-slate-500">{label}</span>
    <span className={`font-semibold ${color}`}>{formatCurrency(value)}</span>
  </div>
)

function BalanceUpdateForm({ calculatedBalance, onClose, onSave }) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!amount) return
    setSaving(true)
    try {
      await onSave(amount, date, notes)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-slate-900">עדכון יתרה</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-blue-50 rounded-lg p-3 text-sm">
            <div className="text-blue-900">
              יתרה מחושבת לפי הספר: <strong>{formatCurrency(calculatedBalance)}</strong>
            </div>
            <div className="text-blue-700 text-xs mt-1">
              הזן את היתרה האמיתית מהבנק כדי שהמערכת תראה אם יש פער
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">יתרה בבנק (₪)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xl font-bold"
              placeholder="0"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">תאריך הבדיקה</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">הערות</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              placeholder="אופציונלי"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
            >
              <Save size={16} className="inline ml-1" />
              {saving ? 'שומר...' : 'שמור'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BalanceHistory({ balanceUpdates, calculatedBalance, onAdd, onDelete }) {
  const sorted = [...balanceUpdates].sort((a, b) => compareStringDesc(a.date, b.date))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-bold text-slate-900">עדכוני יתרה ידניים ({sorted.length})</h3>
        <button
          onClick={onAdd}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-semibold text-sm"
        >
          + עדכן
        </button>
      </div>
      {sorted.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Calendar size={48} className="mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">אין עדכונים ידניים עדיין</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {sorted.map(u => {
              const diff = Math.round((calculatedBalance - u.amount) * 100) / 100
              return (
                <div key={u.id} className="p-4 flex items-center gap-3 hover:bg-slate-50">
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <Wallet size={18} className="text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900">{formatCurrency(u.amount)}</div>
                    <div className="text-xs text-slate-500">
                      {formatDate(u.date)}
                      {u.notes && ` · ${u.notes}`}
                    </div>
                  </div>
                  <button
                    onClick={() => { if (confirm('למחוק עדכון זה?')) onDelete(u.id) }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function ReconcileView({
  bankTransactions, tenants, payments, expenses, incomeStreams, building,
  onUpdateTransaction, onDeleteTransaction, onDeleteBatch, onImport, onPaste, handleFileSelect
}) {
  const [filter, setFilter] = useState('all') // all | unmatched | matched | discrepancy
  const [pasteText, setPasteText] = useState('')
  const [showPaste, setShowPaste] = useState(false)

  const sorted = useMemo(() =>
    [...bankTransactions].sort((a, b) => compareStringDesc(a.date, b.date))
  , [bankTransactions])

  const filtered = useMemo(() => {
    if (filter === 'all') return sorted
    if (filter === 'matched') return sorted.filter(t => t.matchedTo)
    if (filter === 'unmatched') return sorted.filter(t => !t.matchedTo)
    return sorted
  }, [sorted, filter])

  const batches = useMemo(() => {
    const map = {}
    bankTransactions.forEach(t => {
      if (!map[t.batchId]) map[t.batchId] = { id: t.batchId, fileName: t.fileName, count: 0 }
      map[t.batchId].count++
    })
    return Object.values(map)
  }, [bankTransactions])

  if (bankTransactions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-slate-300">
          <Upload size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">אין נתונים מהבנק עדיין</h3>
          <p className="text-slate-500 mb-4">העלה קובץ CSV מאתר הבנק או הדבק טקסט</p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={onImport}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold flex items-center gap-2"
            >
              <Upload size={16} />
              העלה קובץ
            </button>
            <button
              onClick={() => setShowPaste(true)}
              className="bg-white border-2 border-blue-300 hover:bg-blue-50 text-blue-700 px-6 py-2 rounded-lg font-semibold"
            >
              הדבק טקסט
            </button>
          </div>
        </div>

        {showPaste && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">הדבק נתוני בנק</h3>
                <button onClick={() => setShowPaste(false)} className="p-1 text-slate-400 hover:text-slate-700">
                  <X size={20} />
                </button>
              </div>
              <p className="text-sm text-slate-500 mb-3">
                הדבק כאן את הטבלה מאתר הבנק (העתק מהדפדפן או מאקסל)
              </p>
              <textarea
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
                rows={10}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="תאריך	תיאור	חובה	זכות	יתרה
01/04/2026	תשלום ועד דירה 3	0	250	5250"
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { onPaste(pasteText, 'paste'); setShowPaste(false); setPasteText('') }}
                  disabled={!pasteText.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold disabled:opacity-50"
                >
                  עבד נתונים
                </button>
                <button
                  onClick={() => setShowPaste(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold"
                >
                  ביטול
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  const matchedCount = sorted.filter(t => t.matchedTo).length
  const unmatchedCount = sorted.length - matchedCount

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
          <div className="text-xs text-slate-500">תנועות סה"כ</div>
          <div className="text-xl font-bold">{sorted.length}</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-emerald-100">
          <div className="text-xs text-slate-500">הותאמו</div>
          <div className="text-xl font-bold text-emerald-600">{matchedCount}</div>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm border border-amber-100">
          <div className="text-xs text-slate-500">לא הותאמו</div>
          <div className="text-xl font-bold text-amber-600">{unmatchedCount}</div>
        </div>
        <button
          onClick={onImport}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl p-3 font-semibold flex items-center justify-center gap-2"
        >
          <Upload size={16} />
          ייבא עוד
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200'}`}>
          הכל ({sorted.length})
        </button>
        <button onClick={() => setFilter('unmatched')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${filter === 'unmatched' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200'}`}>
          לא הותאמו ({unmatchedCount})
        </button>
        <button onClick={() => setFilter('matched')} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${filter === 'matched' ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200'}`}>
          הותאמו ({matchedCount})
        </button>
      </div>

      {/* Transactions list */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filtered.map(tx => (
            <BankTxRow
              key={tx.id}
              tx={tx}
              tenants={tenants}
              expenses={expenses}
              onDelete={() => { if (confirm('למחוק תנועה זו?')) onDeleteTransaction(tx.id) }}
            />
          ))}
        </div>
      </div>

      {/* Batches */}
      {batches.length > 1 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <h4 className="font-semibold text-slate-900 mb-2 text-sm">קבצים שיובאו</h4>
          <div className="space-y-1">
            {batches.map(b => (
              <div key={b.id} className="flex items-center justify-between text-sm bg-slate-50 rounded p-2">
                <span className="truncate">{b.fileName || 'הדבקה'} - {b.count} תנועות</span>
                <button
                  onClick={() => { if (confirm(`למחוק את כל ${b.count} התנועות מקובץ זה?`)) onDeleteBatch(b.id) }}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function BankTxRow({ tx, tenants, expenses, onDelete }) {
  const isIncome = tx.amount > 0
  return (
    <div className="p-3 flex items-center gap-3 hover:bg-slate-50">
      <div className={`p-2 rounded-lg ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
        {isIncome ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900 text-sm truncate">{tx.description || 'ללא תיאור'}</div>
        <div className="text-xs text-slate-500">{formatDate(tx.date)}</div>
        {tx.matchedTo ? (
          <MatchBadge match={tx.matchedTo} tenants={tenants} expenses={expenses} />
        ) : (
          <div className="text-xs text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
            <AlertCircle size={12} />
            לא נמצאה התאמה
          </div>
        )}
      </div>
      <div className="text-left">
        <div className={`font-bold ${isIncome ? 'text-emerald-600' : 'text-red-600'}`}>
          {isIncome ? '+' : ''}{formatCurrency(tx.amount)}
        </div>
        {tx.balance !== null && tx.balance !== undefined && (
          <div className="text-xs text-slate-400">יתרה: {formatCurrency(tx.balance)}</div>
        )}
      </div>
      <button onClick={onDelete} className="p-1 text-slate-400 hover:text-red-600">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function MatchBadge({ match, tenants, expenses }) {
  let label = ''
  let color = 'emerald'

  if (match.type === 'vaad-payment') {
    label = `תשלום ועד · דירה ${match.apartmentNumber}`
  } else if (match.type === 'additional-income') {
    label = `הכנסה: ${match.streamName}`
  } else if (match.type === 'expense') {
    label = `הוצאה: ${match.description}`
  }

  if (match.confidence === 'low') color = 'amber'
  else if (match.confidence === 'medium') color = 'blue'

  const colorMap = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200'
  }

  return (
    <div className={`text-xs font-semibold mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded border ${colorMap[color]}`}>
      <CheckCircle2 size={10} />
      {label}
    </div>
  )
}

function ImportPreviewDialog({ preview, tenants, building, incomeStreams, payments, expenses, onConfirm, onCancel, importing }) {
  const enriched = useMemo(() =>
    preview.transactions.map(tx => ({
      ...tx,
      matchedTo: autoMatchTransaction(tx, { tenants, payments, expenses, incomeStreams, building })
    }))
  , [preview, tenants, payments, expenses, incomeStreams, building])

  const matched = enriched.filter(t => t.matchedTo).length
  const totalIncome = enriched.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0)
  const totalExpense = enriched.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-slate-900">תצוגה מקדימה</h3>
            <p className="text-sm text-slate-500">{preview.fileName} · {enriched.length} תנועות</p>
          </div>
          <button onClick={onCancel} className="p-1 text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>

        {preview.errors.length > 0 && (
          <div className="m-6 mb-0 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <strong>שגיאות:</strong>
            <ul className="list-disc mr-5 mt-1">
              {preview.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        )}

        <div className="p-6 grid grid-cols-3 gap-3">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-500">תנועות</div>
            <div className="text-2xl font-bold">{enriched.length}</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center">
            <div className="text-xs text-emerald-600">הכנסות</div>
            <div className="text-lg font-bold text-emerald-700">+{formatCurrency(totalIncome)}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <div className="text-xs text-red-600">הוצאות</div>
            <div className="text-lg font-bold text-red-700">-{formatCurrency(totalExpense)}</div>
          </div>
        </div>

        <div className="px-6 pb-2 text-sm text-slate-600">
          התאמה אוטומטית: <strong className="text-emerald-600">{matched}</strong> מתוך {enriched.length}
        </div>

        <div className="flex-1 overflow-y-auto px-6 scrollbar-thin">
          <div className="divide-y divide-slate-100">
            {enriched.slice(0, 100).map((tx, i) => (
              <div key={i} className="py-2 flex items-center gap-2 text-sm">
                <span className="text-slate-500 text-xs w-20 flex-shrink-0">{formatDate(tx.date)}</span>
                <span className="flex-1 truncate">{tx.description}</span>
                <span className={`font-bold w-24 text-left ${tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                </span>
                {tx.matchedTo ? (
                  <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                ) : (
                  <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                )}
              </div>
            ))}
            {enriched.length > 100 && (
              <div className="py-2 text-center text-xs text-slate-400">
                ... ועוד {enriched.length - 100} תנועות
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex gap-2">
          <button
            onClick={onConfirm}
            disabled={importing || enriched.length === 0}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold disabled:opacity-50"
          >
            {importing ? 'מייבא...' : `ייבא ${enriched.length} תנועות`}
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-semibold"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}
