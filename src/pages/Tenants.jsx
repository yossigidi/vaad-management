import { useState } from 'react'
import { Phone, Mail, Edit2, Trash2, Plus, X, Check, Home, MessageCircle } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'

export default function Tenants() {
  const { tenants, updateTenant, addTenant, deleteTenant } = useData()
  const [editingId, setEditingId] = useState(null)
  const [draft, setDraft] = useState({})

  const startEdit = (tenant) => {
    setEditingId(tenant.id)
    setDraft({ ...tenant })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setDraft({})
  }

  const saveEdit = () => {
    updateTenant(editingId, draft)
    cancelEdit()
  }

  const handleDelete = (tenant) => {
    if (confirm(`למחוק את ${tenant.name}? כל היסטוריית התשלומים שלו תימחק.`)) {
      deleteTenant(tenant.id)
    }
  }

  const sortedTenants = [...tenants].sort((a, b) => a.apartmentNumber - b.apartmentNumber)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-1">דיירים</h1>
          <p className="text-slate-500">{tenants.length} דירות בבניין</p>
        </div>
        <button
          onClick={addTenant}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold shadow-sm transition-colors"
        >
          <Plus size={18} />
          הוסף דייר
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedTenants.map(tenant => {
          const isEditing = editingId === tenant.id
          return (
            <div
              key={tenant.id}
              className={`
                bg-white rounded-2xl p-5 shadow-sm border transition-all
                ${tenant.active ? 'border-slate-100' : 'border-slate-200 opacity-60'}
                ${isEditing ? 'ring-2 ring-blue-500 border-blue-300' : ''}
              `}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${tenant.active ? 'bg-blue-50' : 'bg-slate-100'}`}>
                    <Home size={20} className={tenant.active ? 'text-blue-600' : 'text-slate-400'} />
                  </div>
                  <div>
                    {isEditing ? (
                      <input
                        type="number"
                        value={draft.apartmentNumber}
                        onChange={e => setDraft({ ...draft, apartmentNumber: parseInt(e.target.value) || 0 })}
                        className="w-16 text-lg font-bold border border-slate-300 rounded px-2 py-1"
                      />
                    ) : (
                      <div className="text-lg font-bold text-slate-900">דירה {tenant.apartmentNumber}</div>
                    )}
                  </div>
                </div>
                {!isEditing && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(tenant)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="ערוך"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(tenant)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="מחק"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">שם דייר</label>
                    <input
                      type="text"
                      value={draft.name || ''}
                      onChange={e => setDraft({ ...draft, name: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                      placeholder="שם דייר"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">טלפון</label>
                    <input
                      type="tel"
                      value={draft.phone || ''}
                      onChange={e => setDraft({ ...draft, phone: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                      placeholder="050-1234567"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">אימייל</label>
                    <input
                      type="email"
                      value={draft.email || ''}
                      onChange={e => setDraft({ ...draft, email: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2"
                      placeholder="email@example.com"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">הערות</label>
                    <textarea
                      value={draft.notes || ''}
                      onChange={e => setDraft({ ...draft, notes: e.target.value })}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                      rows={2}
                      placeholder="הערות..."
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.active !== false}
                      onChange={e => setDraft({ ...draft, active: e.target.checked })}
                      className="rounded"
                    />
                    דייר פעיל
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={saveEdit}
                      className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-semibold transition-colors"
                    >
                      <Check size={16} />
                      שמור
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-semibold transition-colors"
                    >
                      <X size={16} />
                      בטל
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="font-semibold text-slate-900 truncate">
                    {tenant.name || <span className="text-slate-400">ללא שם</span>}
                  </div>
                  {tenant.phone ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Phone size={14} className="text-slate-400 flex-shrink-0" />
                      <a href={`tel:${tenant.phone}`} className="hover:text-blue-600 truncate" dir="ltr">
                        {tenant.phone}
                      </a>
                      <a
                        href={`https://wa.me/972${tenant.phone.replace(/\D/g, '').replace(/^0/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-emerald-500 hover:text-emerald-700 mr-auto"
                        title="WhatsApp"
                      >
                        <MessageCircle size={14} />
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Phone size={14} />
                      <span>אין טלפון</span>
                    </div>
                  )}
                  {tenant.email ? (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Mail size={14} className="text-slate-400 flex-shrink-0" />
                      <a href={`mailto:${tenant.email}`} className="hover:text-blue-600 truncate" dir="ltr">
                        {tenant.email}
                      </a>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-slate-300">
                      <Mail size={14} />
                      <span>אין אימייל</span>
                    </div>
                  )}
                  {tenant.notes && (
                    <div className="text-xs text-slate-500 bg-slate-50 rounded p-2 mt-2">
                      {tenant.notes}
                    </div>
                  )}
                  {!tenant.active && (
                    <div className="text-xs text-amber-600 font-semibold bg-amber-50 rounded px-2 py-1 inline-block">
                      לא פעיל
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
