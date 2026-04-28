import { useState, useMemo } from 'react'
import {
  Mail, MessageCircle, Send, Copy, Check, AlertCircle,
  FileText, Users, Phone
} from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { formatCurrency, monthLabel, currentMonth, monthsFromStart } from '../utils/format.js'

const TEMPLATES = [
  {
    id: 'reminder',
    name: 'תזכורת תשלום',
    subject: 'תזכורת - דמי ועד {month}',
    body: `שלום {name},
תזכורת ידידותית - דמי הוועד עבור {month} בסך {amount} עדיין לא שולמו.
אנא דאגו להעביר בהקדם.
תודה,
ועד בית {buildingName}`
  },
  {
    id: 'receipt',
    name: 'אישור תשלום',
    subject: 'אישור תשלום ועד {month}',
    body: `שלום {name},
התקבל תשלום דמי ועד עבור {month} בסך {amount}.
תודה!
ועד בית {buildingName}`
  },
  {
    id: 'announcement',
    name: 'הודעה כללית',
    subject: 'הודעה לדיירי {buildingName}',
    body: `שלום לדיירי {buildingName},

[כתוב כאן את ההודעה]

בברכה,
ועד הבית`
  },
  {
    id: 'project',
    name: 'פרויקט חדש - גביה',
    subject: 'פרויקט חדש - {projectName}',
    body: `שלום {name},
ועד הבית מתחיל פרויקט חדש: {projectName}
חלק כל דייר: {projectAmount}
אנא העבירו בהקדם.
ועד בית {buildingName}`
  }
]

