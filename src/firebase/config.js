import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyCsxOCZieE_JB3-ddoTYNbPOwZPsIzUfIQ',
  authDomain: 'vaad-management-2026.firebaseapp.com',
  projectId: 'vaad-management-2026',
  storageBucket: 'vaad-management-2026.firebasestorage.app',
  messagingSenderId: '884567791541',
  appId: '1:884567791541:web:3ad1636a6463fb2152abfc'
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Synthetic email domain - users only see usernames
export const AUTH_DOMAIN = 'vaad.app'

// Generate building code from address (uppercase, no spaces, max 8 chars)
export const buildBuildingCode = (text) => {
  if (!text) return ''
  // Hebrew + English: take first letters of each word + numbers
  const cleaned = text.replace(/[^\w֐-׿\d]/g, '')
  return cleaned.slice(0, 12).toLowerCase()
}

// username + buildingCode → synthetic email for Firebase Auth
export const buildAuthEmail = (username, buildingCode) => {
  const u = username.toLowerCase().replace(/[^a-z0-9-]/g, '')
  const b = buildingCode.toLowerCase().replace(/[^a-z0-9]/g, '')
  return `${u}.${b}@${AUTH_DOMAIN}`
}

// Tenant username from apartment number
export const tenantUsername = (apartmentNumber) => `apt-${apartmentNumber}`
