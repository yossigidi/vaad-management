export const formatCurrency = (n) => {
  const num = Number(n) || 0
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    maximumFractionDigits: 0
  }).format(num)
}

export const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return iso
  return d.toLocaleDateString('he-IL')
}

export const monthLabel = (yyyymm) => {
  if (!yyyymm) return ''
  const [year, month] = yyyymm.split('-')
  const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
  return `${months[parseInt(month) - 1]} ${year}`
}

export const monthShort = (yyyymm) => {
  if (!yyyymm) return ''
  const [year, month] = yyyymm.split('-')
  const months = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳']
  return `${months[parseInt(month) - 1]} ${year.slice(2)}`
}

export const currentMonth = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export const monthsBetween = (start, end) => {
  const months = []
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  let y = sy, m = sm
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`)
    m++
    if (m > 12) { m = 1; y++ }
  }
  return months
}

export const monthsFromStart = (startMonth) => {
  return monthsBetween(startMonth, currentMonth())
}
