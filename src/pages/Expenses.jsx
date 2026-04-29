import { useState, useMemo } from 'react'
import { Plus, Trash2, Edit2, X, Check, Repeat, Zap, Filter } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { formatCurrency, formatDate, monthLabel, currentMonth, compareStringDesc } from '../utils/format.js'

export default function Expenses() {
  const { expenses, categories, addExpense, updateExpense, deleteExpense, addCategory, deleteCategory } = useData()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [filter, setFilter] = useState({ type: 'all', category: 'all', month: 'all' })
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [newCategory, setNewCategory] = useState('')

  const emptyForm = {
    type: 'variable',
    category: categories[0] || 'אחר',
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10)
  }
  const [form, setForm] = useState(emptyForm)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.description || !form.amount) return
    const payload = {
      ...form,
      amount: parseFloat(form.amount) || 0,
      projectId: null
    }
    if (editingId) {
      updateExpense(editingId, payload)
    } else {
      addExpense(payload)
    }
    setShowForm(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const startEdit = (expense) => {
    setForm({
      type: expense.type,
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      date: expense.date
    })
    setEditingId(expense.id)
    setShowForm(true)
  }

  const handleDelete = (expense) => {
    if (confirm(`למחוק את ההוצאה "${expense.description}"?`)) {
      deleteExpense(expense.id)
    }
  }

  // Filter only general expenses (not project-specific)
  const generalExpenses = useMemo(() => expenses.filter(e => !e.projectId), [expenses])

  const filtered = useMemo(() => {
    return generalExpenses.filter(e => {
      if (filter.type !== 'all' && e.type !== filter.type) return false
      if (filter.category !== 'all' && e.category !== filter.category) return false
      if (filter.month !== 'all' && !e.date?.startsWith(filter.month)) return false
      return true
    }).sort((a, b) => compareStringDesc(a.date, b.date))
  }, [generalExpenses, filter])

  const stats = useMemo(() => {
    const fixed = generalExpenses.filter(e => e.type === 'fixed').reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const variable = generalExpenses.filter(e => e.type === 'variable').reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const thisMonth = generalExpenses
      .filter(e => e.date?.startsWith(currentMonth()))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0)
    const byCategory = {}
    generalExpenses.forEach(e => {
      byCategory[e.category] = (byCategory[e.category] || 0) + (Number(e.amount) || 0)
    })
    return { fixed, variable, total: fixed + variable, thisMonth, byCategory }
  }, [generalExpenses])

  // Available months for filter
  const availableMonths = useMemo(() => {
    const set = new Set(generalExpenses.map(e => e.date?.slice(0, 7)).filter(Boolean))
    return Array.from(set).sort().reverse()
  }, [generalExpenses])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">הוצאות</h1>
          <p className="text-slate-500">קבועות ומשתנות</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors"
          >
            קטגוריות
          </button>
          <button
            onClick={() => { setShowForm(true); setEditingId(null); setForm(emptyForm) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm transition-colors"
          >
            <Plus size={18} />
            הוצאה חדשה
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Repeat size={16} className="text-blue-500" />
            <div className="text-sm text-slate-500">קבועות</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.fixed)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={16} className="text-amber-500" />
            <div className="text-sm text-slate-500">משתנות</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.variable)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500">סה"כ הוצאות</div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(stats.total)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500">החודש</div>
          <div className="text-2xl font-bold text-amber-600">{formatCurrency(stats.thisMonth)}</div>
        </div>
      </div>

      {/* Category breakdown */}
      {Object.keys(stats.byCategory).length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
          <h3 className="font-semibold text-slate-900 mb-4">לפי קטגוריה</h3>
          <div className="space-y-2">
            {Object.entries(stats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => {
              const percent = stats.total ? Math.round((amount / stats.total) * 100) : 0
              return (
                <div key={cat}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-700 font-medium">{cat}</span>
                    <span className="text-slate-600">{formatCurrency(amount)} ({percent}%)</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-3 flex-wrap">
        <Filter size={16} className="text-slate-400" />
        <select
          value={filter.type}
          onChange={e => setFilter({ ...filter, type: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="all">כל הסוגים</option>
          <option value="fixed">קבועות</option>
          <option value="variable">משתנות</option>
        </select>
        <select
          value={filter.category}
          onChange={e => setFilter({ ...filter, category: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="all">כל הקטגוריות</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filter.month}
          onChange={e => setFilter({ ...filter, month: e.target.value })}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white"
        >
          <option value="all">כל החודשים</option>
          {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <span className="text-sm text-slate-500 mr-auto">
          {filtered.length} הוצאות · {formatCurrency(filtered.reduce((s, e) => s + Number(e.amount || 0), 0))}
        </span>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400">אין הוצאות להצגה</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(expense => (
              <div key={expense.id} className="p-4 flex items-center gap-4 hover:bg-slate-50">
                <div className={`p-2 rounded-lg ${expense.type === 'fixed' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                  {expense.type === 'fixed' ? <Repeat size={18} /> : <Zap size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">{expense.description}</div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="bg-slate-100 px-2 py-0.5 rounded">{expense.category}</span>
                    <span>{formatDate(expense.date)}</span>
                    <span className={expense.type === 'fixed' ? 'text-blue-600' : 'text-amber-600'}>
                      {expense.type === 'fixed' ? 'קבועה' : 'משתנה'}
                    </span>
                  </div>
                </div>
                <div className="text-left">
                  <div className="text-xl font-bold text-slate-900">{formatCurrency(expense.amount)}</div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => startEdit(expense)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(expense)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {editingId ? 'ערוך הוצאה' : 'הוצאה חדשה'}
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'fixed' })}
                    className={`p-3 rounded-lg border-2 font-semibold flex items-center justify-center gap-2 ${form.type === 'fixed' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    <Repeat size={18} />
                    קבועה
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, type: 'variable' })}
                    className={`p-3 rounded-lg border-2 font-semibold flex items-center justify-center gap-2 ${form.type === 'variable' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600'}`}
                  >
                    <Zap size={18} />
                    משתנה
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">קטגוריה</label>
                <select
                  value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  required
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תיאור</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="ניקיון חודש מאי"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">סכום (₪)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">תאריך</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
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

      {/* Category manager modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">ניהול קטגוריות</h3>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (newCategory.trim()) {
                      addCategory(newCategory.trim())
                      setNewCategory('')
                    }
                  }
                }}
                placeholder="שם קטגוריה חדשה"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2"
              />
              <button
                onClick={() => {
                  if (newCategory.trim()) {
                    addCategory(newCategory.trim())
                    setNewCategory('')
                  }
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
              >
                הוסף
              </button>
            </div>
            <div className="space-y-1">
              {categories.map(c => (
                <div key={c} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <span>{c}</span>
                  <button
                    onClick={() => deleteCategory(c)}
                    className="p-1 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
