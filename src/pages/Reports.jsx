import { useState } from 'react'
import { FileSpreadsheet, FileText, Download, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useData } from '../context/DataContext.jsx'
import { formatCurrency, formatDate, monthLabel, monthsFromStart, currentMonth } from '../utils/format.js'

export default function Reports() {
  const { building, tenants, payments, expenses, projects, projectPayments } = useData()
  const [reportMonth, setReportMonth] = useState(currentMonth())

  const months = monthsFromStart(building.startMonth)

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new()

    // Sheet 1: Tenants
    const tenantsSheet = tenants.map(t => ({
      'מספר דירה': t.apartmentNumber,
      'שם': t.name,
      'טלפון': t.phone,
      'אימייל': t.email,
      'סטטוס': t.active ? 'פעיל' : 'לא פעיל'
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tenantsSheet), 'דיירים')

    // Sheet 2: Payments matrix
    const paymentsMatrix = tenants.filter(t => t.active).map(t => {
      const row = { 'דירה': t.apartmentNumber, 'שם': t.name }
      months.forEach(m => {
        const p = payments.find(x => x.tenantId === t.id && x.month === m)
        row[monthLabel(m)] = p?.paid ? '✓' : '✗'
      })
      const debt = months.reduce((s, m) => {
        const p = payments.find(x => x.tenantId === t.id && x.month === m)
        return s + (p?.paid ? 0 : building.monthlyFee)
      }, 0)
      row['חוב'] = debt
      return row
    })
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(paymentsMatrix), 'תשלומי ועד')

    // Sheet 3: Expenses
    const expensesSheet = expenses.filter(e => !e.projectId).map(e => ({
      'תאריך': e.date,
      'תיאור': e.description,
      'קטגוריה': e.category,
      'סוג': e.type === 'fixed' ? 'קבועה' : 'משתנה',
      'סכום': e.amount
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expensesSheet), 'הוצאות')

    // Sheet 4: Projects
    if (projects.length > 0) {
      const projectsSheet = projects.map(p => {
        const collected = projectPayments
          .filter(pp => pp.projectId === p.id && pp.paid)
          .reduce((s, pp) => s + (pp.amount || 0), 0)
        const spent = expenses
          .filter(e => e.projectId === p.id)
          .reduce((s, e) => s + (Number(e.amount) || 0), 0)
        return {
          'שם': p.name,
          'תיאור': p.description || '',
          'תאריך התחלה': p.startDate,
          'סטטוס': p.status === 'active' ? 'פעיל' : 'הושלם',
          'סכום כולל': p.totalAmount,
          'לדייר': p.perTenantAmount,
          'נגבה': collected,
          'הוצא': spent,
          'יתרה': p.totalAmount - spent
        }
      })
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(projectsSheet), 'פרויקטים')
    }

    // Sheet 5: Summary
    const totalIncome = payments.filter(p => p.paid).reduce((s, p) => s + (p.amount || 0), 0)
    const totalExpenses = expenses.filter(e => !e.projectId).reduce((s, e) => s + Number(e.amount || 0), 0)
    const summarySheet = [
      { 'שדה': 'בניין', 'ערך': building.name },
      { 'שדה': 'כתובת', 'ערך': building.address },
      { 'שדה': 'דמי ועד חודשי', 'ערך': building.monthlyFee },
      { 'שדה': 'מספר דיירים', 'ערך': tenants.filter(t => t.active).length },
      { 'שדה': 'סך הכנסות', 'ערך': totalIncome },
      { 'שדה': 'סך הוצאות', 'ערך': totalExpenses },
      { 'שדה': 'יתרה', 'ערך': totalIncome - totalExpenses },
      { 'שדה': 'תאריך הדוח', 'ערך': new Date().toLocaleDateString('he-IL') }
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summarySheet), 'סיכום')

    XLSX.writeFile(wb, `vaad-report-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const printPage = () => {
    window.print()
  }

  // Compute monthly stats
  const activeTenants = tenants.filter(t => t.active)
  const monthPayments = activeTenants.map(t => {
    const p = payments.find(x => x.tenantId === t.id && x.month === reportMonth)
    return { tenant: t, paid: !!p?.paid }
  })
  const paidCount = monthPayments.filter(x => x.paid).length
  const monthExpenses = expenses
    .filter(e => !e.projectId && e.date?.startsWith(reportMonth))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const monthExpensesTotal = monthExpenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const monthIncome = paidCount * building.monthlyFee

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h1 className="text-3xl font-bold text-slate-900 mb-1">דוחות</h1>
        <p className="text-slate-500">ייצוא לאקסל והדפסה</p>
      </div>

      {/* Export buttons */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 no-print">
        <h3 className="font-bold text-slate-900 mb-4">ייצוא נתונים</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg font-semibold"
          >
            <FileSpreadsheet size={20} />
            ייצא לאקסל (כל הנתונים)
          </button>
          <button
            onClick={printPage}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold"
          >
            <Printer size={20} />
            הדפס דוח חודשי
          </button>
          <button
            onClick={() => {
              const data = JSON.stringify({ building, tenants, payments, expenses, projects, projectPayments }, null, 2)
              const blob = new Blob([data], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `vaad-backup-${new Date().toISOString().slice(0, 10)}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-4 py-3 rounded-lg font-semibold"
          >
            <Download size={20} />
            גיבוי (JSON)
          </button>
        </div>
      </div>

      {/* Month selector */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 no-print">
        <label className="block text-sm font-medium text-slate-700 mb-1">חודש לדוח</label>
        <select
          value={reportMonth}
          onChange={e => setReportMonth(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 font-bold"
        >
          {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </div>

      {/* Printable Report */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 print:shadow-none print:border-0 print:rounded-none">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900">דוח חודשי - {monthLabel(reportMonth)}</h2>
          <p className="text-slate-600 mt-1">{building.name} - {building.address}</p>
          <p className="text-sm text-slate-500 mt-1">הופק בתאריך: {new Date().toLocaleDateString('he-IL')}</p>
        </div>

        {/* Summary */}
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 mb-3">סיכום החודש</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-slate-500">הכנסות מועד</div>
              <div className="text-xl font-bold text-emerald-600">{formatCurrency(monthIncome)}</div>
              <div className="text-xs text-slate-400">{paidCount}/{activeTenants.length} דיירים</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">הוצאות</div>
              <div className="text-xl font-bold text-amber-600">{formatCurrency(monthExpensesTotal)}</div>
              <div className="text-xs text-slate-400">{monthExpenses.length} פריטים</div>
            </div>
            <div>
              <div className="text-sm text-slate-500">יתרה חודשית</div>
              <div className={`text-xl font-bold ${monthIncome - monthExpensesTotal >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatCurrency(monthIncome - monthExpensesTotal)}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500">חייבים</div>
              <div className="text-xl font-bold text-red-600">{activeTenants.length - paidCount}</div>
            </div>
          </div>
        </div>

        {/* Payments */}
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 mb-3">תשלומי דיירים</h3>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-right p-2 text-sm">דירה</th>
                <th className="text-right p-2 text-sm">שם</th>
                <th className="text-center p-2 text-sm">סטטוס</th>
                <th className="text-left p-2 text-sm">סכום</th>
              </tr>
            </thead>
            <tbody>
              {monthPayments.sort((a, b) => a.tenant.apartmentNumber - b.tenant.apartmentNumber).map(({ tenant, paid }) => (
                <tr key={tenant.id} className={`border-b border-slate-100 ${!paid ? 'bg-red-50' : ''}`}>
                  <td className="p-2 font-semibold">{tenant.apartmentNumber}</td>
                  <td className="p-2">{tenant.name}</td>
                  <td className="p-2 text-center">
                    <span className={paid ? 'text-emerald-600 font-semibold' : 'text-red-600 font-bold'}>
                      {paid ? '✓ שולם' : '✗ לא שולם'}
                    </span>
                  </td>
                  <td className="p-2 text-left">{formatCurrency(building.monthlyFee)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold bg-slate-50">
                <td colSpan={3} className="p-2">סה"כ נגבה</td>
                <td className="p-2 text-left text-emerald-600">{formatCurrency(monthIncome)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Expenses */}
        <div className="p-6">
          <h3 className="font-bold text-slate-900 mb-3">הוצאות החודש</h3>
          {monthExpenses.length === 0 ? (
            <p className="text-slate-400">אין הוצאות החודש</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-right p-2 text-sm">תאריך</th>
                  <th className="text-right p-2 text-sm">תיאור</th>
                  <th className="text-right p-2 text-sm">קטגוריה</th>
                  <th className="text-right p-2 text-sm">סוג</th>
                  <th className="text-left p-2 text-sm">סכום</th>
                </tr>
              </thead>
              <tbody>
                {monthExpenses.map(e => (
                  <tr key={e.id} className="border-b border-slate-100">
                    <td className="p-2 text-sm">{formatDate(e.date)}</td>
                    <td className="p-2">{e.description}</td>
                    <td className="p-2 text-sm">{e.category}</td>
                    <td className="p-2 text-sm">{e.type === 'fixed' ? 'קבועה' : 'משתנה'}</td>
                    <td className="p-2 text-left">{formatCurrency(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold bg-slate-50">
                  <td colSpan={4} className="p-2">סה"כ הוצאות</td>
                  <td className="p-2 text-left text-amber-600">{formatCurrency(monthExpensesTotal)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
