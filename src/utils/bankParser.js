// Parse CSV/text from Israeli bank statements
// Supports: Bank Hapoalim, Leumi, Discount, Mizrachi, generic

const HEBREW_DATE_PATTERNS = [
  /^(\d{2})\/(\d{2})\/(\d{4})$/, // DD/MM/YYYY
  /^(\d{2})\/(\d{2})\/(\d{2})$/, // DD/MM/YY
  /^(\d{2})-(\d{2})-(\d{4})$/, // DD-MM-YYYY
  /^(\d{4})-(\d{2})-(\d{2})$/  // YYYY-MM-DD
]

export const parseDate = (str) => {
  if (!str) return null
  const trimmed = String(str).trim()
  for (const pattern of HEBREW_DATE_PATTERNS) {
    const m = trimmed.match(pattern)
    if (m) {
      let year, month, day
      if (pattern === HEBREW_DATE_PATTERNS[3]) {
        // YYYY-MM-DD
        year = m[1]; month = m[2]; day = m[3]
      } else {
        day = m[1]; month = m[2]; year = m[3]
      }
      if (year.length === 2) year = '20' + year
      const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      // Validate
      const d = new Date(iso)
      if (isNaN(d)) return null
      return iso
    }
  }
  return null
}

export const parseAmount = (str) => {
  if (str === null || str === undefined || str === '') return null
  let s = String(str).trim()
  // Remove commas (thousand separator), currency symbols
  s = s.replace(/[₪$€,\s]/g, '')
  // Handle parentheses (negative)
  let neg = false
  if (s.startsWith('(') && s.endsWith(')')) {
    s = s.slice(1, -1)
    neg = true
  }
  if (s.startsWith('-')) {
    s = s.slice(1)
    neg = true
  }
  const n = parseFloat(s)
  if (isNaN(n)) return null
  return neg ? -n : n
}

const HEADER_KEYWORDS = {
  date: ['תאריך', 'date', 'תאריך ערך', 'תאריך עסקה'],
  description: ['תיאור', 'פרטים', 'description', 'פעולה', 'תאור', 'תיאור פעולה', 'אסמכתא'],
  debit: ['חובה', 'debit', 'משיכות', 'חיוב'],
  credit: ['זכות', 'credit', 'הפקדות', 'זיכוי'],
  amount: ['סכום', 'amount', 'סכום בשח'],
  balance: ['יתרה', 'balance', 'יתרה בשח'],
  reference: ['אסמכתא', 'reference', 'מספר אסמכתא']
}

const matchHeader = (header) => {
  const norm = String(header || '').trim().toLowerCase()
  for (const [key, keywords] of Object.entries(HEADER_KEYWORDS)) {
    for (const kw of keywords) {
      if (norm.includes(kw.toLowerCase())) return key
    }
  }
  return null
}

const splitCSVLine = (line, delimiter) => {
  // Handle quoted fields
  const result = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if (c === delimiter && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += c
    }
  }
  result.push(current)
  return result.map(s => s.trim().replace(/^"|"$/g, ''))
}

