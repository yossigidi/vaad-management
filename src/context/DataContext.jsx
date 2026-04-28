import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const DataContext = createContext(null)

const STORAGE_KEY = 'vaad-management-data-v1'

const DEFAULT_CATEGORIES = [
  'ניקיון',
  'חשמל',
  'מים',
  'מעלית',
  'גנן',
  'תחזוקה',
  'ביטוח',
  'גז',
  'אינטרנט',
  'אחר'
]

const buildInitialTenants = () => {
  return Array.from({ length: 16 }, (_, i) => ({
    id: `t-${i + 1}`,
    apartmentNumber: i + 1,
    name: `דירה ${i + 1}`,
    phone: '',
    email: '',
    notes: '',
    active: true,
    joinDate: '2026-01-01'
  }))
}

const initialState = {
  building: {
    name: 'ועד בית דוד אלעזר 45',
    address: 'חולון',
    monthlyFee: 250,
    startMonth: '2026-01',
    bankAccount: '',
    contactName: '',
    contactPhone: ''
  },
  tenants: buildInitialTenants(),
  payments: [], // {id, tenantId, month: 'YYYY-MM', amount, paid, paidDate, method, note}
  expenses: [], // {id, type: 'fixed'|'variable', category, description, amount, date, projectId?}
  categories: DEFAULT_CATEGORIES,
  projects: [], // {id, name, description, totalAmount, perTenantAmount, startDate, status: 'active'|'completed', createdAt}
  projectPayments: [], // {id, projectId, tenantId, paid, paidDate, amount, note}
  announcements: [] // {id, title, body, createdAt}
}

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState
    const parsed = JSON.parse(raw)
    return {
      ...initialState,
      ...parsed,
      building: { ...initialState.building, ...(parsed.building || {}) },
      categories: parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES
    }
  } catch (err) {
    console.error('Failed to load data', err)
    return initialState
  }
}

