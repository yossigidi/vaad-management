import { useState } from 'react'
import { X } from 'lucide-react'
import { PAYMENT_METHODS } from '../utils/paymentMethods.js'
import { formatCurrency } from '../utils/format.js'

const colorMap = {
  emerald: 'border-emerald-500 bg-emerald-50 text-emerald-700',
  blue: 'border-blue-500 bg-blue-50 text-blue-700',
  purple: 'border-purple-500 bg-purple-50 text-purple-700',
  amber: 'border-amber-500 bg-amber-50 text-amber-700'
}

// Reusable payment method selection dialog
// Used by both vaad payments and additional income receipts
export default function PaymentMethodDialog({
  title = 'איך שילם?',
  subtitle,
  amount,
  onConfirm, // (method, paidDate, note) => void
  onClose
}) {
  const [method, setMethod] = useState('cash')
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [showNote, setShowNote] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            <X size={20} />
          </button>
        </div>
        {subtitle && (
          <p className="text-sm text-slate-500 mb-4">
            {subtitle}
            {amount !== undefined && <> · <strong>{formatCurrency(amount)}</strong></>}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          {PAYMENT_METHODS.map(m => {
            const isActive = method === m.id
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMethod(m.id)}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 ${isActive ? colorMap[m.color] : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
              >
                <div className="text-2xl">{m.emoji}</div>
                <div className="font-semibold text-sm">{m.label}</div>
              </button>
            )
          })}
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-slate-700 mb-1">תאריך התשלום</label>
          <input
            type="date"
            value={paidDate}
            onChange={e => setPaidDate(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2"
          />
        </div>

        {showNote ? (
          <div className="mb-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              הערה (למשל: מספר צ׳ק)
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              placeholder={method === 'check' ? 'מספר צ׳ק...' : ''}
              autoFocus
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="text-sm text-blue-600 hover:underline mb-3"
          >
            + הוסף הערה
          </button>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onConfirm(method, paidDate, note)}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-semibold"
          >
            ✓ סמן כשולם
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg font-semibold"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  )
}
