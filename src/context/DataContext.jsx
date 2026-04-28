import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import {
  collection, doc, onSnapshot, addDoc, setDoc, updateDoc, deleteDoc,
  serverTimestamp, query, where, getDocs
} from 'firebase/firestore'
import { db } from '../firebase/config.js'
import { useAuth } from './AuthContext.jsx'

const DataContext = createContext(null)

const DEFAULT_CATEGORIES = ['ניקיון', 'חשמל', 'מים', 'מעלית', 'גנן', 'תחזוקה', 'ביטוח', 'גז', 'אינטרנט', 'אחר']

export const DataProvider = ({ children }) => {
  const { buildingId, isAdmin, isTenant, profile } = useAuth()

  const [building, setBuilding] = useState(null)
  const [tenants, setTenants] = useState([])
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [projects, setProjects] = useState([])
  const [projectPayments, setProjectPayments] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [incomeStreams, setIncomeStreams] = useState([])
  const [incomeReceipts, setIncomeReceipts] = useState([])
  const [loading, setLoading] = useState(true)

  // Subscribe to building data
  useEffect(() => {
    if (!buildingId) {
      setBuilding(null)
      setTenants([])
      setPayments([])
      setExpenses([])
      setProjects([])
      setProjectPayments([])
      setAnnouncements([])
      setIncomeStreams([])
      setIncomeReceipts([])
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubs = []

    // Building doc
    unsubs.push(onSnapshot(doc(db, 'buildings', buildingId), (snap) => {
      if (snap.exists()) {
        setBuilding({ id: snap.id, ...snap.data() })
      }
      setLoading(false)
    }))

    // Tenants
    unsubs.push(onSnapshot(collection(db, 'buildings', buildingId, 'tenants'), (snap) => {
      setTenants(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Payments
    unsubs.push(onSnapshot(collection(db, 'buildings', buildingId, 'payments'), (snap) => {
      setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Expenses
    unsubs.push(onSnapshot(collection(db, 'buildings', buildingId, 'expenses'), (snap) => {
      setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Projects
    unsubs.push(onSnapshot(collection(db, 'buildings', buildingId, 'projects'), (snap) => {
      setProjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Project payments
    unsubs.push(onSnapshot(collection(db, 'buildings', buildingId, 'projectPayments'), (snap) => {
      setProjectPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Announcements
    unsubs.push(onSnapshot(collection(db, 'buildings', buildingId, 'announcements'), (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Income streams (parking, storage, etc.)
    unsubs.push(onSnapshot(collection(db, 'buildings', buildingId, 'incomeStreams'), (snap) => {
      setIncomeStreams(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    // Income receipts (monthly tracking for each stream)
    unsubs.push(onSnapshot(collection(db, 'buildings', buildingId, 'incomeReceipts'), (snap) => {
      setIncomeReceipts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }))

    return () => unsubs.forEach(u => u())
  }, [buildingId])

  const categories = useMemo(() => building?.categories || DEFAULT_CATEGORIES, [building])

  // ===== Building =====
  const updateBuilding = useCallback(async (patch) => {
    if (!buildingId) return
    await updateDoc(doc(db, 'buildings', buildingId), patch)
  }, [buildingId])

  // ===== Tenants =====
  const updateTenant = useCallback(async (id, patch) => {
    if (!buildingId) return
    await updateDoc(doc(db, 'buildings', buildingId, 'tenants', id), patch)
  }, [buildingId])

  const addTenant = useCallback(async () => {
    if (!buildingId) return
    const nextNum = (tenants[tenants.length - 1]?.apartmentNumber || 0) + 1
    const newId = `t-${nextNum}`
    await setDoc(doc(db, 'buildings', buildingId, 'tenants', newId), {
      apartmentNumber: nextNum,
      name: `דירה ${nextNum}`,
      phone: '',
      email: '',
      notes: '',
      active: true,
      username: `apt-${nextNum}`,
      createdAt: serverTimestamp()
    })
  }, [buildingId, tenants])

  const deleteTenant = useCallback(async (id) => {
    if (!buildingId) return
    await deleteDoc(doc(db, 'buildings', buildingId, 'tenants', id))
  }, [buildingId])

  // ===== Payments =====
  const setPayment = useCallback(async (tenantId, month, paid, options = {}) => {
    if (!buildingId) return
    const existing = payments.find(p => p.tenantId === tenantId && p.month === month)
    if (existing) {
      await updateDoc(doc(db, 'buildings', buildingId, 'payments', existing.id), {
        paid,
        paidDate: paid ? (options.paidDate || new Date().toISOString().slice(0, 10)) : null,
        method: options.method || existing.method || 'מזומן',
        note: options.note ?? existing.note ?? ''
      })
    } else {
      await addDoc(collection(db, 'buildings', buildingId, 'payments'), {
        tenantId,
        month,
        amount: building?.monthlyFee || 0,
        paid,
        paidDate: paid ? (options.paidDate || new Date().toISOString().slice(0, 10)) : null,
        method: options.method || 'מזומן',
        note: options.note || '',
        createdAt: serverTimestamp()
      })
    }
  }, [buildingId, payments, building])

  // ===== Expenses =====
  const addExpense = useCallback(async (expense) => {
    if (!buildingId) return
    await addDoc(collection(db, 'buildings', buildingId, 'expenses'), {
      ...expense,
      createdAt: serverTimestamp()
    })
  }, [buildingId])

  const updateExpense = useCallback(async (id, patch) => {
    if (!buildingId) return
    await updateDoc(doc(db, 'buildings', buildingId, 'expenses', id), patch)
  }, [buildingId])

  const deleteExpense = useCallback(async (id) => {
    if (!buildingId) return
    await deleteDoc(doc(db, 'buildings', buildingId, 'expenses', id))
  }, [buildingId])

  // ===== Categories =====
  const addCategory = useCallback(async (name) => {
    if (!buildingId || !name?.trim()) return
    const next = categories.includes(name) ? categories : [...categories, name]
    await updateDoc(doc(db, 'buildings', buildingId), { categories: next })
  }, [buildingId, categories])

  const deleteCategory = useCallback(async (name) => {
    if (!buildingId) return
    await updateDoc(doc(db, 'buildings', buildingId), {
      categories: categories.filter(c => c !== name)
    })
  }, [buildingId, categories])

  // ===== Projects =====
  const addProject = useCallback(async (project) => {
    if (!buildingId) return
    const tenantCount = tenants.filter(t => t.active).length || tenants.length
    const perTenantAmount = tenantCount > 0
      ? Math.round((project.totalAmount / tenantCount) * 100) / 100
      : 0
    await addDoc(collection(db, 'buildings', buildingId, 'projects'), {
      status: 'active',
      startDate: new Date().toISOString().slice(0, 10),
      ...project,
      perTenantAmount,
      createdAt: serverTimestamp()
    })
  }, [buildingId, tenants])

  const updateProject = useCallback(async (id, patch) => {
    if (!buildingId) return
    const update = { ...patch }
    if (patch.totalAmount !== undefined) {
      const tenantCount = tenants.filter(t => t.active).length || tenants.length
      update.perTenantAmount = tenantCount > 0
        ? Math.round((patch.totalAmount / tenantCount) * 100) / 100
        : 0
    }
    await updateDoc(doc(db, 'buildings', buildingId, 'projects', id), update)
  }, [buildingId, tenants])

  const deleteProject = useCallback(async (id) => {
    if (!buildingId) return
    // Delete project, its payments, and project-specific expenses
    await deleteDoc(doc(db, 'buildings', buildingId, 'projects', id))
    const ppQuery = query(
      collection(db, 'buildings', buildingId, 'projectPayments'),
      where('projectId', '==', id)
    )
    const ppSnap = await getDocs(ppQuery)
    await Promise.all(ppSnap.docs.map(d => deleteDoc(d.ref)))
    const eQuery = query(
      collection(db, 'buildings', buildingId, 'expenses'),
      where('projectId', '==', id)
    )
    const eSnap = await getDocs(eQuery)
    await Promise.all(eSnap.docs.map(d => deleteDoc(d.ref)))
  }, [buildingId])

  const setProjectPayment = useCallback(async (projectId, tenantId, paid, options = {}) => {
    if (!buildingId) return
    const project = projects.find(p => p.id === projectId)
    const amount = options.amount ?? project?.perTenantAmount ?? 0
    const existing = projectPayments.find(p => p.projectId === projectId && p.tenantId === tenantId)
    if (existing) {
      await updateDoc(doc(db, 'buildings', buildingId, 'projectPayments', existing.id), {
        paid,
        amount,
        paidDate: paid ? (options.paidDate || new Date().toISOString().slice(0, 10)) : null,
        note: options.note ?? existing.note ?? ''
      })
    } else {
      await addDoc(collection(db, 'buildings', buildingId, 'projectPayments'), {
        projectId,
        tenantId,
        paid,
        amount,
        paidDate: paid ? (options.paidDate || new Date().toISOString().slice(0, 10)) : null,
        note: options.note || '',
        createdAt: serverTimestamp()
      })
    }
  }, [buildingId, projects, projectPayments])

  // ===== Announcements =====
  const addAnnouncement = useCallback(async (title, body) => {
    if (!buildingId) return
    await addDoc(collection(db, 'buildings', buildingId, 'announcements'), {
      title,
      body,
      createdAt: serverTimestamp()
    })
  }, [buildingId])

  const deleteAnnouncement = useCallback(async (id) => {
    if (!buildingId) return
    await deleteDoc(doc(db, 'buildings', buildingId, 'announcements', id))
  }, [buildingId])

  // ===== Income Streams =====
  const addIncomeStream = useCallback(async (stream) => {
    if (!buildingId) return
    await addDoc(collection(db, 'buildings', buildingId, 'incomeStreams'), {
      active: true,
      startDate: new Date().toISOString().slice(0, 10),
      ...stream,
      createdAt: serverTimestamp()
    })
  }, [buildingId])

  const updateIncomeStream = useCallback(async (id, patch) => {
    if (!buildingId) return
    await updateDoc(doc(db, 'buildings', buildingId, 'incomeStreams', id), patch)
  }, [buildingId])

  const deleteIncomeStream = useCallback(async (id) => {
    if (!buildingId) return
    await deleteDoc(doc(db, 'buildings', buildingId, 'incomeStreams', id))
    const rQuery = query(
      collection(db, 'buildings', buildingId, 'incomeReceipts'),
      where('streamId', '==', id)
    )
    const rSnap = await getDocs(rQuery)
    await Promise.all(rSnap.docs.map(d => deleteDoc(d.ref)))
  }, [buildingId])

  const setIncomeReceipt = useCallback(async (streamId, month, paid, options = {}) => {
    if (!buildingId) return
    const stream = incomeStreams.find(s => s.id === streamId)
    const amount = options.amount ?? stream?.monthlyAmount ?? 0
    const existing = incomeReceipts.find(r => r.streamId === streamId && r.month === month)
    if (existing) {
      await updateDoc(doc(db, 'buildings', buildingId, 'incomeReceipts', existing.id), {
        paid,
        amount,
        paidDate: paid ? (options.paidDate || new Date().toISOString().slice(0, 10)) : null,
        note: options.note ?? existing.note ?? ''
      })
    } else {
      await addDoc(collection(db, 'buildings', buildingId, 'incomeReceipts'), {
        streamId,
        month,
        paid,
        amount,
        paidDate: paid ? (options.paidDate || new Date().toISOString().slice(0, 10)) : null,
        note: options.note || '',
        createdAt: serverTimestamp()
      })
    }
  }, [buildingId, incomeStreams, incomeReceipts])

  const exportData = useCallback(() => {
    const data = { building, tenants, payments, expenses, projects, projectPayments, announcements, incomeStreams, incomeReceipts }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vaad-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [building, tenants, payments, expenses, projects, projectPayments, announcements, incomeStreams, incomeReceipts])

  // Tenant view: own data
  const myPayments = useMemo(() => {
    if (!isTenant || !profile?.tenantId) return []
    return payments.filter(p => p.tenantId === profile.tenantId)
  }, [payments, isTenant, profile])

  const myProjectPayments = useMemo(() => {
    if (!isTenant || !profile?.tenantId) return []
    return projectPayments.filter(p => p.tenantId === profile.tenantId)
  }, [projectPayments, isTenant, profile])

  const myTenant = useMemo(() => {
    if (!isTenant || !profile?.tenantId) return null
    return tenants.find(t => t.id === profile.tenantId)
  }, [tenants, isTenant, profile])

  const value = {
    building,
    tenants,
    payments,
    expenses,
    projects,
    projectPayments,
    announcements,
    incomeStreams,
    incomeReceipts,
    categories,
    loading,
    // Tenant-scoped helpers
    myPayments,
    myProjectPayments,
    myTenant,
    // Mutations
    updateBuilding,
    updateTenant, addTenant, deleteTenant,
    setPayment,
    addExpense, updateExpense, deleteExpense,
    addCategory, deleteCategory,
    addProject, updateProject, deleteProject,
    setProjectPayment,
    addAnnouncement, deleteAnnouncement,
    addIncomeStream, updateIncomeStream, deleteIncomeStream, setIncomeReceipt,
    exportData
  }

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
