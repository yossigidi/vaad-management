import { useRef, useState } from 'react'
import { Upload, Link2, FileText, Eye, Download, Trash2, X, Plus } from 'lucide-react'
import {
  fileToDataUrl, validateFile, formatFileSize, getFileIcon, downloadFile, MAX_FILE_SIZE
} from '../utils/fileUpload.js'

// attachments: [{ id, name, type: 'file'|'url', mimeType, size, value, uploadedAt }]
// onChange: (newAttachments) => void
export default function AttachmentManager({ attachments = [], onChange, label = 'מסמכים מצורפים' }) {
  const fileRef = useRef()
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const generateId = () => `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setError('')
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      e.target.value = ''
      return
    }

    setUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file)
      const newAttachment = {
        id: generateId(),
        name: file.name,
        type: 'file',
        mimeType: file.type,
        size: file.size,
        value: dataUrl,
        uploadedAt: new Date().toISOString()
      }
      onChange([...attachments, newAttachment])
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleAddLink = (e) => {
    e.preventDefault()
    if (!linkUrl.trim()) return
    const newAttachment = {
      id: generateId(),
      name: linkName.trim() || linkUrl,
      type: 'url',
      value: linkUrl.trim(),
      uploadedAt: new Date().toISOString()
    }
    onChange([...attachments, newAttachment])
    setLinkName('')
    setLinkUrl('')
    setShowLinkForm(false)
  }

  const handleView = (att) => {
    if (att.type === 'file') {
      // Open data URL in new tab
      const win = window.open()
      if (win) {
        win.document.write(`
          <html dir="rtl">
            <head><title>${att.name}</title></head>
            <body style="margin:0">
              ${att.mimeType?.includes('image')
                ? `<img src="${att.value}" style="max-width:100%"/>`
                : `<iframe src="${att.value}" style="border:0;width:100%;height:100vh"></iframe>`
              }
            </body>
          </html>
        `)
      }
    } else {
      window.open(att.value, '_blank', 'noopener,noreferrer')
    }
  }

  const handleDelete = (id) => {
    if (!confirm('למחוק את המסמך?')) return
    onChange(attachments.filter(a => a.id !== id))
  }

  return (
    <div>
      {label && <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>}

      {attachments.length > 0 && (
        <div className="space-y-2 mb-3">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-2 bg-slate-50 rounded-lg p-2 border border-slate-200">
              <span className="text-xl">{att.type === 'url' ? '🔗' : getFileIcon(att.mimeType)}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">{att.name}</div>
                <div className="text-xs text-slate-500">
                  {att.type === 'url' ? 'קישור חיצוני' : formatFileSize(att.size || 0)}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleView(att)}
                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                title="צפה"
              >
                <Eye size={16} />
              </button>
              {att.type === 'file' && (
                <button
                  type="button"
                  onClick={() => downloadFile(att.value, att.name)}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                  title="הורד"
                >
                  <Download size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(att.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                title="מחק"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-2 text-sm mb-2">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-200 hover:border-blue-300 rounded-lg p-2 text-sm font-semibold disabled:opacity-50"
        >
          <Upload size={16} />
          {uploading ? 'מעלה...' : 'העלה קובץ'}
        </button>
        <button
          type="button"
          onClick={() => setShowLinkForm(!showLinkForm)}
          className="flex-1 flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border-2 border-slate-200 rounded-lg p-2 text-sm font-semibold"
        >
          <Link2 size={16} />
          הוסף קישור
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="text-xs text-slate-500 mt-1">
        קבצים עד {formatFileSize(MAX_FILE_SIZE)} (PDF, תמונות, Word). לקבצים גדולים - השתמש בקישור (Google Drive, Dropbox)
      </div>

      {showLinkForm && (
        <form onSubmit={handleAddLink} className="mt-3 bg-slate-50 rounded-lg p-3 space-y-2 border border-slate-200">
          <div>
            <label className="block text-xs text-slate-600 mb-1">שם המסמך</label>
            <input
              type="text"
              value={linkName}
              onChange={e => setLinkName(e.target.value)}
              placeholder="חוזה שכירות חניה 1"
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 mb-1">קישור (Google Drive / Dropbox)</label>
            <input
              type="url"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://drive.google.com/..."
              className="w-full border border-slate-300 rounded px-2 py-1.5 text-sm"
              dir="ltr"
              required
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded px-3 py-1.5 font-semibold">
              <Plus size={14} className="inline ml-1" />
              הוסף
            </button>
            <button type="button" onClick={() => setShowLinkForm(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 text-sm rounded px-3 py-1.5 font-semibold">
              ביטול
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
