import { useState } from 'react'
import { Lock, Shield, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

export default function ChangePassword({ forced = false }) {
  const { changePassword, logout } = useAuth()
  const [form, setForm] = useState({ current: forced ? '123456' : '', newPwd: '', confirm: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.newPwd.length < 6) {
      setError('סיסמה חדשה חייבת להכיל לפחות 6 תווים')
      return
    }
    if (form.newPwd !== form.confirm) {
      setError('הסיסמאות לא תואמות')
      return
    }
    if (form.newPwd === form.current) {
      setError('הסיסמה החדשה זהה לישנה')
      return
    }
    setSubmitting(true)
    try {
      await changePassword(form.current, form.newPwd)
      setSuccess(true)
    } catch (err) {
      console.error(err)
      let msg = err.message || 'שגיאה בשינוי סיסמה'
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        msg = 'הסיסמה הנוכחית שגויה'
      }
      if (err.code === 'auth/weak-password') msg = 'הסיסמה חלשה מדי'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={32} className="text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">הסיסמה שונתה בהצלחה!</h2>
          <p className="text-slate-500 mb-4">הסיסמה החדשה תקפה מעכשיו</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg"
          >
            המשך למערכת
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white p-6">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={24} />
            <h1 className="text-xl font-bold">{forced ? 'נא לקבוע סיסמה חדשה' : 'שינוי סיסמה'}</h1>
          </div>
          {forced && (
            <p className="text-blue-100 text-sm">
              זוהי הכניסה הראשונה שלך - אנא קבע סיסמה אישית במקום הסיסמה הראשונית.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!forced && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <Lock size={14} className="inline ml-1" />
                סיסמה נוכחית
              </label>
              <input
                type="password"
                value={form.current}
                onChange={e => setForm({ ...form, current: e.target.value })}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
                dir="ltr"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Lock size={14} className="inline ml-1" />
              סיסמה חדשה (לפחות 6 תווים)
            </label>
            <input
              type="password"
              value={form.newPwd}
              onChange={e => setForm({ ...form, newPwd: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
              dir="ltr"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">אישור סיסמה חדשה</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm({ ...form, confirm: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
              dir="ltr"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {submitting ? 'משנה...' : 'שמור סיסמה חדשה'}
          </button>

          {forced && (
            <button
              type="button"
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-red-600 text-sm py-2"
            >
              <LogOut size={14} />
              התנתק
            </button>
          )}
        </form>
      </div>
    </div>
  )
}
