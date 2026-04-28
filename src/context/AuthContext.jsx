import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { auth, db, buildAuthEmail } from '../firebase/config.js'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null) // Firebase auth user
  const [profile, setProfile] = useState(null) // user doc from Firestore
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setUser(fbUser)
        try {
          const snap = await getDoc(doc(db, 'users', fbUser.uid))
          setProfile(snap.exists() ? { id: fbUser.uid, ...snap.data() } : null)
        } catch (err) {
          console.error('Failed to load profile', err)
          setProfile(null)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login = useCallback(async (username, buildingCode, password) => {
    const email = buildAuthEmail(username, buildingCode)
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return cred.user
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    if (!auth.currentUser) throw new Error('Not authenticated')
    const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
    await reauthenticateWithCredential(auth.currentUser, cred)
    await updatePassword(auth.currentUser, newPassword)
    if (profile?.mustChangePassword) {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { mustChangePassword: false })
      setProfile(p => ({ ...p, mustChangePassword: false }))
    }
  }, [profile])

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return
    const snap = await getDoc(doc(db, 'users', auth.currentUser.uid))
    setProfile(snap.exists() ? { id: auth.currentUser.uid, ...snap.data() } : null)
  }, [])

  const value = {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    isTenant: profile?.role === 'tenant',
    buildingId: profile?.buildingId,
    tenantId: profile?.tenantId,
    mustChangePassword: profile?.mustChangePassword,
    login,
    logout,
    changePassword,
    refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// Helper used during signup - creates auth user and Firestore profile
export const createUserAccount = async ({ username, buildingCode, password, role, buildingId, tenantId, apartmentNumber, mustChangePassword = false }) => {
  const email = buildAuthEmail(username, buildingCode)
  const cred = await createUserWithEmailAndPassword(auth, email, password)
  await setDoc(doc(db, 'users', cred.user.uid), {
    username,
    buildingCode,
    buildingId,
    role,
    tenantId: tenantId || null,
    apartmentNumber: apartmentNumber ?? null,
    mustChangePassword,
    createdAt: serverTimestamp()
  })
  return cred.user
}
