// Convert File to data URL (base64)
// Files are stored directly in Firestore documents (Firestore limit: 1MB per doc)
// Effective limit after base64 inflation (~33%): ~750KB

export const MAX_FILE_SIZE = 750 * 1024 // 750 KB
export const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

export const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('שגיאה בקריאת הקובץ'))
    reader.readAsDataURL(file)
  })
}

export const validateFile = (file) => {
  if (!file) return 'לא נבחר קובץ'
  if (file.size > MAX_FILE_SIZE) {
    return `הקובץ גדול מדי (${formatFileSize(file.size)}). מקסימום: ${formatFileSize(MAX_FILE_SIZE)}. השתמש בקישור לקובץ במקום זאת.`
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `סוג קובץ לא נתמך: ${file.type}. אפשר: PDF, תמונות, Word`
  }
  return null
}

export const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const getFileIcon = (type) => {
  if (!type) return '📎'
  if (type.includes('pdf')) return '📄'
  if (type.includes('image')) return '🖼️'
  if (type.includes('word')) return '📝'
  return '📎'
}

export const downloadFile = (dataUrl, fileName) => {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = fileName || 'file'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
