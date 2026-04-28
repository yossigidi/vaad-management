import { useState, useRef } from 'react'
import { Save, Upload, Download, Trash2, AlertTriangle } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'

export default function Settings() {
  const { building, updateBuilding, exportData, importData, resetData } = useData()
  const [draft, setDraft] = useState({ ...building })
  const [saved, setSaved] = useState(false)
  const fileRef = useRef(null)

  const handleSave = () => {
    updateBuilding({
      ...draft,
      monthlyFee: parseFloat(draft.monthlyFee) || 0
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const ok = importData(ev.target.result)
      if (ok) {
        alert('הנתונים יובאו בהצלחה')
        window.location.reload()
      } else {
        alert('שגיאה בייבוא הקובץ')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1">הגדרות</h1>
        <p className="text-slate-500">פרטי הבניין ונתוני מערכת</p>
      </div>

      {/* Building info */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4">פרטי הבניין</h2>
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
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            <Save size={18} />
            שמור שינויים
          </button>
          {saved && (
            <span className="text-emerald-600 font-semibold text-sm">✓ נשמר</span>
          )}
        </div>
      </div>

      {/* Backup / Restore */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-900 mb-4">גיבוי ושחזור</h2>
        <p className="text-sm text-slate-500 mb-4">
          המערכת שומרת נתונים על המחשב שלך בלבד. מומלץ לגבות את הנתונים מדי פעם.
        </p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportData}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <Download size={18} />
            הורד גיבוי
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <Upload size={18} />
            שחזר מגיבוי
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImport}
            className="hidden"
          />
        </div>
      </div>

      {/* Danger zone */}
      <div className="bg-red-50 rounded-2xl p-6 border border-red-200">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="text-red-600" size={20} />
          <h2 className="text-xl font-bold text-red-900">אזור מסוכן</h2>
        </div>
        <p className="text-sm text-red-700 mb-4">
          מחיקה של כל הנתונים תאפס את המערכת. הפעולה לא הפיכה.
        </p>
        <button
          onClick={resetData}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold"
        >
          <Trash2 size={18} />
          מחק את כל הנתונים
        </button>
      </div>
    </div>
  )
}
