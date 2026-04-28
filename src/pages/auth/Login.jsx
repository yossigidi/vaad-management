import { useState } from 'react'
import { Building2, User, Lock, Home, LogIn } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

export default function Login({ onSignup }) {
  const { login } = useAuth()
  const [form, setForm] = useState({ buildingCode: '', username: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.buildingCode || !form.username || !form.password) {
      setError('נא למלא את כל השדות')
      return
    }
    setSubmitting(true)
    try {
      await login(form.username.trim(), form.buildingCode.trim().toLowerCase(), form.password)
    } catch (err) {
      console.error(err)
      let msg = 'שם משתמש או סיסמה שגויים'
      if (err.code === 'auth/invalid-credential') msg = 'שם משתמש או סיסמה שגויים'
      if (err.code === 'auth/too-many-requests') msg = 'יותר מדי ניסיונות, נסה שוב מאוחר יותר'
      if (err.code === 'auth/network-request-failed') msg = 'שגיאת רשת'
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="bg-gradient-to-l from-blue-600 to-blue-700 text-white p-8 text-center">
          <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-1">ניהול ועד בית</h1>
          <p className="text-blue-100 text-sm">התחברות לחשבון</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Home size={14} className="inline ml-1" />
              קוד בניין
            </label>
            <input
              type="text"
              value={form.buildingCode}
              onChange={e => setForm({ ...form, buildingCode: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '') })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5 font-mono"
              placeholder="david45"
              dir="ltr"
              autoComplete="organization"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <User size={14} className="inline ml-1" />
              שם משתמש
            </label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm({ ...form, username: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
              placeholder="apt-1 / yossi"
              dir="ltr"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              <Lock size={14} className="inline ml-1" />
              סיסמה
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full border border-slate-300 rounded-lg px-3 py-2.5"
              dir="ltr"
              autoComplete="current-password"
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            <LogIn size={18} />
            {submitting ? 'מתחבר...' : 'התחבר'}
          </button>

          <div className="text-center pt-2 border-t border-slate-100">
            <p className="text-sm text-slate-500 mb-2">אדמין של בניין חדש?</p>
            <button
              type="button"
              onClick={onSignup}
              className="text-blue-600 hover:underline font-semibold"
            >
              צור ועד בית חדש →
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