const generateId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const DataProvider = ({ children }) => {
  const [data, setData] = useState(loadFromStorage)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (err) {
      console.error('Failed to save data', err)
    }
  }, [data])

  // ===== Building =====
  const updateBuilding = useCallback((patch) => {
    setData(d => ({ ...d, building: { ...d.building, ...patch } }))
  }, [])

  // ===== Tenants =====
  const updateTenant = useCallback((id, patch) => {
    setData(d => ({
      ...d,
      tenants: d.tenants.map(t => t.id === id ? { ...t, ...patch } : t)
    }))
  }, [])

  const addTenant = useCallback(() => {
    setData(d => {
      const nextNum = (d.tenants[d.tenants.length - 1]?.apartmentNumber || 0) + 1
      const newTenant = {
        id: generateId('t'),
        apartmentNumber: nextNum,
        name: `דירה ${nextNum}`,
        phone: '',
        email: '',
        notes: '',
        active: true,
        joinDate: new Date().toISOString().slice(0, 10)
      }
      return { ...d, tenants: [...d.tenants, newTenant] }
    })
  }, [])

  const deleteTenant = useCallback((id) => {
    setData(d => ({
      ...d,
      tenants: d.tenants.filter(t => t.id !== id),
      payments: d.payments.filter(p => p.tenantId !== id),
      projectPayments: d.projectPayments.filter(p => p.tenantId !== id)
    }))
  }, [])

  // ===== Payments =====
  const setPayment = useCallback((tenantId, month, paid, options = {}) => {
    setData(d => {
      const existing = d.payments.find(p => p.tenantId === tenantId && p.month === month)
      if (existing) {
        return {
          ...d,
          payments: d.payments.map(p =>
            p.id === existing.id
              ? { ...p, paid, paidDate: paid ? (options.paidDate || new Date().toISOString().slice(0, 10)) : null, method: options.method || p.method, note: options.note ?? p.note }
              : p
          )
        }
      }
      return {
        ...d,
        payments: [
          ...d.payments,
          {
            id: generateId('p'),
            tenantId,
            month,
            amount: d.building.monthlyFee,
            paid,
            paidDate: paid ? (options.paidDate || new Date().toISOString().slice(0, 10)) : null,
            method: options.method || 'מזומן',
            note: options.note || ''
          }
        ]
      }
    })
  }, [])

  // ===== Expenses =====
  const addExpense = useCallback((expense) => {
    setData(d => ({
      ...d,
      expenses: [
        ...d.expenses,
        { id: generateId('e'), createdAt: new Date().toISOString(), ...expense }
      ]
    }))
  }, [])

  const updateExpense = useCallback((id, patch) => {
    setData(d => ({
      ...d,
      expenses: d.expenses.map(e => e.id === id ? { ...e, ...patch } : e)
    }))
  }, [])

  const deleteExpense = useCallback((id) => {
    setData(d => ({ ...d, expenses: d.expenses.filter(e => e.id !== id) }))
  }, [])

  // ===== Categories =====
  const addCategory = useCallback((name) => {
    if (!name?.trim()) return
    setData(d => d.categories.includes(name) ? d : { ...d, categories: [...d.categories, name] })
  }, [])

  const deleteCategory = useCallback((name) => {
    setData(d => ({ ...d, categories: d.categories.filter(c => c !== name) }))
  }, [])

  // ===== Projects =====
  const addProject = useCallback((project) => {
    setData(d => {
      const tenantCount = d.tenants.filter(t => t.active).length || d.tenants.length
      const perTenantAmount = tenantCount > 0 ? Math.round((project.totalAmount / tenantCount) * 100) / 100 : 0
      const newProject = {
        id: generateId('pr'),
        status: 'active',
        startDate: new Date().toISOString().slice(0, 10),
        createdAt: new Date().toISOString(),
        ...project,
        perTenantAmount
      }
      return { ...d, projects: [...d.projects, newProject] }
    })
  }, [])

  const updateProject = useCallback((id, patch) => {
    setData(d => {
      const updated = d.projects.map(p => {
        if (p.id !== id) return p
        const next = { ...p, ...patch }
        if (patch.totalAmount !== undefined) {
          const tenantCount = d.tenants.filter(t => t.active).length || d.tenants.length
          next.perTenantAmount = tenantCount > 0 ? Math.round((next.totalAmount / tenantCount) * 100) / 100 : 0
        }
        return next
      })
      return { ...d, projects: updated }
    })
  }, [])

  const deleteProject = useCallback((id) => {
    setData(d => ({
      ...d,
      projects: d.projects.filter(p => p.id !== id),
      projectPayments: d.projectPayments.filter(pp => pp.projectId !== id),
      expenses: d.expenses.filter(e => e.projectId !== id)
    }))
  }, [])

  const setProjectPayment = useCallback((projectId, tenantId, paid, options = {}) => {
    setData(d => {
      const project = d.projects.find(p => p.id === projectId)
      const amount = options.amount ?? project?.perTenantAmount ?? 0
      const existing = d.projectPayments.find(p => p.projectId === projectId && p.tenantId === tenantId)
      if (existing) {
        return {
          ...d,
          projectPayments: d.projectPayments.map(p =>
            p.id === existing.id
              ? { ...p, paid, amount, paidDate: paid ? (options.paidDate || new Date().toISOString().slice(0, 10)) : null, note: options.note ?? p.note }
              : p
          )
        }
      }
      return {
        ...d,
        projectPayments: [
          ...d.projectPayments,
          {
            id: generateId('pp'),
            projectId,
            tenantId,
            paid,
            amount,
            paidDate: paid ? (options.paidDate || new Date().toISOString().slice(0, 10)) : null,
            note: options.note || ''
          }
        ]
      }
    })
  }, [])

  // ===== Announcements =====
  const addAnnouncement = useCallback((title, body) => {
    setData(d => ({
      ...d,
      announcements: [
        { id: generateId('a'), title, body, createdAt: new Date().toISOString() },
        ...d.announcements
      ]
    }))
  }, [])

  const deleteAnnouncement = useCallback((id) => {
    setData(d => ({ ...d, announcements: d.announcements.filter(a => a.id !== id) }))
  }, [])

  // ===== Backup / Restore =====
  const exportData = useCallback(() => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vaad-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [data])

  const importData = useCallback((json) => {
    try {
      const parsed = typeof json === 'string' ? JSON.parse(json) : json
      setData({ ...initialState, ...parsed })
      return true
    } catch (err) {
      console.error('Import failed', err)
      return false
    }
  }, [])

  const resetData = useCallback(() => {
    if (confirm('האם אתה בטוח שברצונך למחוק את כל הנתונים? פעולה זו לא הפיכה.')) {
      setData(initialState)
    }
  }, [])

  const value = {
    ...data,
    updateBuilding,
    updateTenant, addTenant, deleteTenant,
    setPayment,
    addExpense, updateExpense, deleteExpense,
    addCategory, deleteCategory,
    addProject, updateProject, deleteProject,
    setProjectPayment,
    addAnnouncement, deleteAnnouncement,
    exportData, importData, resetData
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
