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

// ===== Period helpers for variable frequency billing =====

export const FREQUENCY_LABELS = {
  monthly: 'חודשי',
  'bi-monthly': 'דו-חודשי',
  yearly: 'שנתי'
}

export const FREQUENCY_PERIODS_PER_YEAR = {
  monthly: 12,
  'bi-monthly': 6,
  yearly: 1
}

// Generate periods for a given frequency between start and current
// Returns array of period strings:
//   monthly: 'YYYY-MM'
//   bi-monthly: 'YYYY-MM-MM' (e.g., '2026-01-02')
//   yearly: 'YYYY'
export const generatePeriods = (frequency, startMonth) => {
  const cur = currentMonth()
  const [sy, sm] = startMonth.split('-').map(Number)
  const [cy, cm] = cur.split('-').map(Number)

  if (frequency === 'monthly' || !frequency) {
    return monthsBetween(startMonth, cur)
  }

  if (frequency === 'bi-monthly') {
    const periods = []
    // Bi-monthly periods always start on odd months: 1, 3, 5, 7, 9, 11
    let y = sy
    let m = sm % 2 === 0 ? sm - 1 : sm
    while (y < cy || (y === cy && m <= cm)) {
      periods.push(`${y}-${String(m).padStart(2, '0')}-${String(m + 1).padStart(2, '0')}`)
      m += 2
      if (m > 12) { m = 1; y++ }
    }
    return periods
  }

  if (frequency === 'yearly') {
    const periods = []
    for (let y = sy; y <= cy; y++) periods.push(String(y))
    return periods
  }

  return []
}

const HEBREW_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

export const periodLabel = (period, frequency) => {
  if (!period) return ''
  if (frequency === 'monthly' || !frequency) return monthLabel(period)
  if (frequency === 'bi-monthly') {
    const parts = period.split('-')
    if (parts.length !== 3) return period
    const [year, m1, m2] = parts
    return `${HEBREW_MONTHS[parseInt(m1) - 1]}-${HEBREW_MONTHS[parseInt(m2) - 1]} ${year}`
  }
  if (frequency === 'yearly') return `שנת ${period}`
  return period
}

export const periodShort = (period, frequency) => {
  if (!period) return ''
  if (frequency === 'monthly' || !frequency) return monthShort(period)
  if (frequency === 'bi-monthly') {
    const parts = period.split('-')
    if (parts.length !== 3) return period
    const [year, m1, m2] = parts
    return `${HEBREW_MONTHS[parseInt(m1) - 1].slice(0, 3)}-${HEBREW_MONTHS[parseInt(m2) - 1].slice(0, 3)} ${year.slice(2)}`
  }
  if (frequency === 'yearly') return period
  return period
}

// Convert per-period amount to monthly equivalent (for unified stats)
export const monthlyEquivalent = (amount, frequency) => {
  const perYear = FREQUENCY_PERIODS_PER_YEAR[frequency || 'monthly']
  return (Number(amount) || 0) * perYear / 12
}

// Get current period for a frequency
export const currentPeriodFor = (frequency, startMonth) => {
  const periods = generatePeriods(frequency, startMonth)
  return periods[periods.length - 1] || ''
}