const detectDelimiter = (line) => {
  const counts = {
    ',': (line.match(/,/g) || []).length,
    '\t': (line.match(/\t/g) || []).length,
    ';': (line.match(/;/g) || []).length,
    '|': (line.match(/\|/g) || []).length
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

export const parseBankCSV = (text) => {
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) return { transactions: [], errors: ['קובץ ריק או לא תקין'] }

  // Try to find header line (one with multiple known keywords)
  let headerIdx = -1
  let delimiter = ','
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    delimiter = detectDelimiter(lines[i])
    const cells = splitCSVLine(lines[i], delimiter)
    const matches = cells.filter(c => matchHeader(c)).length
    if (matches >= 2) {
      headerIdx = i
      break
    }
  }

  if (headerIdx === -1) {
    return { transactions: [], errors: ['לא נמצאה שורת כותרת מזוהה. ודא שהקובץ כולל עמודות תאריך, תיאור, סכום/חובה/זכות'] }
  }

  const headers = splitCSVLine(lines[headerIdx], delimiter)
  const colMap = {}
  headers.forEach((h, idx) => {
    const k = matchHeader(h)
    if (k && colMap[k] === undefined) colMap[k] = idx
  })

  if (colMap.date === undefined) {
    return { transactions: [], errors: ['לא נמצאה עמודת תאריך'] }
  }
  if (colMap.amount === undefined && colMap.debit === undefined && colMap.credit === undefined) {
    return { transactions: [], errors: ['לא נמצאה עמודת סכום (חובה/זכות/סכום)'] }
  }

  const transactions = []
  const errors = []

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = splitCSVLine(lines[i], delimiter)
    if (cells.length < 2) continue

    const date = parseDate(cells[colMap.date])
    if (!date) continue // Skip rows without valid date (totals, footers)

    const description = colMap.description !== undefined ? cells[colMap.description] : ''
    const reference = colMap.reference !== undefined ? cells[colMap.reference] : ''

    let amount = null
    let type = null

    if (colMap.amount !== undefined) {
      amount = parseAmount(cells[colMap.amount])
      type = amount > 0 ? 'income' : 'expense'
    } else {
      const debit = colMap.debit !== undefined ? parseAmount(cells[colMap.debit]) : null
      const credit = colMap.credit !== undefined ? parseAmount(cells[colMap.credit]) : null
      if (credit && credit > 0) {
        amount = credit
        type = 'income'
      } else if (debit && debit > 0) {
        amount = -debit
        type = 'expense'
      }
    }

    if (amount === null || amount === 0) continue

    const balance = colMap.balance !== undefined ? parseAmount(cells[colMap.balance]) : null

    transactions.push({
      date,
      description: description.trim(),
      amount,
      type,
      balance,
      reference: reference.trim(),
      matchedTo: null
    })
  }

  return { transactions, errors }
}

// Try to auto-match a bank transaction with recorded payments/expenses
export const autoMatchTransaction = (tx, { tenants, payments, expenses, incomeStreams, building }) => {
  // Income transactions: try to match to vaad payment or income receipt
  if (tx.type === 'income') {
    // 1. Match by exact amount = monthly fee + apartment number in description
    if (building && tx.amount === building.monthlyFee) {
      const aptMatch = tx.description.match(/\b(\d{1,3})\b/)
      if (aptMatch) {
        const apt = parseInt(aptMatch[1])
        const tenant = tenants.find(t => t.apartmentNumber === apt)
        if (tenant) {
          return {
            type: 'vaad-payment',
            tenantId: tenant.id,
            apartmentNumber: tenant.apartmentNumber,
            confidence: 'high'
          }
        }
      }
      // Match by tenant name in description
      const tenantByName = tenants.find(t =>
        t.name && tx.description.includes(t.name)
      )
      if (tenantByName) {
        return {
          type: 'vaad-payment',
          tenantId: tenantByName.id,
          apartmentNumber: tenantByName.apartmentNumber,
          confidence: 'medium'
        }
      }
    }
    // 2. Match to additional income stream (parking etc)
    const stream = incomeStreams.find(s => s.monthlyAmount === tx.amount)
    if (stream) {
      return {
        type: 'additional-income',
        streamId: stream.id,
        streamName: stream.name,
        confidence: 'medium'
      }
    }
  }

  // Expense transactions: match by amount + date proximity
  if (tx.type === 'expense') {
    const txDate = new Date(tx.date)
    const candidates = expenses.filter(e => {
      if (!e.date) return false
      const eDate = new Date(e.date)
      const daysDiff = Math.abs((txDate - eDate) / (1000 * 60 * 60 * 24))
      return Math.abs(Number(e.amount) - Math.abs(tx.amount)) < 0.01 && daysDiff <= 7
    })
    if (candidates.length === 1) {
      return {
        type: 'expense',
        expenseId: candidates[0].id,
        description: candidates[0].description,
        confidence: 'high'
      }
    }
    if (candidates.length > 1) {
      return {
        type: 'expense',
        expenseId: candidates[0].id,
        description: candidates[0].description,
        confidence: 'low',
        multipleMatches: candidates.length
      }
    }
  }

  return null
}
