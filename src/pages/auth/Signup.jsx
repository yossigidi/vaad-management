import { useState } from 'react'
import { Building2, ChevronLeft, ChevronRight, Check, Copy, Printer, User, Lock, Home } from 'lucide-react'
import {
  doc, setDoc, serverTimestamp, writeBatch, collection
} from 'firebase/firestore'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, db, buildAuthEmail } from '../../firebase/config.js'
import { createUserAccount } from '../../context/AuthContext.jsx'

const DEFAULT_CATEGORIES = ['ניקיון', 'חשמל', 'מים', 'מעלית', 'גנן', 'תחזוקה', 'ביטוח', 'גז', 'אינטרנט', 'אחר']

export default function Signup({ onLogin }) {
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [credentials, setCredentials] = useState(null) // shown after successful signup

  const [form, setForm] = useState({
    // Admin
    adminUsername: '',
    adminPassword: '',
    adminPasswordConfirm: '',
    // Building
    buildingName: '',
    address: '',
    buildingCode: '',
    monthlyFee: 250,
    startMonth: '2026-01',
    apartmentCount: 16,
    // Communications
    adminEmail: '',
    whatsappGroupLink: ''
  })

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async () => {
    setError('')
    if (!form.adminUsername || !form.adminPassword) {
      setError('נא למלא שם משתמש וסיסמה')
      return
    }
    if (form.adminPassword.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }
    if (form.adminPassword !== form.adminPasswordConfirm) {
      setError('הסיסמאות לא תואמות')
      return
    }
    if (!form.buildingName || !form.buildingCode) {
      setError('נא למלא שם בניין וקוד')
      return
    }
    if (form.apartmentCount < 1 || form.apartmentCount > 200) {
      setError('מספר דירות לא תקין')
      return
    }

    setSubmitting(true)
    try {
      const buildingId = `b-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const buildingCode = form.buildingCode.toLowerCase().replace(/[^a-z0-9]/g, '')

      // 1. Create admin auth user (this also signs them in)
      await createUserAccount({
        username: form.adminUsername,
        buildingCode,
        password: form.adminPassword,
        role: 'admin',
        buildingId
      })

      // 2. Create building doc
      await setDoc(doc(db, 'buildings', buildingId), {
        name: form.buildingName,
        address: form.address,
        buildingCode,
        monthlyFee: parseFloat(form.monthlyFee) || 250,
        startMonth: form.startMonth,
        apartmentCount: form.apartmentCount,
        adminEmail: form.adminEmail || null,
        whatsappGroupLink: form.whatsappGroupLink || null,
        adminUid: auth.currentUser.uid,
        categories: DEFAULT_CATEGORIES,
        createdAt: serverTimestamp()
      })

      // 3. Create tenant docs (in subcollection)
      const batch = writeBatch(db)
      const tenantIds = []
      for (let i = 1; i <= form.apartmentCount; i++) {
        const tId = `t-${i}`
        tenantIds.push({ id: tId, apartmentNumber: i })
        const tRef = doc(db, 'buildings', buildingId, 'tenants', tId)
        batch.set(tRef, {
          apartmentNumber: i,
          name: `דירה ${i}`,
          phone: '',
          email: '',
          notes: '',
          active: true,
          username: `apt-${i}`,
          createdAt: serverTimestamp()
        })
      }
      await batch.commit()

      // 4. Create tenant auth users (sequential to avoid auth state race)
      // NOTE: Each createUserWithEmailAndPassword auto-logs in, so we'll need to re-login as admin at the end
      const tenantCreds = []
      for (const t of tenantIds) {
        try {
          await createUserAccount({
            username: `apt-${t.apartmentNumber}`,
            buildingCode,
            password: '123456',
            role: 'tenant',
            buildingId,
            tenantId: t.id,
            apartmentNumber: t.apartmentNumber,
            mustChangePassword: true
          })
          tenantCreds.push({ apartmentNumber: t.apartmentNumber, username: `apt-${t.apartmentNumber}`, password: '123456' })
        } catch (err) {
          console.error(`Failed to create tenant ${t.apartmentNumber}`, err)
        }
      }

      // 5. Re-login as admin (since last createUser logged us in as last tenant)
      await signInWithEmailAndPassword(
        auth,
        buildAuthEmail(form.adminUsername, buildingCode),
        form.adminPassword
      )

      // 6. Show credentials sheet
      setCredentials({
        buildingName: form.buildingName,
        buildingCode,
        admin: { username: form.adminUsername, password: '****' },
        tenants: tenantCreds
      })
    } catch (err) {
      console.error(err)
      let msg = err.message || 'שגיאה ברישום'
      if (err.code === 'auth/email-already-in-use') msg = 'שם המשתמש או קוד הבניין כבר תפוסים'
      if (err.code === 'auth/weak-password') msg = 'הסיסמה חלשה מדי - חייב לפחות 6 תווים'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (credentials) {
    return <CredentialsSheet credentials={credentials} />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden">
        <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-white/20 p-2 rounded-lg">
              <Building2 size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">הקמת ועד בית חדש</h1>
              <p className="text-blue-100 text-sm">שלב {step} מתוך 3</p>
            </div>
          </div>
          {/* Progress */}
          <div className="flex gap-1 mt-4">
            {[1, 2, 3].map(s => (
              <div
                key={s}
                className={`flex-1 h-1.5 rounded-full transition-colors ${s <= step ? 'bg-white' : 'bg-white/30'}`}
              />
            ))}
          </div>
        </div>

        <div className="p-6 space-y-4">
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold text-slate-900">פרטי המנהל (האדמין)</h2>
              <p className="text-slate-500 text-sm mb-4">המשתמש שינהל את הוועד. אין צורך באימייל - רק שם משתמש וסיסמה.</p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <User size={14} className="inline ml-1" />
                  שם משתמש
                </label>
                <input
                  type="text"
                  value={form.adminUsername}
                  onChange={e => update('adminUsername', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                  placeholder="למשל: yossi"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Lock size={14} className="inline ml-1" />
                  סיסמה (לפחות 6 תווים)
                </label>
                <input
                  type="password"
                  value={form.adminPassword}
                  onChange={e => update('adminPassword', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">אישור סיסמה</label>
                <input
                  type="password"
                  value={form.adminPasswordConfirm}
                  onChange={e => update('adminPasswordConfirm', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                  dir="ltr"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-slate-900">פרטי הבניין</h2>
              <p className="text-slate-500 text-sm mb-4">קוד בניין הוא מזהה ייחודי שדיירים יזינו בכניסה</p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">שם הוועד</label>
                <input
                  type="text"
                  value={form.buildingName}
                  onChange={e => update('buildingName', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                  placeholder="ועד בית דוד אלעזר 45"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">כתובת</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => update('address', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                  placeholder="חולון"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  <Home size={14} className="inline ml-1" />
                  קוד בניין (אנגלית/מספרים בלבד)
                </label>
                <input
                  type="text"
                  value={form.buildingCode}
                  onChange={e => update('buildingCode', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5 font-mono"
                  placeholder="david45"
                  dir="ltr"
                />
                <p className="text-xs text-slate-500 mt-1">דיירים יזינו את הקוד הזה בכניסה</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">דמי ועד חודשי</label>
                  <input
                    type="number"
                    value={form.monthlyFee}
                    onChange={e => update('monthlyFee', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">חודש התחלה</label>
                  <input
                    type="month"
                    value={form.startMonth}
                    onChange={e => update('startMonth', e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  כמה דירות בבניין?
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={form.apartmentCount}
                  onChange={e => update('apartmentCount', parseInt(e.target.value) || 0)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                />
                <p className="text-xs text-slate-500 mt-1">
                  המערכת תיצור אוטומטית {form.apartmentCount || 0} משתמשים: <strong>apt-1</strong> עד <strong>apt-{form.apartmentCount}</strong> · סיסמה ראשונית: <strong>123456</strong>
                </p>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-xl font-bold text-slate-900">תקשורת (אופציונלי)</h2>
              <p className="text-slate-500 text-sm mb-4">תוכל להוסיף בהמשך, אבל קל יותר עכשיו</p>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">אימייל הוועד (לשליחת הודעות)</label>
                <input
                  type="email"
                  value={form.adminEmail}
                  onChange={e => update('adminEmail', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                  placeholder="vaad@example.com"
                  dir="ltr"
                />
                <p className="text-xs text-slate-500 mt-1">דרכו תשלח חשבוניות והודעות לדיירים</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">קישור לקבוצת WhatsApp</label>
                <input
                  type="url"
                  value={form.whatsappGroupLink}
                  onChange={e => update('whatsappGroupLink', e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                  placeholder="https://chat.whatsapp.com/..."
                  dir="ltr"
                />
                <p className="text-xs text-slate-500 mt-1">לשליחת הודעות לקבוצת הבניין</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                <strong>שים לב:</strong> בהמשך תוכל להוסיף לכל דייר את האימייל והטלפון שלו - זה יאפשר שליחה ישירה.
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-4">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                disabled={submitting}
                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold flex items-center gap-2"
              >
                <ChevronRight size={18} />
                חזור
              </button>
            )}
            {step < 3 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex-1 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                המשך
                <ChevronLeft size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? 'יוצר...' : (
                  <>
                    <Check size={18} />
                    צור ועד בית
                  </>
                )}
              </button>
            )}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={onLogin}
              className="text-blue-600 hover:underline text-sm"
            >
              יש לך כבר חשבון? התחבר
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CredentialsSheet({ credentials }) {
  const [copied, setCopied] = useState(false)

  const allText = `ועד בית - ${credentials.buildingName}
קוד בניין: ${credentials.buildingCode}

מנהל:
שם משתמש: ${credentials.admin.username}

דיירים (סיסמה ראשונית: 123456 - חובה לשנות בכניסה ראשונה):
${credentials.tenants.map(t => `דירה ${t.apartmentNumber}: שם משתמש ${t.username} | סיסמה 123456`).join('\n')}
`

  const copyAll = () => {
    navigator.clipboard.writeText(allText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const print = () => window.print()

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden print:shadow-none">
        <div className="bg-emerald-600 text-white p-6 no-print">
          <h1 className="text-2xl font-bold mb-2">🎉 הוועד נוצר בהצלחה!</h1>
          <p className="text-emerald-100">חלק את פרטי הכניסה לדיירים. שמור את הדף או הדפס.</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-sm text-slate-500 mb-1">קוד בניין</div>
            <div className="text-2xl font-mono font-bold text-blue-600">{credentials.buildingCode}</div>
            <div className="text-xs text-slate-500 mt-1">דיירים יזינו את הקוד הזה בכניסה</div>
          </div>

          <div>
            <h3 className="font-bold text-slate-900 mb-3">דיירים - {credentials.tenants.length} משתמשים</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-sm text-amber-900">
              ⚠️ <strong>סיסמה ראשונית: 123456</strong> · בכניסה הראשונה - הדייר יחויב לשנות סיסמה
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {credentials.tenants.map(t => (
                <div key={t.apartmentNumber} className="bg-white border border-slate-200 rounded-lg p-3 text-center">
                  <div className="text-xs text-slate-500">דירה</div>
                  <div className="text-2xl font-bold text-slate-900">{t.apartmentNumber}</div>
                  <div className="text-xs text-slate-500 mt-1">משתמש</div>
                  <div className="font-mono font-semibold text-blue-600 text-sm">{t.username}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 no-print">
            <button
              onClick={copyAll}
              className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-semibold"
            >
              <Copy size={18} />
              {copied ? 'הועתק!' : 'העתק הכל'}
            </button>
            <button
              onClick={print}
              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-semibold"
            >
              <Printer size={18} />
              הדפס
            </button>
            <button
              onClick={() => window.location.reload()}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold"
            >
              היכנס למערכת
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