export default function Communications() {
  const { building, tenants, payments, projects } = useData()
  const [tab, setTab] = useState('whatsapp')
  const [template, setTemplate] = useState(TEMPLATES[0].id)
  const [subject, setSubject] = useState(TEMPLATES[0].subject)
  const [body, setBody] = useState(TEMPLATES[0].body)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth())
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [recipientFilter, setRecipientFilter] = useState('all') // all | unpaid | paid | selected
  const [selectedTenants, setSelectedTenants] = useState(new Set())
  const [copied, setCopied] = useState(false)

  const months = useMemo(() => building ? monthsFromStart(building.startMonth) : [], [building])
  const activeTenants = useMemo(() => tenants.filter(t => t.active).sort((a, b) => a.apartmentNumber - b.apartmentNumber), [tenants])

  const recipients = useMemo(() => {
    if (recipientFilter === 'all') return activeTenants
    if (recipientFilter === 'selected') return activeTenants.filter(t => selectedTenants.has(t.id))
    if (recipientFilter === 'unpaid') {
      return activeTenants.filter(t => {
        const p = payments.find(x => x.tenantId === t.id && x.month === selectedMonth)
        return !p || !p.paid
      })
    }
    if (recipientFilter === 'paid') {
      return activeTenants.filter(t => {
        const p = payments.find(x => x.tenantId === t.id && x.month === selectedMonth)
        return p?.paid
      })
    }
    return activeTenants
  }, [recipientFilter, activeTenants, payments, selectedMonth, selectedTenants])

  const handleTemplateChange = (id) => {
    const t = TEMPLATES.find(x => x.id === id)
    setTemplate(id)
    if (t) {
      setSubject(t.subject)
      setBody(t.body)
    }
  }

  const fillTemplate = (text, tenant) => {
    const project = projects.find(p => p.id === selectedProjectId)
    return text
      .replace(/\{name\}/g, tenant.name || `דירה ${tenant.apartmentNumber}`)
      .replace(/\{apt\}/g, tenant.apartmentNumber)
      .replace(/\{month\}/g, monthLabel(selectedMonth))
      .replace(/\{amount\}/g, formatCurrency(building?.monthlyFee || 0))
      .replace(/\{buildingName\}/g, building?.name || '')
      .replace(/\{projectName\}/g, project?.name || '[שם פרויקט]')
      .replace(/\{projectAmount\}/g, formatCurrency(project?.perTenantAmount || 0))
  }

  const sendToTenantWhatsApp = (tenant) => {
    if (!tenant.phone) return
    const msg = fillTemplate(body, tenant)
    const phone = tenant.phone.replace(/\D/g, '').replace(/^0/, '')
    window.open(`https://wa.me/972${phone}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const sendEmailToOne = (tenant) => {
    if (!tenant.email) return
    const sub = fillTemplate(subject, tenant)
    const msg = fillTemplate(body, tenant)
    window.location.href = `mailto:${tenant.email}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(msg)}`
  }

  const sendBulkEmail = () => {
    const emails = recipients.filter(t => t.email).map(t => t.email)
    if (emails.length === 0) {
      alert('אין דיירים עם אימייל ברשימה')
      return
    }
    // Use generic placeholders for bulk
    const sub = subject
      .replace(/\{name\}/g, 'דיירים יקרים')
      .replace(/\{month\}/g, monthLabel(selectedMonth))
      .replace(/\{buildingName\}/g, building?.name || '')
    const msg = body
      .replace(/\{name\}/g, 'דיירים יקרים')
      .replace(/\{month\}/g, monthLabel(selectedMonth))
      .replace(/\{amount\}/g, formatCurrency(building?.monthlyFee || 0))
      .replace(/\{buildingName\}/g, building?.name || '')
    // BCC to keep emails private
    const adminEmail = building?.adminEmail || ''
    window.location.href = `mailto:${adminEmail}?bcc=${emails.join(',')}&subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(msg)}`
  }

  const copyMessage = () => {
    const msg = body
      .replace(/\{name\}/g, 'דיירים יקרים')
      .replace(/\{month\}/g, monthLabel(selectedMonth))
      .replace(/\{amount\}/g, formatCurrency(building?.monthlyFee || 0))
      .replace(/\{buildingName\}/g, building?.name || '')
    navigator.clipboard.writeText(msg)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openWhatsAppGroup = () => {
    if (building?.whatsappGroupLink) {
      window.open(building.whatsappGroupLink, '_blank')
    }
  }

  const toggleSelected = (id) => {
    setSelectedTenants(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const recipientsWithPhone = recipients.filter(t => t.phone)
  const recipientsWithEmail = recipients.filter(t => t.email)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">תקשורת</h1>
        <p className="text-slate-500">שלח הודעות לדיירים בוואטסאפ ובאימייל</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 border border-slate-200 w-fit">
        <button
          onClick={() => setTab('whatsapp')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 ${tab === 'whatsapp' ? 'bg-emerald-500 text-white' : 'text-slate-600'}`}
        >
          <MessageCircle size={16} />
          WhatsApp
        </button>
        <button
          onClick={() => setTab('email')}
          className={`px-4 py-2 rounded-lg font-semibold text-sm flex items-center gap-2 ${tab === 'email' ? 'bg-blue-600 text-white' : 'text-slate-600'}`}
        >
          <Mail size={16} />
          אימייל
        </button>
      </div>

      {/* Template selector */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <FileText size={18} />
          תבנית הודעה
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => handleTemplateChange(t.id)}
              className={`p-3 rounded-lg border-2 text-sm font-semibold ${template === t.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1">חודש (לתבניות תשלום)</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">פרויקט (לתבנית פרויקט)</label>
            <select
              value={selectedProjectId}
              onChange={e => setSelectedProjectId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">בחר פרויקט</option>
              {projects.filter(p => p.status === 'active').map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {tab === 'email' && (
          <div className="mb-3">
            <label className="block text-xs text-slate-500 mb-1">נושא</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-500 mb-1">תוכן ההודעה</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={8}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-slate-500 mt-1">
            תגים זמינים: <code>{'{name}'}</code>, <code>{'{month}'}</code>, <code>{'{amount}'}</code>, <code>{'{buildingName}'}</code>, <code>{'{projectName}'}</code>, <code>{'{projectAmount}'}</code>
          </p>
        </div>
      </div>

      {/* Recipients */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Users size={18} />
          נמענים
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
          <button
            onClick={() => setRecipientFilter('all')}
            className={`p-3 rounded-lg border-2 text-sm font-semibold ${recipientFilter === 'all' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200'}`}
          >
            כולם ({activeTenants.length})
          </button>
          <button
            onClick={() => setRecipientFilter('unpaid')}
            className={`p-3 rounded-lg border-2 text-sm font-semibold ${recipientFilter === 'unpaid' ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200'}`}
          >
            חייבים ({activeTenants.filter(t => {
              const p = payments.find(x => x.tenantId === t.id && x.month === selectedMonth)
              return !p || !p.paid
            }).length})
          </button>
          <button
            onClick={() => setRecipientFilter('paid')}
            className={`p-3 rounded-lg border-2 text-sm font-semibold ${recipientFilter === 'paid' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200'}`}
          >
            שילמו ({activeTenants.filter(t => {
              const p = payments.find(x => x.tenantId === t.id && x.month === selectedMonth)
              return p?.paid
            }).length})
          </button>
          <button
            onClick={() => setRecipientFilter('selected')}
            className={`p-3 rounded-lg border-2 text-sm font-semibold ${recipientFilter === 'selected' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-slate-200'}`}
          >
            נבחרים ({selectedTenants.size})
          </button>
        </div>

        {recipientFilter === 'selected' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mb-4 max-h-48 overflow-y-auto">
            {activeTenants.map(t => (
              <button
                key={t.id}
                onClick={() => toggleSelected(t.id)}
                className={`px-3 py-2 rounded-lg text-sm border ${selectedTenants.has(t.id) ? 'bg-blue-100 border-blue-400 text-blue-700' : 'bg-white border-slate-200'}`}
              >
                דירה {t.apartmentNumber}
              </button>
            ))}
          </div>
        )}

        <div className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
          <strong>{recipients.length}</strong> נמענים נבחרו
          {tab === 'whatsapp' && ` · ${recipientsWithPhone.length} עם טלפון`}
          {tab === 'email' && ` · ${recipientsWithEmail.length} עם אימייל`}
        </div>
      </div>

      {/* Action buttons */}
      {tab === 'whatsapp' ? (
        <div className="space-y-4">
          {/* Group action */}
          {building?.whatsappGroupLink ? (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4">
              <h3 className="font-bold text-emerald-900 mb-2">📢 שלח לקבוצת WhatsApp של הבניין</h3>
              <p className="text-sm text-emerald-800 mb-3">
                העתק את ההודעה, פתח את הקבוצה והדבק.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={copyMessage}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  {copied ? 'הועתק!' : 'העתק הודעה'}
                </button>
                <button
                  onClick={openWhatsAppGroup}
                  className="flex items-center gap-2 bg-white border-2 border-emerald-500 text-emerald-700 px-4 py-2 rounded-lg font-semibold hover:bg-emerald-50"
                >
                  <MessageCircle size={16} />
                  פתח קבוצה
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
              <AlertCircle size={16} className="inline ml-1" />
              לא הוגדר קישור לקבוצת WhatsApp - אפשר להוסיף בהגדרות
            </div>
          )}

          {/* Individual sends */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3">שליחה אישית לכל נמען</h3>
            {recipientsWithPhone.length === 0 ? (
              <p className="text-slate-400 text-center py-4">אין נמענים עם מספר טלפון</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {recipientsWithPhone.map(t => (
                  <button
                    key={t.id}
                    onClick={() => sendToTenantWhatsApp(t)}
                    className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-3 py-2 rounded-lg text-sm border border-emerald-200"
                  >
                    <MessageCircle size={14} />
                    דירה {t.apartmentNumber}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bulk email */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4">
            <h3 className="font-bold text-blue-900 mb-2">📧 שלח לכל הנמענים בבת אחת</h3>
            <p className="text-sm text-blue-800 mb-3">
              ייפתח לקוח האימייל שלך עם כל הנמענים ב-BCC ({recipientsWithEmail.length} נמענים).
            </p>
            <button
              onClick={sendBulkEmail}
              disabled={recipientsWithEmail.length === 0}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold disabled:opacity-50"
            >
              <Send size={16} />
              שלח אימייל לכולם
            </button>
          </div>

          {/* Individual emails */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-900 mb-3">שליחה אישית לכל נמען</h3>
            {recipientsWithEmail.length === 0 ? (
              <p className="text-slate-400 text-center py-4">אין נמענים עם אימייל</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {recipientsWithEmail.map(t => (
                  <button
                    key={t.id}
                    onClick={() => sendEmailToOne(t)}
                    className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm border border-blue-200"
                  >
                    <Mail size={14} />
                    דירה {t.apartmentNumber}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
