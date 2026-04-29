import { useState, useRef, useMemo } from 'react'
import {
  Upload, FileSpreadsheet, AlertCircle, CheckCircle2,
  X, ChevronDown, ChevronUp, Sparkles, Loader2, Trash2
} from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import {
  parseExcelFile, detectSheetType, extractVaadMatrix, extractList
} from '../utils/excelImporter.js'
import { formatCurrency, formatDate, monthLabel } from '../utils/format.js'

const TYPE_LABELS = {
  'vaad-matrix': { label: 'תשלומי ועד', icon: '💰', color: 'blue' },
  'expenses': { label: 'הוצאות', icon: '🧾', color: 'amber' },
  'income': { label: 'הכנסות נוספות', icon: '📈', color: 'emerald' },
  'unknown': { label: 'לא מזוהה', icon: '❓', color: 'slate' }
}

export default function ImportData() {
  const { building, tenants, payments, setPayment, addExpense, categories } = useData()
  const fileRef = useRef()
  const [file, setFile] = useState(null)
  const [sheets, setSheets] = useState([]) // {name, rows, detection, records, errors, expanded}
  const [parsing, setParsing] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const [error, setError] = useState('')

  const tenantsByApt = useMemo(() => {
    const m = {}
    tenants.forEach(t => { m[t.apartmentNumber] = t })
    return m
  }, [tenants])

  const handleFileSelect = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setError('')
    setImportResult(null)
    setFile(f)
    setParsing(true)

    try {
      const sheetData = await parseExcelFile(f)
      const enriched = sheetData.map(s => {
        const detection = detectSheetType(s.rows)
        let records = []
        let errors = []
        if (detection.type === 'vaad-matrix') {
          const result = extractVaadMatrix(s.rows, detection, tenantsByApt, building?.monthlyFee || 0)
          records = result.records
          errors = result.errors
        } else if (detection.type === 'expenses' || detection.type === 'income') {
          const result = extractList(s.rows, detection, categories[0] || 'אחר')
          records = result.records
          errors = result.errors
        }
        return {
          name: s.name,
          rows: s.rows,
          detection,
          selectedType: detection.type,
          records,
          errors,
          enabled: detection.type !== 'unknown' && records.length > 0,
          expanded: false
        }
      })
      setSheets(enriched)
    } catch (err) {
      console.error(err)
      setError('שגיאה בקריאת הקובץ: ' + err.message)
    } finally {
      setParsing(false)
    }
  }

  const toggleSheetEnabled = (idx) => {
    setSheets(prev => prev.map((s, i) => i === idx ? { ...s, enabled: !s.enabled } : s))
  }

  const toggleSheetExpanded = (idx) => {
    setSheets(prev => prev.map((s, i) => i === idx ? { ...s, expanded: !s.expanded } : s))
  }

  const changeSheetType = (idx, newType) => {
    setSheets(prev => prev.map((s, i) => {
      if (i !== idx) return s
      let records = []
      let errors = []
      if (newType === 'vaad-matrix') {
        const detection = { ...s.detection, type: 'vaad-matrix' }
        const result = extractVaadMatrix(s.rows, detection, tenantsByApt, building?.monthlyFee || 0)
        records = result.records
        errors = result.errors
      } else if (newType === 'expenses' || newType === 'income') {
        const detection = { ...s.detection, type: newType }
        const result = extractList(s.rows, detection, categories[0] || 'אחר')
        records = result.records
        errors = result.errors
      }
      return { ...s, selectedType: newType, records, errors, enabled: records.length > 0 }
    }))
  }

  const handleImport = async () => {
    setImporting(true)
    setError('')
    let totalPayments = 0
    let totalExpenses = 0
    let skipped = 0
    const importErrors = []

    try {
      for (const sheet of sheets) {
        if (!sheet.enabled) continue

        if (sheet.selectedType === 'vaad-matrix') {
          for (const r of sheet.records) {
            try {
              const existing = payments.find(p => p.tenantId === r.tenantId && p.month === r.month)
              if (existing && existing.paid) {
                skipped++
                continue
              }
              await setPayment(r.tenantId, r.month, true, {
                paidDate: `${r.month}-15`,
                method: r.method || 'cash',
                note: r.note
              })
              totalPayments++
            } catch (err) {
              importErrors.push(`תשלום ${r.month}: ${err.message}`)
            }
          }
        } else if (sheet.selectedType === 'expenses') {
          for (const r of sheet.records) {
            try {
              await addExpense({
                ...r,
                projectId: null
              })
              totalExpenses++
            } catch (err) {
              importErrors.push(`הוצאה ${r.date}: ${err.message}`)
            }
          }
        }
        // Income import: skip for now (requires creating streams first - too risky to auto-create)
      }

      setImportResult({ totalPayments, totalExpenses, skipped, errors: importErrors })
      setSheets([])
      setFile(null)
    } catch (err) {
      setError('שגיאה בייבוא: ' + err.message)
    } finally {
      setImporting(false)
    }
  }

  const totalToImport = useMemo(() =>
    sheets.filter(s => s.enabled).reduce((sum, s) => sum + s.records.length, 0)
  , [sheets])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-1 flex items-center gap-2">
          <Sparkles className="text-blue-500" size={28} />
          ייבוא נתונים מאקסל
        </h1>
        <p className="text-slate-500">העלה קבצי אקסל של שנים קודמות - המערכת תזהה אוטומטית מה זה ותוסיף לסעיפים המתאימים</p>
      </div>

      {/* Upload */}
      {sheets.length === 0 && !importResult && (
        <div className="bg-white rounded-2xl p-12 border-2 border-dashed border-slate-300 text-center">
          {parsing ? (
            <>
              <Loader2 size={48} className="mx-auto text-blue-500 mb-3 animate-spin" />
              <h3 className="text-lg font-semibold text-slate-700">קורא את הקובץ...</h3>
            </>
          ) : (
            <>
              <FileSpreadsheet size={48} className="mx-auto text-slate-400 mb-3" />
              <h3 className="text-lg font-semibold text-slate-700 mb-1">בחר קובץ אקסל</h3>
              <p className="text-slate-500 mb-4 text-sm">תומך ב-.xlsx, .xls, .csv · הקובץ נשאר אצלך</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold inline-flex items-center gap-2"
              >
                <Upload size={18} />
                העלה קובץ
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv,.tsv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <strong>שגיאה:</strong> {error}
        </div>
      )}

      {/* Detected sheets */}
      {sheets.length > 0 && (
        <>
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="text-blue-600" size={20} />
              <strong className="text-blue-900">{file?.name}</strong>
            </div>
            <p className="text-sm text-blue-800">
              נמצאו {sheets.length} גליונות. בחר אילו לייבא ובדוק שהזיהוי נכון.
            </p>
          </div>

          {sheets.map((sheet, idx) => (
            <SheetCard
              key={idx}
              sheet={sheet}
              tenantsByApt={tenantsByApt}
              onToggle={() => toggleSheetEnabled(idx)}
              onExpand={() => toggleSheetExpanded(idx)}
              onChangeType={(newType) => changeSheetType(idx, newType)}
            />
          ))}

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 sticky bottom-4 flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="text-sm text-slate-500">סה"כ לייבוא</div>
              <div className="text-2xl font-bold text-slate-900">{totalToImport} רשומות</div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setSheets([]); setFile(null) }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-semibold"
              >
                ביטול
              </button>
              <button
                onClick={handleImport}
                disabled={importing || totalToImport === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
              >
                {importing ? <><Loader2 size={16} className="animate-spin" /> מייבא...</> : <>✓ ייבא {totalToImport} רשומות</>}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Result */}
      {importResult && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="text-emerald-600" size={24} />
            <h3 className="text-xl font-bold text-emerald-900">הייבוא הסתיים!</h3>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500">תשלומים</div>
              <div className="text-2xl font-bold text-emerald-600">{importResult.totalPayments}</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500">הוצאות</div>
              <div className="text-2xl font-bold text-amber-600">{importResult.totalExpenses}</div>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <div className="text-xs text-slate-500">דולגו (כבר קיים)</div>
              <div className="text-2xl font-bold text-slate-600">{importResult.skipped}</div>
            </div>
          </div>
          {importResult.errors.length > 0 && (
            <details className="bg-white rounded-lg p-3 mb-3">
              <summary className="text-sm text-amber-700 cursor-pointer">
                {importResult.errors.length} שגיאות (לחץ לפרטים)
              </summary>
              <ul className="text-xs text-slate-600 mt-2 list-disc mr-5 space-y-0.5">
                {importResult.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
          <button
            onClick={() => setImportResult(null)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-semibold"
          >
            ייבא קובץ נוסף
          </button>
        </div>
      )}
    </div>
  )
}

function SheetCard({ sheet, tenantsByApt, onToggle, onExpand, onChangeType }) {
  const typeInfo = TYPE_LABELS[sheet.selectedType] || TYPE_LABELS.unknown
  const colorMap = {
    blue: 'border-blue-300 bg-blue-50',
    amber: 'border-amber-300 bg-amber-50',
    emerald: 'border-emerald-300 bg-emerald-50',
    slate: 'border-slate-300 bg-slate-50'
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border-2 transition-colors ${sheet.enabled ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <input
            type="checkbox"
            checked={sheet.enabled}
            onChange={onToggle}
            className="mt-1 w-5 h-5 rounded"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl">{typeInfo.icon}</span>
              <h3 className="font-bold text-slate-900 truncate">{sheet.name}</h3>
              <div className={`text-xs font-semibold px-2 py-0.5 rounded ${colorMap[typeInfo.color]} border`}>
                {typeInfo.label}
              </div>
              {sheet.detection.confidence === 'high' && (
                <div className="text-xs text-emerald-600 font-semibold">✓ זיהוי גבוה</div>
              )}
              {sheet.detection.confidence === 'medium' && (
                <div className="text-xs text-amber-600 font-semibold">~ זיהוי בינוני</div>
              )}
              {sheet.detection.confidence === 'low' && (
                <div className="text-xs text-amber-600 font-semibold">⚠ זיהוי נמוך</div>
              )}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {sheet.records.length} רשומות זוהו · {sheet.errors.length > 0 && `${sheet.errors.length} שגיאות · `}
              {sheet.rows.length} שורות בגליון
            </div>
          </div>
          <button
            onClick={onExpand}
            className="p-1 text-slate-500 hover:bg-slate-100 rounded"
          >
            {sheet.expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        <div className="mb-2">
          <label className="block text-xs text-slate-500 mb-1">סוג נתונים</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <button
                key={k}
                onClick={() => onChangeType(k)}
                className={`p-2 rounded-lg border-2 text-sm font-semibold ${sheet.selectedType === k ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600'}`}
              >
                {v.icon} {v.label}
              </button>
            ))}
          </div>
        </div>

        {sheet.expanded && (
          <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
            <div>
              <h4 className="font-semibold text-slate-700 text-sm mb-2">תצוגה מקדימה ({Math.min(5, sheet.rows.length)} שורות ראשונות)</h4>
              <div className="overflow-x-auto">
                <table className="text-xs border border-slate-200 w-full">
                  <tbody>
                    {sheet.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className={i === sheet.detection.headerRow ? 'bg-blue-50 font-semibold' : ''}>
                        {row.slice(0, 12).map((cell, j) => (
                          <td key={j} className="border border-slate-200 p-1.5 max-w-[100px] truncate">
                            {String(cell || '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {sheet.records.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-700 text-sm mb-2">רשומות שזוהו (5 ראשונות)</h4>
                <div className="space-y-1 text-xs">
                  {sheet.records.slice(0, 5).map((r, i) => (
                    <div key={i} className="bg-slate-50 rounded p-2">
                      {sheet.selectedType === 'vaad-matrix' ? (
                        <span>
                          {monthLabel(r.month)} · דירה {tenantsByApt[Object.keys(tenantsByApt).find(k => tenantsByApt[k].id === r.tenantId)]?.apartmentNumber || '?'} · {formatCurrency(r.amount)}
                        </span>
                      ) : (
                        <span>
                          {formatDate(r.date)} · {r.description} · {formatCurrency(r.amount)}
                        </span>
                      )}
                    </div>
                  ))}
                  {sheet.records.length > 5 && <div className="text-slate-400">... ועוד {sheet.records.length - 5}</div>}
                </div>
              </div>
            )}

            {sheet.errors.length > 0 && (
              <div>
                <h4 className="font-semibold text-red-700 text-sm mb-2">⚠ שגיאות ({sheet.errors.length})</h4>
                <div className="space-y-1 text-xs">
                  {sheet.errors.slice(0, 5).map((e, i) => (
                    <div key={i} className="bg-red-50 rounded p-1.5 text-red-700">{e}</div>
                  ))}
                  {sheet.errors.length > 5 && <div className="text-slate-400">... ועוד {sheet.errors.length - 5}</div>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
