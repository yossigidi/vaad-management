import { useState, useEffect } from 'react'
import { Save, Download, Mail, MessageCircle, Building2 } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function Settings() {
  const { building, updateBuilding, exportData } = useData()
  const { profile } = useAuth()
  const [draft, setDraft] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (building) setDraft({ ...building })
  }, [building])

  const handleSave = async () => {
    await updateBuilding({
      name: draft.name || '',
      address: draft.address || '',
      monthlyFee: parseFloat(draft.monthlyFee) || 0,
      startMonth: draft.startMonth || '2026-01',
      paymentFrequency: draft.paymentFrequency || 'monthly',
      bankAccount: draft.bankAccount || '',
      contactName: draft.contactName || '',
      contactPhone: draft.contactPhone || '',
      adminEmail: draft.adminEmail || '',
      whatsappGroupLink: draft.whatsappGroupLink || ''
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (!building) return null

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">הגדרות</h1>
        <p className="text-slate-500">פרטי הבניין והעדפות תקשורת</p>
      </div>

      {/* Account info */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm">
        <div className="flex items-center gap-2 text-blue-900 mb-1">
          <Building2 size={16} />
          <strong>פרטי החשבון</strong>
        </div>
        <div className="text-blue-800 space-y-1">
          <div>קוד בניין: <strong className="font-mono">{building.buildingCode}</strong></div>
          <div>שם משתמש אדמין: <strong className="font-mono">{profile?.username}</strong></div>
        </div>
      </div>

      {/* Building info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Building2 size={20} />
          פרטי הבניין
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">שם הוועד</label>
            <input
              type="text"
              value={draft.name || ''}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="ועד בית..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">כתובת/עיר</label>
            <input
              type="text"
              value={draft.address || ''}
              onChange={e => setDraft({ ...draft, address: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="חולון"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">דמי ועד חודשי (₪)</label>
            <input
              type="number"
              step="0.01"
              value={draft.monthlyFee || 0}
              onChange={e => setDraft({ ...draft, monthlyFee: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
            <p className="text-xs text-slate-500 mt-1">סכום בסיסי לחודש - יוכפל אוטומטית לפי תדירות הגביה</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">חודש התחלה</label>
            <input
              type="month"
              value={draft.startMonth || '2026-01'}
              onChange={e => setDraft({ ...draft, startMonth: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">תדירות גביה</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'monthly', label: 'חודשי', sub: '12 פעמים בשנה' },
                { id: 'bi-monthly', label: 'דו-חודשי', sub: '6 פעמים בשנה' },
                { id: 'yearly', label: 'שנתי', sub: 'פעם בשנה' }
              ].map(f => {
                const isActive = (draft.paymentFrequency || 'monthly') === f.id
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDraft({ ...draft, paymentFrequency: f.id })}
                    className={`p-3 rounded-lg border-2 text-center ${isActive ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                  >
                    <div className={`font-bold ${isActive ? 'text-blue-700' : 'text-slate-700'}`}>{f.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{f.sub}</div>
                  </button>
                )
              })}
            </div>
            {draft.paymentFrequency && draft.paymentFrequency !== 'monthly' && draft.monthlyFee && (
              <p className="text-xs text-blue-700 bg-blue-50 rounded p-2 mt-2">
                💡 כל דייר ישלם {' '}
                <strong>
                  {draft.paymentFrequency === 'bi-monthly'
                    ? `${(parseFloat(draft.monthlyFee) * 2).toFixed(0)}₪ כל חודשיים`
                    : `${(parseFloat(draft.monthlyFee) * 12).toFixed(0)}₪ פעם בשנה`
                  }
                </strong>
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">חשבון בנק (אופציונלי)</label>
            <input
              type="text"
              value={draft.bankAccount || ''}
              onChange={e => setDraft({ ...draft, bankAccount: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="בנק/סניף/חשבון"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">איש קשר</label>
            <input
              type="text"
              value={draft.contactName || ''}
              onChange={e => setDraft({ ...draft, contactName: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="יו״ר ועד"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">טלפון איש קשר</label>
            <input
              type="tel"
              value={draft.contactPhone || ''}
              onChange={e => setDraft({ ...draft, contactPhone: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              dir="ltr"
            />
          </div>
        </div>
      </div>

      {/* Communications */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <MessageCircle size={20} />
          תקשורת
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Mail size={14} className="inline ml-1" />
              אימייל הוועד (לשליחת הודעות לדיירים)
            </label>
            <input
              type="email"
              value={draft.adminEmail || ''}
              onChange={e => setDraft({ ...draft, adminEmail: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="vaad@example.com"
              dir="ltr"
            />
            <p className="text-xs text-slate-500 mt-1">
              הודעות יישלחו דרך לקוח האימייל המוגדר במחשב/טלפון שלך, עם BCC לכל הדיירים
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <MessageCircle size={14} className="inline ml-1" />
              קישור לקבוצת WhatsApp
            </label>
            <input
              type="url"
              value={draft.whatsappGroupLink || ''}
              onChange={e => setDraft({ ...draft, whatsappGroupLink: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder="https://chat.whatsapp.com/..."
              dir="ltr"
            />
            <p className="text-xs text-slate-500 mt-1">
              לשליחת הודעות לקבוצת הדיירים בוואטסאפ
            </p>
          </div>
        </div>
      </div>

      {/* Save button */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 shadow-sm border border-slate-100 sticky bottom-4">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold"
        >
          <Save size={18} />
          שמור שינויים
        </button>
        {saved && (
          <span className="text-emerald-600 font-semibold text-sm">✓ נשמר</span>
        )}
      </div>

      {/* Backup */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-3">גיבוי נתונים</h2>
        <p className="text-sm text-slate-500 mb-4">
          הנתונים שלך נשמרים אוטומטית בענן (Firestore). תוכל להוריד גיבוי JSON מקומי בכל עת.
        </p>
        <button
          onClick={exportData}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold"
        >
          <Download size={18} />
          הורד גיבוי JSON
        </button>
      </div>
    </div>
  )
}
