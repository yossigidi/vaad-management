// Smart Excel/CSV importer for vaad management data
// Detects: vaad payments (matrix), expenses (list), income (list)

const HEBREW_MONTHS = {
  'ינואר': 1, 'ינו': 1, 'ינו׳': 1, 'jan': 1, 'january': 1,
  'פברואר': 2, 'פבר': 2, 'פבר׳': 2, 'feb': 2, 'february': 2,
  'מרץ': 3, 'מרס': 3, 'mar': 3, 'march': 3,
  'אפריל': 4, 'אפר': 4, 'אפר׳': 4, 'apr': 4, 'april': 4,
  'מאי': 5, 'may': 5,
  'יוני': 6, 'jun': 6, 'june': 6,
  'יולי': 7, 'jul': 7, 'july': 7,
  'אוגוסט': 8, 'אוג': 8, 'אוג׳': 8, 'aug': 8, 'august': 8,
  'ספטמבר': 9, 'ספט': 9, 'ספט׳': 9, 'sep': 9, 'september': 9,
  'אוקטובר': 10, 'אוק': 10, 'אוק׳': 10, 'oct': 10, 'october': 10,
  'נובמבר': 11, 'נוב': 11, 'נוב׳': 11, 'nov': 11, 'november': 11,
  'דצמבר': 12, 'דצמ': 12, 'דצמ׳': 12, 'dec': 12, 'december': 12
}

const HEADER_PATTERNS = {
  date: /תאריך|date|יום/i,
  description: /תיאור|פרטים|description|פעולה|תאור|הערה|note/i,
  amount: /סכום|amount|total|מחיר/i,
  debit: /חובה|debit|הוצאה|חיוב/i,
  credit: /זכות|credit|הכנסה|זיכוי/i,
  category: /קטגוריה|category|סוג/i,
  tenantName: /שם|name|דייר/i,
  apartment: /דירה|apt|apartment|מספר דירה/i,
  month: /חודש|month/i,
  year: /שנה|year/i,
  paid: /שולם|שילם|paid/i
}

export const parseDate = (value) => {
  if (value === null || value === undefined || value === '') return null
  // Excel date number (days since 1900-01-01)
  if (typeof value === 'number' && value > 1000 && value < 100000) {
    const epoch = new Date(1899, 11, 30) // Excel epoch
    const date = new Date(epoch.getTime() + value * 86400000)
    if (!isNaN(date)) return date.toISOString().slice(0, 10)
  }
  if (value instanceof Date && !isNaN(value)) {
    return value.toISOString().slice(0, 10)
  }
  const str = String(value).trim()
  // DD/MM/YYYY or DD/MM/YY
  let m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m) {
    let [, d, mo, y] = m
    if (y.length === 2) y = '20' + y
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  // YYYY-MM-DD
  m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return str
  // DD.MM.YYYY
  m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/)
  if (m) {
    let [, d, mo, y] = m
    if (y.length === 2) y = '20' + y
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

export const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value
  let s = String(value).trim()
  s = s.replace(/[₪$€\s,]/g, '')
  let neg = false
  if (s.startsWith('(') && s.endsWith(')')) { s = s.slice(1, -1); neg = true }
  if (s.startsWith('-')) { s = s.slice(1); neg = true }
  const n = parseFloat(s)
  if (isNaN(n)) return null
  return neg ? -n : n
}

