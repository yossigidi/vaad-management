import { Banknote, FileText, Building2, Smartphone } from 'lucide-react'

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'מזומן', icon: Banknote, emoji: '💵', color: 'emerald' },
  { id: 'check', label: 'צ׳ק', icon: FileText, emoji: '📝', color: 'blue' },
  { id: 'transfer', label: 'העברה בנקאית', icon: Building2, emoji: '🏦', color: 'purple' },
  { id: 'bit', label: 'ביט', icon: Smartphone, emoji: '📱', color: 'amber' }
]

export const getMethodInfo = (id) => PAYMENT_METHODS.find(m => m.id === id) || PAYMENT_METHODS[0]
