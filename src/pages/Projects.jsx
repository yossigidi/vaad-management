import { useState, useMemo } from 'react'
import { Plus, Trash2, Hammer, Check, AlertCircle, ChevronRight, X, MessageCircle, Receipt, Edit2 } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { formatCurrency, formatDate } from '../utils/format.js'
import PaymentMethodDialog from '../components/PaymentMethodDialog.jsx'
import { getMethodInfo } from '../utils/paymentMethods.js'

export default function Projects() {
  const {
    building, tenants, projects, projectPayments,
    addProject, updateProject, deleteProject, setProjectPayment,
    expenses, addExpense, updateExpense, deleteExpense, categories
  } = useData()

  const [showForm, setShowForm] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [editingProjectId, setEditingProjectId] = useState(null)

  const emptyForm = {
    name: '',
    description: '',
    totalAmount: '',
    startDate: new Date().toISOString().slice(0, 10)
  }
  const [form, setForm] = useState(emptyForm)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.totalAmount) return
    const payload = {
      ...form,
      totalAmount: parseFloat(form.totalAmount) || 0
    }
    if (editingProjectId) {
      updateProject(editingProjectId, payload)
    } else {
      addProject(payload)
    }
    setShowForm(false)
    setEditingProjectId(null)
    setForm(emptyForm)
  }

  const startEditProject = (project) => {
    setForm({
      name: project.name,
      description: project.description || '',
      totalAmount: String(project.totalAmount),
      startDate: project.startDate
    })
    setEditingProjectId(project.id)
    setShowForm(true)
  }

  const handleDelete = (project) => {
    if (confirm(`למחוק את הפרויקט "${project.name}"? כל התשלומים וההוצאות שלו יימחקו.`)) {
      deleteProject(project.id)
      if (selectedProject?.id === project.id) setSelectedProject(null)
    }
  }

  const sortedProjects = useMemo(
    () => [...projects].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [projects]
  )

  if (selectedProject) {
    const fresh = projects.find(p => p.id === selectedProject.id)
    if (!fresh) {
      setSelectedProject(null)
      return null
    }
    return (
      <ProjectDetail
        project={fresh}
        onBack={() => setSelectedProject(null)}
        onEdit={() => startEditProject(fresh)}
        building={building}
        tenants={tenants}
        projectPayments={projectPayments}
        setProjectPayment={setProjectPayment}
        expenses={expenses}
        addExpense={addExpense}
        updateExpense={updateExpense}
        deleteExpense={deleteExpense}
        categories={categories}
        updateProject={updateProject}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">פרויקטים</h1>
          <p className="text-slate-500">שיפוצים, התקנות ופרויקטים מיוחדים</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingProjectId(null); setForm(emptyForm) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm"
        >
          <Plus size={18} />
          פרויקט חדש
        </button>
      </div>

      {sortedProjects.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
          <Hammer size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">אין פרויקטים פעילים</h3>
          <p className="text-slate-500 mb-4">צור פרויקט חדש כדי להתחיל לעקוב אחרי התקציב והגביה</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            צור פרויקט ראשון
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedProjects.map(project => {
            const projectPays = projectPayments.filter(pp => pp.projectId === project.id && pp.paid)
            const collected = projectPays.reduce((s, pp) => s + (pp.amount || 0), 0)
            const projectExpenses = expenses.filter(e => e.projectId === project.id)
            const spent = projectExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
            const collectedPercent = project.totalAmount ? Math.round((collected / project.totalAmount) * 100) : 0
            const debtorsCount = tenants.filter(t => t.active).length - projectPays.length

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedProject(project)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="bg-amber-100 text-amber-600 p-2 rounded-lg">
                      <Hammer size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 truncate">{project.name}</h3>
                      <p className="text-xs text-slate-500">{formatDate(project.startDate)}</p>
                    </div>
                  </div>
                  <div className={`text-xs font-semibold px-2 py-1 rounded ${project.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {project.status === 'active' ? 'פעיל' : 'הושלם'}
                  </div>
                </div>

                {project.description && (
                  <p className="text-sm text-slate-600 mb-3 line-clamp-2">{project.description}</p>
                )}

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">גביה</span>
                      <span className="font-semibold text-emerald-600">{collectedPercent}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${collectedPercent}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="text-xs text-slate-500">סה"כ</div>
                      <div className="font-bold text-slate-900">{formatCurrency(project.totalAmount)}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="text-xs text-slate-500">לדייר</div>
                      <div className="font-bold text-slate-900">{formatCurrency(project.perTenantAmount)}</div>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                    <span>נגבה: <strong className="text-emerald-600">{formatCurrency(collected)}</strong></span>
                    <span>הוצא: <strong className="text-amber-600">{formatCurrency(spent)}</strong></span>
                  </div>
                  {debtorsCount > 0 && (
                    <div className="flex items-center gap-1 text-xs text-red-600 font-semibold">
                      <AlertCircle size={12} />
                      {debtorsCount} חייבים
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {editingProjectId ? 'ערוך פרויקט' : 'פרויקט חדש'}
              </h3>
              <button
                onClick={() => { setShowForm(false); setEditingProjectId(null) }}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שם הפרויקט</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="צביעת חדר מדרגות"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תיאור</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  placeholder="פרטים על הפרויקט..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">סכום כולל (₪)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.totalAmount}
                  onChange={e => setForm({ ...form, totalAmount: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="0"
                  required
                />
                {form.totalAmount && (
                  <p className="text-xs text-slate-500 mt-1">
                    כל דייר ישלם: <strong className="text-blue-600">
                      {formatCurrency(parseFloat(form.totalAmount) / tenants.filter(t => t.active).length)}
                    </strong>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">תאריך התחלה</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm({ ...form, startDate: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
                  {editingProjectId ? 'עדכן' : 'צור'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingProjectId(null) }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectDetail({
  project, onBack, onEdit, building, tenants, projectPayments, setProjectPayment,
  expenses, addExpense, updateExpense, deleteExpense, categories, updateProject
}) {
  const [tab, setTab] = useState('payments')
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpenseId, setEditingExpenseId] = useState(null)
  const [methodDialog, setMethodDialog] = useState(null) // tenantId or null
  const emptyExpense = {
    type: 'variable',
    category: categories[0] || 'אחר',
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10)
  }
  const [expenseForm, setExpenseForm] = useState(emptyExpense)

  const activeTenants = tenants.filter(t => t.active).sort((a, b) => a.apartmentNumber - b.apartmentNumber)

  const projectPays = projectPayments.filter(pp => pp.projectId === project.id && pp.paid)
  const collected = projectPays.reduce((s, pp) => s + (pp.amount || 0), 0)
  const collectedPercent = project.totalAmount ? Math.round((collected / project.totalAmount) * 100) : 0

  const projectExpenses = expenses.filter(e => e.projectId === project.id)
  const spent = projectExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0)
  const remaining = project.totalAmount - spent

  const reminderText = (tenantName) => {
    return `שלום ${tenantName},\nתזכורת - השתתפות בפרויקט "${project.name}" בסך ${formatCurrency(project.perTenantAmount)} עדיין לא שולמה.\nאנא דאגו להעביר בהקדם.\nתודה,\nועד בית ${building.name}`
  }

  const handleExpenseSubmit = (e) => {
    e.preventDefault()
    if (!expenseForm.description || !expenseForm.amount) return
    const payload = {
      ...expenseForm,
      amount: parseFloat(expenseForm.amount) || 0,
      projectId: project.id
    }
    if (editingExpenseId) {
      updateExpense(editingExpenseId, payload)
    } else {
      addExpense(payload)
    }
    setShowExpenseForm(false)
    setEditingExpenseId(null)
    setExpenseForm(emptyExpense)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"
        >
          <ChevronRight size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 truncate">{project.name}</h1>
          {project.description && <p className="text-slate-500 text-sm">{project.description}</p>}
        </div>
        <button
          onClick={onEdit}
          className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-lg text-sm font-semibold"
        >
          <Edit2 size={14} />
          ערוך
        </button>
        {project.status === 'active' ? (
          <button
            onClick={() => updateProject(project.id, { status: 'completed' })}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-semibold"
          >
            <Check size={14} />
            סמן כהושלם
          </button>
        ) : (
          <button
            onClick={() => updateProject(project.id, { status: 'active' })}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-semibold"
          >
            הפעל מחדש
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500">סכום כולל</div>
          <div className="text-2xl font-bold text-slate-900">{formatCurrency(project.totalAmount)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <div className="text-sm text-slate-500">לכל דייר</div>
          <div className="text-2xl font-bold text-blue-600">{formatCurrency(project.perTenantAmount)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100">
          <div className="text-sm text-slate-500">נגבה</div>
          <div className="text-2xl font-bold text-emerald-600">{formatCurrency(collected)}</div>
          <div className="text-xs text-slate-400">{collectedPercent}%</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-amber-100">
          <div className="text-sm text-slate-500">הוצא</div>
          <div className="text-2xl font-bold text-amber-600">{formatCurrency(spent)}</div>
          <div className="text-xs text-slate-400">יתרה: {formatCurrency(remaining)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 border border-slate-200 w-fit">
        <button
          onClick={() => setTab('payments')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === 'payments' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
        >
          תשלומי דיירים
        </button>
        <button
          onClick={() => setTab('expenses')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm ${tab === 'expenses' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
        >
          הוצאות פרויקט
        </button>
      </div>

      {tab === 'payments' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {activeTenants.map(tenant => {
              const payment = projectPayments.find(pp => pp.projectId === project.id && pp.tenantId === tenant.id)
              const isPaid = !!payment?.paid
              return (
                <div key={tenant.id} className={`p-4 flex items-center gap-4 ${!isPaid ? 'bg-red-50' : ''}`}>
                  <button
                    onClick={() => {
                      if (isPaid) {
                        if (confirm('לסמן כלא שולם?')) setProjectPayment(project.id, tenant.id, false)
                      } else {
                        setMethodDialog(tenant.id)
                      }
                    }}
                    className={`
                      w-12 h-12 rounded-xl flex items-center justify-center font-bold flex-shrink-0
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
                        className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                        title="שלח תזכורת בוואטסאפ"
                      >
                        <MessageCircle size={18} />
                      </a>
                    )}
                    <div className="text-left">
                      <div className="font-bold text-slate-900">{formatCurrency(project.perTenantAmount)}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'expenses' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => { setShowExpenseForm(true); setEditingExpenseId(null); setExpenseForm(emptyExpense) }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
            >
              <Plus size={18} />
              הוצאה חדשה
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {projectExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt size={48} className="mx-auto text-slate-300 mb-3" />
                אין הוצאות לפרויקט הזה עדיין
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {projectExpenses.sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(expense => (
                  <div key={expense.id} className="p-4 flex items-center gap-4 hover:bg-slate-50">
                    <div className="bg-amber-50 text-amber-600 p-2 rounded-lg">
                      <Receipt size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-slate-900">{expense.description}</div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded">{expense.category}</span>
                        <span>{formatDate(expense.date)}</span>
                      </div>
                    </div>
                    <div className="text-xl font-bold text-slate-900">{formatCurrency(expense.amount)}</div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setExpenseForm({
                            type: expense.type,
                            category: expense.category,
                            description: expense.description,
                            amount: String(expense.amount),
                            date: expense.date
                          })
                          setEditingExpenseId(expense.id)
                          setShowExpenseForm(true)
                        }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`למחוק את "${expense.description}"?`)) deleteExpense(expense.id)
                        }}
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
        </>
      )}

      {showExpenseForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-900">
                {editingExpenseId ? 'ערוך הוצאה' : 'הוצאה חדשה'} - {project.name}
              </h3>
              <button
                onClick={() => { setShowExpenseForm(false); setEditingExpenseId(null) }}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">קטגוריה</label>
                <select
                  value={expenseForm.category}
                  onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })}
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
                  value={expenseForm.description}
                  onChange={e => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  placeholder="חומרי בנייה"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">סכום (₪)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">תאריך</label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold">
                  {editingExpenseId ? 'עדכן' : 'הוסף'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowExpenseForm(false); setEditingExpenseId(null) }}
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
        const tenant = activeTenants.find(t => t.id === methodDialog)
        return (
          <PaymentMethodDialog
            subtitle={`${project.name} · דירה ${tenant?.apartmentNumber} - ${tenant?.name}`}
            amount={project.perTenantAmount}
            onConfirm={(method, paidDate, note) => {
              setProjectPayment(project.id, methodDialog, true, { method, paidDate, note })
              setMethodDialog(null)
            }}
            onClose={() => setMethodDialog(null)}
          />
        )
      })()}
    </div>
  )
}