// Detect a month/year from various string formats
export const parseMonth = (value) => {
  if (value === null || value === undefined || value === '') return null
  // If it's a date, extract YYYY-MM
  const d = parseDate(value)
  if (d) return d.slice(0, 7)

  const str = String(value).trim().toLowerCase()
  // Match Hebrew/English month + year: "ינואר 2026", "Jan 2026", "01/2026"
  const monthYearMatch = str.match(/(\D+)\s*(\d{4})/)
  if (monthYearMatch) {
    const monthName = monthYearMatch[1].trim().replace(/[׳']/g, '')
    const year = monthYearMatch[2]
    const month = HEBREW_MONTHS[monthName] || HEBREW_MONTHS[monthName.replace(/\s+/g, '')]
    if (month) return `${year}-${String(month).padStart(2, '0')}`
  }
  // MM/YYYY or M/YYYY
  const mm = str.match(/^(\d{1,2})\/(\d{4})$/)
  if (mm) return `${mm[2]}-${String(mm[1]).padStart(2, '0')}`
  // YYYY-MM
  const ym = str.match(/^(\d{4})-(\d{1,2})$/)
  if (ym) return `${ym[1]}-${String(ym[2]).padStart(2, '0')}`
  // Just month name (assume current year)
  const justMonth = HEBREW_MONTHS[str.replace(/[׳']/g, '')]
  if (justMonth) {
    return `${new Date().getFullYear()}-${String(justMonth).padStart(2, '0')}`
  }
  return null
}

// Detect column from header keywords
const matchHeader = (header) => {
  const norm = String(header || '').trim().toLowerCase()
  if (!norm) return null
  for (const [key, pattern] of Object.entries(HEADER_PATTERNS)) {
    if (pattern.test(norm)) return key
  }
  return null
}

// Find header row (the row with the most matching headers)
const findHeaderRow = (rows, maxLookahead = 10) => {
  let bestRow = -1
  let bestScore = 0
  for (let i = 0; i < Math.min(rows.length, maxLookahead); i++) {
    const score = rows[i].filter(c => matchHeader(c)).length
    if (score > bestScore) {
      bestScore = score
      bestRow = i
    }
  }
  return { headerRow: bestRow, score: bestScore }
}

// Build column map from header row
const buildColumnMap = (headerRow) => {
  const map = {}
  headerRow.forEach((cell, idx) => {
    const key = matchHeader(cell)
    if (key && map[key] === undefined) map[key] = idx
  })
  return map
}

// ===== Detection Logic =====

// Detect if a sheet looks like a vaad-payments matrix:
// First column = months/dates, header row = apartment numbers/names
const detectVaadMatrix = (rows) => {
  if (rows.length < 3) return null

  // Look for a header row where most cells look like apartment numbers
  // (small integers 1-50)
  let headerRow = -1
  let aptColumns = []
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i]
    const numericCells = row.map((c, j) => ({
      idx: j,
      value: c,
      num: typeof c === 'number' ? c : parseFloat(String(c).match(/\d+/)?.[0])
    })).filter(x => !isNaN(x.num) && x.num >= 1 && x.num <= 200)

    if (numericCells.length >= 3) {
      headerRow = i
      aptColumns = numericCells
      break
    }
  }
  if (headerRow === -1) return null

  // Check if column 0 of subsequent rows has month-like values
  let validMonths = 0
  for (let i = headerRow + 1; i < Math.min(headerRow + 20, rows.length); i++) {
    if (parseMonth(rows[i][0])) validMonths++
  }
  if (validMonths < 2) return null

  return {
    type: 'vaad-matrix',
    confidence: validMonths >= 5 ? 'high' : 'medium',
    headerRow,
    monthColumn: 0,
    aptColumns
  }
}

// Detect if a sheet looks like a list (date + amount + description)
const detectList = (rows) => {
  if (rows.length < 3) return null
  const { headerRow, score } = findHeaderRow(rows)
  if (headerRow === -1 || score < 2) return null

  const colMap = buildColumnMap(rows[headerRow])
  if (colMap.date === undefined) return null

  // Has amount-related column?
  const hasAmount = colMap.amount !== undefined ||
                    colMap.debit !== undefined ||
                    colMap.credit !== undefined
  if (!hasAmount) return null

  // Determine if it's expenses (more debit) or income (more credit)
  let totalDebit = 0
  let totalCredit = 0
  let totalSigned = 0
  for (let i = headerRow + 1; i < Math.min(headerRow + 50, rows.length); i++) {
    if (colMap.debit !== undefined) {
      const d = parseAmount(rows[i][colMap.debit])
      if (d) totalDebit += d
    }
    if (colMap.credit !== undefined) {
      const c = parseAmount(rows[i][colMap.credit])
      if (c) totalCredit += c
    }
    if (colMap.amount !== undefined) {
      const a = parseAmount(rows[i][colMap.amount])
      if (a) totalSigned += a
    }
  }

  let type = 'expenses'
  if (totalCredit > totalDebit) type = 'income'
  else if (totalSigned > 0) type = 'income'

  return {
    type,
    confidence: score >= 3 ? 'high' : 'medium',
    headerRow,
    colMap
  }
}

export const detectSheetType = (rows) => {
  if (!rows || rows.length === 0) return { type: 'unknown', confidence: 'none' }
  const matrix = detectVaadMatrix(rows)
  if (matrix && matrix.confidence === 'high') return matrix
  const list = detectList(rows)
  if (list && list.confidence === 'high') return list
  if (matrix) return matrix
  if (list) return list
  return { type: 'unknown', confidence: 'none' }
}

// ===== Extraction =====

// Extract vaad payments from matrix
export const extractVaadMatrix = (rows, detection, tenantsByApt, monthlyFee) => {
  const records = []
  const errors = []
  const { headerRow, monthColumn, aptColumns } = detection

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const month = parseMonth(row[monthColumn])
    if (!month) continue

    for (const apt of aptColumns) {
      const cell = row[apt.idx]
      if (cell === null || cell === undefined || cell === '') continue
      const tenant = tenantsByApt[apt.num]
      if (!tenant) {
        errors.push(`דירה ${apt.num} לא קיימת ברשימת הדיירים - דולג ${month}`)
        continue
      }

      // Determine if paid: any cell with V/✓/X/payment marker or numeric > 0 = paid
      const cellStr = String(cell).trim().toLowerCase()
      const cellNum = parseAmount(cell)
      const isPaid = cellStr === 'v' || cellStr === '✓' || cellStr === 'x' ||
                     cellStr === 'שולם' || cellStr === 'כן' ||
                     (cellNum !== null && cellNum > 0)

      if (isPaid) {
        records.push({
          tenantId: tenant.id,
          month,
          paid: true,
          amount: cellNum && cellNum > 0 ? cellNum : monthlyFee,
          method: 'cash',
          note: 'יובא מקובץ אקסל'
        })
      }
    }
  }

  return { records, errors }
}

// Extract expenses or income from list
export const extractList = (rows, detection, defaultCategory) => {
  const records = []
  const errors = []
  const { headerRow, colMap } = detection
  const isIncome = detection.type === 'income'

  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row) continue
    const date = parseDate(row[colMap.date])
    if (!date) continue

    let amount = null
    if (colMap.amount !== undefined) {
      amount = parseAmount(row[colMap.amount])
    } else {
      const debit = colMap.debit !== undefined ? parseAmount(row[colMap.debit]) : null
      const credit = colMap.credit !== undefined ? parseAmount(row[colMap.credit]) : null
      if (debit && debit > 0) amount = -debit
      else if (credit && credit > 0) amount = credit
    }
    if (amount === null || amount === 0) continue

    const description = colMap.description !== undefined
      ? String(row[colMap.description] || '').trim()
      : ''
    const category = colMap.category !== undefined && row[colMap.category]
      ? String(row[colMap.category]).trim()
      : defaultCategory

    if (isIncome) {
      records.push({
        date,
        description: description || 'הכנסה (מאקסל)',
        category,
        amount: Math.abs(amount)
      })
    } else {
      records.push({
        date,
        description: description || 'הוצאה (מאקסל)',
        category,
        amount: Math.abs(amount),
        type: 'variable'
      })
    }
  }

  return { records, errors }
}

// ===== Excel parsing (uses xlsx library, dynamically loaded) =====
export const parseExcelFile = async (file) => {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  return wb.SheetNames.map(name => ({
    name,
    rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' })
  }))
}
