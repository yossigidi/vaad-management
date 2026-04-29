// PDF parser - extracts structured table data from PDF files
// Uses pdfjs-dist for browser-side PDF text extraction

const PDF_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.7.76/build/pdf.worker.min.mjs'

let pdfjsLib = null

const loadPdfJs = async () => {
  if (pdfjsLib) return pdfjsLib
  pdfjsLib = await import('pdfjs-dist/build/pdf.mjs')
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL
  return pdfjsLib
}

// Extract text items with positions from each page
export const extractPdfPages = async (file) => {
  const lib = await loadPdfJs()
  const buffer = await file.arrayBuffer()
  const pdf = await lib.getDocument({ data: buffer }).promise
  const pages = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()
    // Items have: str, transform [a,b,c,d,x,y], width, height
    const items = content.items.map(item => ({
      text: item.str,
      x: item.transform[4],
      y: item.transform[5],
      w: item.width,
      h: item.height
    })).filter(i => i.text.trim() !== '')
    pages.push({ page: p, items })
  }
  return pages
}

// Group text items into rows based on Y coordinate
// Items within `tolerance` Y-pixels are considered same row
const groupIntoRows = (items, tolerance = 3) => {
  if (items.length === 0) return []
  const sorted = [...items].sort((a, b) => b.y - a.y) // top to bottom
  const rows = []
  let currentRow = []
  let currentY = sorted[0].y

  for (const item of sorted) {
    if (Math.abs(item.y - currentY) <= tolerance) {
      currentRow.push(item)
    } else {
      if (currentRow.length) rows.push(currentRow)
      currentRow = [item]
      currentY = item.y
    }
  }
  if (currentRow.length) rows.push(currentRow)

  // Sort each row by X (right to left for RTL Hebrew)
  return rows.map(row => row.sort((a, b) => b.x - a.x))
}

// Convert position-grouped rows to text array of arrays
const rowsToTextMatrix = (rows) => {
  return rows.map(row => row.map(item => item.text.trim()).filter(t => t))
}

// Convert PDF pages to flat text matrix (multiple "sheets" - one per page)
export const pdfToSheets = async (file) => {
  const pages = await extractPdfPages(file)
  const sheets = []

  for (const page of pages) {
    const grouped = groupIntoRows(page.items)
    const matrix = rowsToTextMatrix(grouped)
    sheets.push({
      name: `עמוד ${page.page}`,
      rows: matrix
    })
  }

  // Try to merge consecutive pages that look like the same table (same headers)
  // For now, return as separate sheets - user can disable extras
  return sheets
}

// Specialized parser for Hebrew vaad payment matrix PDFs
// Looks for patterns like:
//   "תשלומי דיירים..."
//   "לשנת YYYY דירה 1 דירה 2 ..."
//   "וורקו קירנברג ..." (tenant names)
//   "ינואר 250 250 ..."
export const parseVaadPaymentPdf = (rows) => {
  const result = {
    year: null,
    apartments: [], // [{ aptNum, tenantName }]
    monthlyPayments: {}, // { 'ינואר': [250, 250, ...], ... }
    totals: []
  }

  let yearRowIdx = -1
  let nameRowIdx = -1

  // Find the year line: "לשנת YYYY" or just YYYY in a header row
  for (let i = 0; i < rows.length; i++) {
    const text = rows[i].join(' ')
    const yearMatch = text.match(/\b(20\d{2})\b/)
    if (yearMatch && text.includes('דירה')) {
      result.year = yearMatch[1]
      yearRowIdx = i
      break
    }
  }
  if (!result.year) {
    // Try just finding any year + apartment row
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].some(c => /^20\d{2}$/.test(c.trim()))) {
        const yMatch = rows[i].find(c => /^20\d{2}$/.test(c.trim()))
        result.year = yMatch
        yearRowIdx = i
        break
      }
    }
  }

  if (yearRowIdx === -1) return null

  // Apartment numbers and names might be in same row as year, or in separate rows
  // Find apt numbers (1-50)
  const aptCells = []
  for (let i = Math.max(0, yearRowIdx - 1); i <= Math.min(rows.length - 1, yearRowIdx + 1); i++) {
    rows[i].forEach((cell, idx) => {
      const m = cell.match(/דירה\s+(\d+)/)
      if (m) {
        aptCells.push({ aptNum: parseInt(m[1]), rowIdx: i, colIdx: idx, x: idx })
      }
    })
  }
  // Sort by apartment number
  aptCells.sort((a, b) => a.aptNum - b.aptNum)

  // Find names line - usually right after year line
  if (yearRowIdx + 1 < rows.length) {
    const nameRow = rows[yearRowIdx]
    // The name row may contain mix of year + names
    // Names are after the year cell
    nameRowIdx = yearRowIdx
  }

  // Build apartment list with names if available
  result.apartments = aptCells.map(apt => ({
    aptNum: apt.aptNum,
    tenantName: ''
  }))

  // Find month rows - any row starting with a Hebrew month name
  const HEBREW_MONTHS_LIST = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ]

  for (const row of rows) {
    const rowText = row.join(' ')
    for (const month of HEBREW_MONTHS_LIST) {
      if (rowText.includes(month)) {
        // Extract numbers from this row (the payments)
        const numbers = row
          .map(c => c.replace(/[₪,\s]/g, ''))
          .filter(c => /^\d+(\.\d+)?$/.test(c))
          .map(c => parseFloat(c))
        result.monthlyPayments[month] = numbers
        break
      }
    }
  }

  return result
}
