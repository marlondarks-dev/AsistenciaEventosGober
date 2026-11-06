"use client"

import { useState, useMemo, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Printer, 
  Edit3, 
  Trash2, 
  Search, 
  X, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  User, 
  Camera, 
  Save, 
  Phone, 
  MapPin, 
  UploadCloud,
  Filter,
  RotateCw,
  Eye,
  FileText,
  Download,
  ExternalLink,
  Paperclip,
  CheckCircle2,
  AlertTriangle,
  Utensils,
  Calendar,
  Plus
} from 'lucide-react'

const MUNICIPIOS_NDS = [
  'Ábrego', 'Arboledas', 'Bochalema', 'Bucarasica', 'Cáchira', 'Cácota', 'Chinácota', 'Chitagá', 'Convención', 'Cúcuta',
  'Cucutilla', 'Durania', 'El Carmen', 'El Tarra', 'El Zulia', 'Gramalote', 'Hacarí', 'Herrán', 'La Esperanza', 'La Playa de Belén',
  'Labateca', 'Los Patios', 'Lourdes', 'Mutiscua', 'Ocaña', 'Pamplona', 'Pamplonita', 'Puerto Santander', 'Ragonvalia', 'Salazar de Las Palmas',
  'San Calixto', 'San Cayetano', 'Santiago', 'Sardinata', 'Silos', 'Teorama', 'Tibú', 'Toledo', 'Villa Caro', 'Villa del Rosario'
]

export interface AttachedDoc {
  id: string
  label: string
  url: string | null
  isConsent: boolean
  type: string
}

export const getMealIconHelper = (mealName: string): string => {
  if (!mealName) return '📍'
  const lower = mealName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  if (lower.includes('desayuno')) return '☕'
  if (lower.includes('almuerzo')) return '🍽️'
  if (lower.includes('cena')) return '🍲'
  if (lower.includes('refrigerio')) return '🍪'
  if (lower.includes('kit') || lower.includes('bienvenida')) return '🎒'
  if (lower.includes('ingreso') || lower.includes('puerta')) return '🚪'
  return '📍'
}

export default function RegistrationsTable({ 
  eventId, 
  initialRegistrations,
  eventRequiredFields = "{}"
}: { 
  eventId: string, 
  initialRegistrations: any[],
  eventRequiredFields?: string
}) {
  const router = useRouter()
  const [registrations, setRegistrations] = useState(initialRegistrations)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ASISTIO' | 'REGISTRADO' | 'CANCELADO'>('ALL')
  const [kitFilter, setKitFilter] = useState<'ALL' | 'WITH_KIT' | 'WITHOUT_KIT'>('ALL')
  const [checkpointFilter, setCheckpointFilter] = useState<{ name: string; status: 'ALL' | 'DELIVERED' | 'PENDING' }>({ name: 'ALL', status: 'ALL' })
  
  // Modals state
  const [viewingReg, setViewingReg] = useState<any | null>(null)
  const [editingReg, setEditingReg] = useState<any | null>(null)
  const [deletingReg, setDeletingReg] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Modals for Checkpoints / Refrigerios
  const [managingCheckpointsReg, setManagingCheckpointsReg] = useState<any | null>(null)
  const [markingModal, setMarkingModal] = useState<{
    reg: any
    checkpointName: string
    dateTimeValue: string
    attendedBy: string
    isEdit: boolean
    checkpointIndex?: number
  } | null>(null)
  const [customCheckpointInput, setCustomCheckpointInput] = useState('')

  // Parse checkpoints & daily schedule from event
  const { eventCheckpoints, eventDailySchedule, eventDaysList } = useMemo(() => {
    try {
      const parsed = eventRequiredFields ? JSON.parse(eventRequiredFields) : {}
      const cps: string[] = Array.isArray(parsed.checkpoints) && parsed.checkpoints.length > 0 
        ? parsed.checkpoints 
        : ['Ingreso', 'Kit de Bienvenida']
      
      const dailySched = parsed.dailySchedule || null
      
      // If dailySchedule exists with days
      if (dailySched?.days && Array.isArray(dailySched.days) && dailySched.days.length > 0) {
        return {
          eventCheckpoints: cps,
          eventDailySchedule: dailySched,
          eventDaysList: dailySched.days.map((d: any) => ({
            day: d.day,
            meals: Array.isArray(d.meals) ? d.meals : []
          }))
        }
      }

      // Fallback: parse days and meals from flat checkpoint names with " - "
      const dayMap: Record<string, string[]> = {}
      const general: string[] = []

      cps.forEach((cp: string) => {
        if (cp.includes(' - ')) {
          const [dPart, ...mPart] = cp.split(' - ')
          const dayName = dPart.trim()
          const mealName = mPart.join(' - ').trim()
          if (!dayMap[dayName]) dayMap[dayName] = []
          if (!dayMap[dayName].includes(mealName)) dayMap[dayName].push(mealName)
        } else {
          if (!general.includes(cp)) general.push(cp)
        }
      })

      const daysList = Object.entries(dayMap).map(([day, meals]) => ({ day, meals }))
      return {
        eventCheckpoints: cps,
        eventDailySchedule: { generalPoints: general, days: daysList },
        eventDaysList: daysList
      }
    } catch {
      return {
        eventCheckpoints: ['Ingreso', 'Kit de Bienvenida'],
        eventDailySchedule: null,
        eventDaysList: []
      }
    }
  }, [eventRequiredFields])
  
  // Upload states inside modal
  const [uploadingModalPhoto, setUploadingModalPhoto] = useState(false)
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null)
  const fileInputModalRef = useRef<HTMLInputElement>(null)

  // Parse custom questions from event
  const customQuestions = useMemo(() => {
    try {
      const parsed = eventRequiredFields ? JSON.parse(eventRequiredFields) : {}
      return Array.isArray(parsed.customQuestions) ? parsed.customQuestions : []
    } catch (e) {
      return []
    }
  }, [eventRequiredFields])

  // Helper to extract all attached documents & consent from a registration
  const getParticipantDocs = (reg: any): AttachedDoc[] => {
    let addData: Record<string, any> = {}
    try {
      addData = JSON.parse(reg.person?.additionalData || '{}')
    } catch (e) {}

    const docs: AttachedDoc[] = []
    const processedKeys = new Set<string>()

    // 1. Check known custom questions (especially type file/pdf/image or labels mentioning consentimiento/autorizacion)
    customQuestions.forEach((q: any) => {
      const isFileQuestion = q.type === 'file' || q.type === 'pdf' || q.type === 'image'
      const labelLower = (q.label || '').toLowerCase()
      const isConsentKeyword = labelLower.includes('consentimiento') || labelLower.includes('autoriza') || labelLower.includes('compromiso')

      if (isFileQuestion || isConsentKeyword) {
        processedKeys.add(q.id)
        const val = addData[q.id]
        docs.push({
          id: q.id,
          label: q.label || 'Documento Adjunto',
          url: typeof val === 'string' && val.trim() ? val.trim() : null,
          isConsent: isConsentKeyword,
          type: q.type || 'file'
        })
      }
    })

    // 2. Scan for any other uploaded files/urls in additionalData (excluding face photos)
    Object.entries(addData).forEach(([key, val]) => {
      if (processedKeys.has(key)) return
      if (key === 'foto' || key === 'fotoIngreso') return

      if (typeof val === 'string' && val.trim()) {
        const valTrimmed = val.trim()
        const isUrl = valTrimmed.startsWith('/') || valTrimmed.startsWith('http') || /\.(pdf|png|jpe?g|webp|docx?)$/i.test(valTrimmed)
        const keyLower = key.toLowerCase()
        const isConsent = keyLower.includes('consentimiento') || keyLower.includes('autoriza') || keyLower.includes('compromiso')

        if (isUrl || isConsent) {
          let label = key
          if (key === 'consentimiento') label = 'Consentimiento Informado'
          else if (key === 'autorizacion') label = 'Autorización'
          else if (key === 'compromiso') label = 'Compromiso de Convivencia'
          else {
            const q = customQuestions.find((item: any) => item.id === key)
            if (q && q.label) label = q.label
          }

          docs.push({
            id: key,
            label,
            url: isUrl ? valTrimmed : null,
            isConsent,
            type: 'file'
          })
        }
      }
    })

    return docs
  }

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  // Real-time auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>('')

  // Live polling fetch function
  const fetchLiveRegistrations = async (isBackground = true) => {
    if (!isBackground) setIsRefreshing(true)
    try {
      const res = await fetch(`/api/events/${eventId}/registrations`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.registrations && Array.isArray(data.registrations)) {
        // Do not overwrite list if admin is actively modifying a registration in the modal
        setRegistrations(prev => {
          if (editingReg || deletingReg) return prev
          return data.registrations
        })

        // Also update managingCheckpointsReg if it is currently open
        setManagingCheckpointsReg((prev: any) => {
          if (!prev) return null
          const fresh = data.registrations.find((r: any) => r.id === prev.id)
          return fresh || prev
        })

        // Also update viewingReg if it is currently open
        setViewingReg((prev: any) => {
          if (!prev) return null
          const fresh = data.registrations.find((r: any) => r.id === prev.id)
          return fresh || prev
        })

        const now = new Date()
        setLastSyncTime(now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))

        // Broadcast to metric cards
        if (typeof window !== 'undefined' && data.stats) {
          window.dispatchEvent(new CustomEvent('registrations-live-sync', { detail: data.stats }))
        }
      }
    } catch (e) {
      console.error('Error fetching live registrations:', e)
    } finally {
      if (!isBackground) setIsRefreshing(false)
    }
  }

  // Polling interval every 3.5 seconds
  useEffect(() => {
    const now = new Date()
    setLastSyncTime(now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))

    if (!autoRefresh) return
    const interval = setInterval(() => {
      if (!editingReg && !deletingReg) {
        fetchLiveRegistrations(true)
      }
    }, 3500)
    return () => clearInterval(interval)
  }, [eventId, autoRefresh, editingReg, deletingReg])

  // Helper to detect if a checkpoint is for Kit
  const isKitName = (name: string): boolean => {
    if (!name) return false
    const lower = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    return lower.includes('kit') || lower.includes('bienvenida')
  }

  // Helper to extract kit scan
  const getKitScan = (reg: any) => {
    if (!reg?.checkpoints) return null
    try {
      const cps = typeof reg.checkpoints === 'string' ? JSON.parse(reg.checkpoints) : reg.checkpoints
      if (!Array.isArray(cps)) return null
      return cps.find((c: any) => isKitName(c?.name)) || null
    } catch {
      return null
    }
  }

  const hasKit = (reg: any): boolean => !!getKitScan(reg)

  // Listen for external filter requests from Metric Cards & refresh signals
  useEffect(() => {
    const handleFilterEvent = (e: any) => {
      if (e.detail && e.detail.name) {
        setCheckpointFilter({
          name: e.detail.name,
          status: e.detail.status || 'ALL'
        })
        if (e.detail.status === 'DELIVERED') {
          setStatusFilter('ASISTIO')
        }
      }
    }
    const handleRefreshedEvent = () => {
      fetchLiveRegistrations(false)
    }

    window.addEventListener('filter-by-checkpoint', handleFilterEvent)
    window.addEventListener('registrations-refreshed', handleRefreshedEvent)
    return () => {
      window.removeEventListener('filter-by-checkpoint', handleFilterEvent)
      window.removeEventListener('registrations-refreshed', handleRefreshedEvent)
    }
  }, [])

  // Filter registrations
  const filtered = useMemo(() => {
    return registrations.filter(r => {
      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false
      }

      // Kit filter
      if (kitFilter === 'WITH_KIT' && !hasKit(r)) {
        return false
      }
      if (kitFilter === 'WITHOUT_KIT' && (hasKit(r) || r.status === 'CANCELADO')) {
        return false
      }

      // Checkpoint / Entrega filter
      if (checkpointFilter.name !== 'ALL') {
        let cps: any[] = []
        try {
          cps = typeof r.checkpoints === 'string' ? JSON.parse(r.checkpoints || '[]') : (r.checkpoints || [])
          if (!Array.isArray(cps)) cps = []
        } catch {
          cps = []
        }

        const isKitTarget = isKitName(checkpointFilter.name)
        const hasThisCp = cps.some((c: any) => {
          if (!c || !c.name) return false
          if (isKitTarget && isKitName(c.name)) return true
          return c.name === checkpointFilter.name
        })

        if (checkpointFilter.status === 'DELIVERED' && !hasThisCp) {
          return false
        }
        if (checkpointFilter.status === 'PENDING' && (hasThisCp || r.status === 'CANCELADO')) {
          return false
        }
      }

      // Search query
      if (!search.trim()) return true
      const q = search.toLowerCase().trim()
      const p = r.person || {}
      
      const fullName = `${p.firstName || ''} ${p.middleName || ''} ${p.lastName || ''} ${p.secondLastName || ''}`.toLowerCase()
      const doc = `${p.documentNumber || ''}`.toLowerCase()
      const mun = `${p.municipality || ''}`.toLowerCase()

      return fullName.includes(q) || doc.includes(q) || mun.includes(q)
    })
  }, [registrations, search, statusFilter, kitFilter, checkpointFilter])

  // Count stats
  const totalCount = registrations.length
  const attendedCount = registrations.filter(r => r.status === 'ASISTIO').length
  const registeredCount = registrations.filter(r => r.status === 'REGISTRADO').length
  const cancelledCount = registrations.filter(r => r.status === 'CANCELADO').length
  const kitDeliveredCount = registrations.filter(r => hasKit(r)).length
  const kitPendingCount = registrations.filter(r => !hasKit(r) && r.status !== 'CANCELADO').length

  // Helper to format ISO or Date to datetime-local value (YYYY-MM-DDTHH:mm) in Colombia timezone
  const toDatetimeLocalValue = (dateInput?: Date | string | null): string => {
    const d = dateInput ? new Date(dateInput) : new Date()
    if (isNaN(d.getTime())) return ''
    
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(d)

    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '00'
    const year = getPart('year')
    const month = getPart('month')
    const day = getPart('day')
    let hour = getPart('hour')
    if (hour === '24') hour = '00'
    const minute = getPart('minute')

    return `${year}-${month}-${day}T${hour}:${minute}`
  }

  // Suggest intelligent default datetime based on checkpoint name
  const getDefaultDateTimeForCheckpoint = (cpName: string): string => {
    const lower = cpName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    
    // Default time based on meal type
    let defaultHour = "10:30"
    if (lower.includes('desayuno')) defaultHour = "08:00"
    else if (lower.includes('almuerzo')) defaultHour = "12:45"
    else if (lower.includes('tarde')) defaultHour = "16:00"
    else if (lower.includes('cena')) defaultHour = "19:30"
    else if (lower.includes('ingreso')) defaultHour = "07:30"
    else if (lower.includes('kit') || lower.includes('bienvenida')) defaultHour = "08:30"

    // Default year and month (2026-10 for Juventudes Festival or current year-month)
    let year = "2026"
    let month = "10"
    
    // Check if cpName contains a day number e.g. "22", "23", "24", "25"
    const matchDay = cpName.match(/\b(2[0-9]|1[0-9]|[1-9])\b/)
    if (matchDay) {
      const dayNum = matchDay[1].padStart(2, '0')
      return `${year}-${month}-${dayNum}T${defaultHour}`
    }

    // Fallback: today's date in Colombia
    const nowLocal = toDatetimeLocalValue(new Date())
    const todayDate = nowLocal.split('T')[0]
    return `${todayDate}T${defaultHour}`
  }

  // Helper to extract checkpoint counts for a participant
  const getParticipantCheckpointStats = (reg: any) => {
    let cps: any[] = []
    try {
      cps = typeof reg.checkpoints === 'string' ? JSON.parse(reg.checkpoints || '[]') : (reg.checkpoints || [])
      if (!Array.isArray(cps)) cps = []
    } catch {
      cps = []
    }

    const totalConfigured = eventCheckpoints.length
    const deliveredCount = cps.length
    return {
      deliveredCount,
      totalConfigured,
      cps
    }
  }

  // Open modal to mark a new checkpoint with date/time picker
  const handleOpenMarkCheckpoint = (reg: any, checkpointName: string) => {
    const defaultDateTime = getDefaultDateTimeForCheckpoint(checkpointName)
    setMarkingModal({
      reg,
      checkpointName,
      dateTimeValue: defaultDateTime,
      attendedBy: 'Administrador (Panel)',
      isEdit: false
    })
  }

  // Open modal to edit existing checkpoint date/time
  const handleOpenEditCheckpointDateTime = (reg: any, checkpointIndex: number) => {
    let cps: any[] = []
    try {
      cps = typeof reg.checkpoints === 'string' ? JSON.parse(reg.checkpoints || '[]') : (reg.checkpoints || [])
    } catch {
      cps = []
    }
    const cp = cps[checkpointIndex]
    if (!cp) return

    setMarkingModal({
      reg,
      checkpointName: cp.name,
      dateTimeValue: toDatetimeLocalValue(cp.timestamp),
      attendedBy: cp.attendedBy || 'Administrador (Panel)',
      isEdit: true,
      checkpointIndex
    })
  }

  // Save or update checkpoint with chosen date and time
  const handleSaveCheckpointDateTime = async () => {
    if (!markingModal) return
    const { reg, checkpointName, dateTimeValue, attendedBy, isEdit, checkpointIndex } = markingModal

    if (!dateTimeValue) {
      showToast('error', 'Por favor selecciona la fecha y hora de la entrega.')
      return
    }

    const chosenDate = new Date(dateTimeValue)
    if (isNaN(chosenDate.getTime())) {
      showToast('error', 'Fecha u hora no válida.')
      return
    }

    const timestampISO = chosenDate.toISOString()
    const horaColombia = chosenDate.toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })

    let cps: any[] = []
    try {
      cps = typeof reg.checkpoints === 'string' ? JSON.parse(reg.checkpoints || '[]') : (reg.checkpoints || [])
      if (!Array.isArray(cps)) cps = []
    } catch {
      cps = []
    }

    if (isEdit && checkpointIndex !== undefined && checkpointIndex >= 0 && checkpointIndex < cps.length) {
      // Editing existing checkpoint timestamp
      cps[checkpointIndex] = {
        ...cps[checkpointIndex],
        timestamp: timestampISO,
        horaColombia,
        attendedBy: attendedBy.trim() || 'Administrador (Panel)'
      }
    } else {
      // Adding new checkpoint - check duplicates
      if (isKitName(checkpointName) && cps.some((c: any) => isKitName(c.name))) {
        showToast('error', 'Este participante ya tiene el kit registrado.')
        return
      }

      if (cps.some((c: any) => c.name === checkpointName)) {
        showToast('error', `Este participante ya tiene registrado "${checkpointName}".`)
        return
      }

      cps.push({
        name: checkpointName,
        timestamp: timestampISO,
        horaColombia,
        attendedBy: attendedBy.trim() || 'Administrador (Panel)',
        evidenceUrl: null
      })
    }

    const newStatus = reg.status === 'REGISTRADO' ? 'ASISTIO' : reg.status
    const payload: any = {
      checkpoints: JSON.stringify(cps),
      status: newStatus
    }

    try {
      const res = await fetch(`/api/registrations/${reg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Error al guardar la entrega del refrigerio/punto')
      const data = await res.json()
      const savedReg = data.registration || {
        ...reg,
        checkpoints: JSON.stringify(cps),
        status: newStatus,
        attendedAt: reg.attendedAt || timestampISO
      }

      setRegistrations(prev => prev.map(r => r.id === reg.id ? savedReg : r))
      
      if (viewingReg && viewingReg.id === reg.id) {
        setViewingReg(savedReg)
      }
      if (managingCheckpointsReg && managingCheckpointsReg.id === reg.id) {
        setManagingCheckpointsReg(savedReg)
      }

      setMarkingModal(null)
      showToast('success', isEdit ? 'Fecha y hora de entrega actualizada correctamente.' : `¡"${checkpointName}" marcado como entregado!`)
      router.refresh()
      fetchLiveRegistrations(false)
    } catch (err: any) {
      showToast('error', err.message || 'Error al actualizar el registro')
    }
  }

  // Toggle kit delivery or remove kit checkpoint
  const handleToggleKit = async (reg: any, deliver: boolean) => {
    if (deliver) {
      let cps: any[] = []
      try {
        cps = typeof reg.checkpoints === 'string' ? JSON.parse(reg.checkpoints || '[]') : (reg.checkpoints || [])
        if (!Array.isArray(cps)) cps = []
      } catch {
        cps = []
      }

      if (cps.some((c: any) => isKitName(c.name))) {
        showToast('error', 'Este participante ya tiene el kit registrado.')
        return
      }

      // Open date/time modal so user can adjust or confirm date
      handleOpenMarkCheckpoint(reg, 'Kit de Bienvenida')
      return
    }

    // Desmarcar / Remover Kit
    const pName = `${reg.person?.firstName || ''} ${reg.person?.lastName || ''}`.trim()
    if (!confirm(`¿Desea desmarcar o retirar el Kit de Bienvenida para "${pName}"?`)) {
      return
    }

    let cps: any[] = []
    try {
      cps = typeof reg.checkpoints === 'string' ? JSON.parse(reg.checkpoints || '[]') : (reg.checkpoints || [])
      if (!Array.isArray(cps)) cps = []
    } catch {
      cps = []
    }

    cps = cps.filter((c: any) => !isKitName(c.name))

    try {
      const res = await fetch(`/api/registrations/${reg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpoints: JSON.stringify(cps) })
      })

      if (!res.ok) throw new Error('Error al desmarcar el kit')

      const data = await res.json()
      const savedReg = data.registration || { ...reg, checkpoints: JSON.stringify(cps) }
      setRegistrations(prev => prev.map(r => r.id === reg.id ? savedReg : r))
      if (viewingReg && viewingReg.id === reg.id) {
        setViewingReg(savedReg)
      }
      if (managingCheckpointsReg && managingCheckpointsReg.id === reg.id) {
        setManagingCheckpointsReg(savedReg)
      }
      showToast('success', 'Kit de Bienvenida desmarcado exitosamente.')
      router.refresh()
      fetchLiveRegistrations(false)
    } catch (err: any) {
      showToast('error', err.message || 'Error al actualizar el kit')
    }
  }

  // Remove individual checkpoint (e.g. duplicate meal or kit)
  const handleRemoveCheckpoint = async (regId: string, indexToRemove: number) => {
    const reg = registrations.find(r => r.id === regId)
    if (!reg) return

    let cps: any[] = []
    try {
      cps = typeof reg.checkpoints === 'string' ? JSON.parse(reg.checkpoints || '[]') : (reg.checkpoints || [])
      if (!Array.isArray(cps)) cps = []
    } catch {
      cps = []
    }

    const target = cps[indexToRemove]
    if (!confirm(`¿Eliminar o desmarcar la entrega de "${target?.name || 'este punto'}"? Esta acción no se puede deshacer.`)) {
      return
    }

    const updatedCps = cps.filter((_, idx) => idx !== indexToRemove)

    try {
      const res = await fetch(`/api/registrations/${regId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checkpoints: JSON.stringify(updatedCps) })
      })

      if (!res.ok) throw new Error('Error al eliminar entrega')

      const data = await res.json()
      const savedReg = data.registration || { ...reg, checkpoints: JSON.stringify(updatedCps) }
      setRegistrations(prev => prev.map(r => r.id === regId ? savedReg : r))
      if (viewingReg && viewingReg.id === regId) {
        setViewingReg(savedReg)
      }
      if (managingCheckpointsReg && managingCheckpointsReg.id === regId) {
        setManagingCheckpointsReg(savedReg)
      }
      showToast('success', 'Entrega desmarcada correctamente.')
      router.refresh()
      fetchLiveRegistrations(false)
    } catch (err: any) {
      showToast('error', err.message || 'Error al eliminar entrega')
    }
  }

  // Open Edit Modal with prepared state
  const handleOpenEdit = (reg: any) => {
    let addData: any = {}
    try {
      addData = JSON.parse(reg.person.additionalData || '{}')
    } catch (e) {}

    let photoUrl = addData.fotoIngreso || addData.foto || null
    if (!photoUrl && reg.checkpoints) {
      try {
        const cps = JSON.parse(reg.checkpoints)
        const cp = cps.find((c: any) => c.name === 'Ingreso' && c.evidenceUrl)
        if (cp) photoUrl = cp.evidenceUrl
      } catch (e) {}
    }

    const docs = getParticipantDocs(reg)

    setEditingReg({
      id: reg.id,
      status: reg.status,
      firstName: reg.person.firstName || '',
      middleName: reg.person.middleName || '',
      lastName: reg.person.lastName || '',
      secondLastName: reg.person.secondLastName || '',
      documentType: reg.person.documentType || 'CC',
      documentNumber: reg.person.documentNumber || '',
      municipality: reg.person.municipality || '',
      birthDate: reg.person.birthDate ? new Date(reg.person.birthDate).toISOString().split('T')[0] : '',
      sex: reg.person.sex || '',
      gender: reg.person.gender || '',
      specialCondition: reg.person.specialCondition === 'INDIGENTE' ? 'HABITANTE_DE_CALLE' : (reg.person.specialCondition || ''),
      eps: addData.eps || '',
      contactoEmergencia: addData.contactoEmergencia || '',
      alergiasMedicas: addData.alergiasMedicas || '',
      grupoJuvenil: addData.grupoJuvenil || '',
      discapacidad: addData.discapacidad || '',
      grupoEtnico: addData.grupoEtnico || '',
      victima: addData.victima || '',
      fotoIngreso: photoUrl,
      docs,
      customAnswers: addData
    })
  }

  // Upload or replace attached document inside edit modal
  const handleUploadDocument = async (docId: string, file: File) => {
    if (!editingReg) return
    setUploadingDocId(docId)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) {
        setEditingReg((prev: any) => {
          const updatedCustomAnswers = {
            ...(prev.customAnswers || {}),
            [docId]: json.url
          }
          const updatedDocs = (prev.docs || []).map((d: any) => 
            d.id === docId ? { ...d, url: json.url } : d
          )
          return {
            ...prev,
            customAnswers: updatedCustomAnswers,
            docs: updatedDocs
          }
        })
        showToast('success', 'Documento adjunto subido correctamente.')
      } else {
        throw new Error('Error al guardar el archivo')
      }
    } catch (err: any) {
      showToast('error', err.message || 'Error al subir el archivo')
    } finally {
      setUploadingDocId(null)
    }
  }

  // Remove attached document from edit modal
  const handleRemoveDocument = (docId: string) => {
    if (!editingReg) return
    setEditingReg((prev: any) => {
      const updatedCustomAnswers = { ...(prev.customAnswers || {}) }
      delete updatedCustomAnswers[docId]
      const updatedDocs = (prev.docs || []).map((d: any) => 
        d.id === docId ? { ...d, url: null } : d
      )
      return {
        ...prev,
        customAnswers: updatedCustomAnswers,
        docs: updatedDocs
      }
    })
  }

  // Save changes to registration and person
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingReg) return

    setSaving(true)
    try {
      const res = await fetch(`/api/registrations/${editingReg.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingReg)
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar los cambios')
      }

      // Update local state
      setRegistrations(prev => prev.map(r => r.id === editingReg.id ? data.registration : r))
      setEditingReg(null)
      showToast('success', 'Registro y datos del participante actualizados con éxito.')
      fetchLiveRegistrations(false)
    } catch (err: any) {
      showToast('error', err.message || 'Error al actualizar el registro')
    } finally {
      setSaving(false)
    }
  }

  // Delete registration
  const handleConfirmDelete = async () => {
    if (!deletingReg) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/registrations/${deletingReg.id}`, {
        method: 'DELETE'
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al eliminar el registro')
      }

      // Remove from local list
      setRegistrations(prev => prev.filter(r => r.id !== deletingReg.id))
      setDeletingReg(null)
      showToast('success', 'Registro eliminado correctamente del evento.')
      fetchLiveRegistrations(false)
    } catch (err: any) {
      showToast('error', err.message || 'Error al eliminar el registro')
    } finally {
      setDeleting(false)
    }
  }

  // Handle direct Excel database download
  const handleExportExcel = async () => {
    try {
      setExportingExcel(true)
      showToast('success', 'Generando y descargando base de datos Excel...')
      
      const res = await fetch(`/api/events/${eventId}/export`)
      if (!res.ok) {
        let errMessage = 'Error al exportar base de datos'
        try {
          const errData = await res.json()
          if (errData?.error) errMessage = errData.error
        } catch(e) {}
        throw new Error(errMessage)
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const disposition = res.headers.get('Content-Disposition')
      let filename = 'Reporte_Participantes.xlsx'
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename="?([^";]+)"?/)
        if (match && match[1]) filename = match[1]
      }
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      showToast('success', 'Base de datos descargada correctamente en formato Excel.')
    } catch (err: any) {
      console.error('Error downloading excel:', err)
      showToast('error', err.message || 'No se pudo descargar la base de datos.')
    } finally {
      setExportingExcel(false)
    }
  }

  return (
    <div id="participants-table-container">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          backgroundColor: toast.type === 'success' ? '#065F46' : '#991B1B',
          color: '#FFFFFF',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: 600,
          fontSize: '0.9rem',
          animation: 'fade-in 0.2s ease-out'
        }}>
          {toast.type === 'success' ? <CheckCircle size={20} color="#34D399" /> : <AlertCircle size={20} color="#F87171" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* LIVE SYNC STATUS & CONTROLS */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1rem',
        padding: '0.65rem 1rem',
        backgroundColor: '#F0FDF4',
        border: '1px solid #BBF7D0',
        borderRadius: '10px',
        fontSize: '0.85rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            display: 'inline-flex',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: autoRefresh ? '#16A34A' : '#94A3B8',
            boxShadow: autoRefresh ? '0 0 0 3px rgba(22, 163, 74, 0.25)' : 'none'
          }} />
          <strong style={{ color: autoRefresh ? '#15803D' : '#64748B' }}>
            {autoRefresh ? 'Actualización en vivo activa (sin refrescar pantalla)' : 'Actualización en vivo pausada'}
          </strong>
          {lastSyncTime && (
            <span style={{ color: '#64748B', fontSize: '0.75rem' }}>
              • Sincronizado: {lastSyncTime}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => fetchLiveRegistrations(false)}
            disabled={isRefreshing}
            className="btn btn-outline"
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              backgroundColor: '#FFFFFF',
              borderColor: '#86EFAC',
              color: '#166534',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              cursor: 'pointer'
            }}
          >
            <RotateCw size={14} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isRefreshing ? 'Cargando...' : 'Actualizar ahora'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoRefresh(!autoRefresh)}
            style={{
              padding: '0.35rem 0.65rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              backgroundColor: autoRefresh ? '#DCFCE7' : '#F1F5F9',
              border: '1px solid',
              borderColor: autoRefresh ? '#86EFAC' : '#CBD5E1',
              color: autoRefresh ? '#15803D' : '#475569',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            {autoRefresh ? 'Pausar' : 'Reanudar'}
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        gap: '1rem', 
        marginBottom: '1.25rem',
        padding: '1rem',
        backgroundColor: '#F8FAFC',
        borderRadius: '12px',
        border: '1px solid #E2E8F0'
      }}>
        {/* Status Filter Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', marginRight: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Filter size={14} /> Filtro:
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: statusFilter === 'ALL' ? '2px solid #2563EB' : '1px solid #CBD5E1',
              backgroundColor: statusFilter === 'ALL' ? '#EFF6FF' : '#FFFFFF',
              color: statusFilter === 'ALL' ? '#1D4ED8' : '#475569'
            }}
          >
            Todos ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ASISTIO')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: statusFilter === 'ASISTIO' ? '2px solid #10B981' : '1px solid #CBD5E1',
              backgroundColor: statusFilter === 'ASISTIO' ? '#ECFDF5' : '#FFFFFF',
              color: statusFilter === 'ASISTIO' ? '#047857' : '#475569'
            }}
          >
            Asistieron ({attendedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('REGISTRADO')}
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: statusFilter === 'REGISTRADO' ? '2px solid #3B82F6' : '1px solid #CBD5E1',
              backgroundColor: statusFilter === 'REGISTRADO' ? '#EFF6FF' : '#FFFFFF',
              color: statusFilter === 'REGISTRADO' ? '#2563EB' : '#475569'
            }}
          >
            Pendientes ({registeredCount})
          </button>
          {cancelledCount > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('CANCELADO')}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: statusFilter === 'CANCELADO' ? '2px solid #EF4444' : '1px solid #CBD5E1',
                backgroundColor: statusFilter === 'CANCELADO' ? '#FEF2F2' : '#FFFFFF',
                color: statusFilter === 'CANCELADO' ? '#B91C1C' : '#475569'
              }}
            >
              Cancelados ({cancelledCount})
            </button>
          )}
        </div>

        {/* Live Search Input */}
        <div style={{ position: 'relative', minWidth: '260px', flex: '1', maxWidth: '380px' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cédula, nombre o municipio..."
            style={{
              width: '100%',
              padding: '0.5rem 2rem 0.5rem 2.25rem',
              fontSize: '0.85rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              outline: 'none'
            }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '0.6rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8'
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Kit de Bienvenida Filter Pills */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '0.45rem', 
          alignItems: 'center', 
          width: '100%', 
          paddingTop: '0.75rem', 
          borderTop: '1px dashed #CBD5E1' 
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1E293B', marginRight: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            🎒 Filtro de Kit de Bienvenida:
          </span>
          <button
            type="button"
            onClick={() => setKitFilter('ALL')}
            style={{
              padding: '0.35rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: kitFilter === 'ALL' ? '2px solid #6366F1' : '1px solid #CBD5E1',
              backgroundColor: kitFilter === 'ALL' ? '#EEF2FF' : '#FFFFFF',
              color: kitFilter === 'ALL' ? '#4F46E5' : '#475569'
            }}
          >
            Todos ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setKitFilter('WITH_KIT')}
            style={{
              padding: '0.35rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: kitFilter === 'WITH_KIT' ? '2px solid #16A34A' : '1px solid #CBD5E1',
              backgroundColor: kitFilter === 'WITH_KIT' ? '#DCFCE7' : '#FFFFFF',
              color: kitFilter === 'WITH_KIT' ? '#15803D' : '#475569'
            }}
          >
            ✅ Recibieron Kit ({kitDeliveredCount})
          </button>
          <button
            type="button"
            onClick={() => setKitFilter('WITHOUT_KIT')}
            style={{
              padding: '0.35rem 0.8rem',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: kitFilter === 'WITHOUT_KIT' ? '2px solid #D97706' : '1px solid #CBD5E1',
              backgroundColor: kitFilter === 'WITHOUT_KIT' ? '#FEF3C7' : '#FFFFFF',
              color: kitFilter === 'WITHOUT_KIT' ? '#B45309' : '#475569'
            }}
          >
            ⏳ Faltan por Kit ({kitPendingCount})
          </button>

          {/* Kit Delivery Summary Stats */}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.78rem', color: '#64748B' }}>
            <span>
              Progreso: <strong style={{ color: '#0F172A' }}>{totalCount > 0 ? Math.round((kitDeliveredCount / totalCount) * 100) : 0}%</strong>
            </span>
            <span style={{ color: '#94A3B8' }}>•</span>
            <span style={{ color: '#B45309', fontWeight: 700 }}>
              Pendientes: {kitPendingCount}
            </span>
          </div>
        </div>

        {/* FILTRO POR CUALQUIER ENTREGA O REFRIGERIO */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.6rem',
          alignItems: 'center',
          width: '100%',
          paddingTop: '0.75rem',
          borderTop: '1px dashed #CBD5E1'
        }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Utensils size={14} color="#D97706" /> Filtrar por Entrega / Refrigerio:
          </span>

          <select
            value={checkpointFilter.name}
            onChange={e => setCheckpointFilter(prev => ({ ...prev, name: e.target.value }))}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '8px',
              border: checkpointFilter.name !== 'ALL' ? '2px solid #2563EB' : '1.5px solid #CBD5E1',
              backgroundColor: checkpointFilter.name !== 'ALL' ? '#EFF6FF' : '#FFFFFF',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: checkpointFilter.name !== 'ALL' ? '#1D4ED8' : '#1E293B',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">-- Todas las entregas registradas --</option>
            {eventCheckpoints.map(cp => (
              <option key={cp} value={cp}>
                {getMealIconHelper(cp)} {cp}
              </option>
            ))}
          </select>

          {checkpointFilter.name !== 'ALL' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setCheckpointFilter(prev => ({ ...prev, status: 'ALL' }))}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: checkpointFilter.status === 'ALL' ? '2px solid #2563EB' : '1px solid #CBD5E1',
                  backgroundColor: checkpointFilter.status === 'ALL' ? '#EFF6FF' : '#FFFFFF',
                  color: checkpointFilter.status === 'ALL' ? '#1D4ED8' : '#475569'
                }}
              >
                Todos con este punto
              </button>
              <button
                type="button"
                onClick={() => setCheckpointFilter(prev => ({ ...prev, status: 'DELIVERED' }))}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: checkpointFilter.status === 'DELIVERED' ? '2px solid #16A34A' : '1px solid #CBD5E1',
                  backgroundColor: checkpointFilter.status === 'DELIVERED' ? '#DCFCE7' : '#FFFFFF',
                  color: checkpointFilter.status === 'DELIVERED' ? '#15803D' : '#475569'
                }}
              >
                ✅ Ya Entregado
              </button>
              <button
                type="button"
                onClick={() => setCheckpointFilter(prev => ({ ...prev, status: 'PENDING' }))}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '16px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: checkpointFilter.status === 'PENDING' ? '2px solid #D97706' : '1px solid #CBD5E1',
                  backgroundColor: checkpointFilter.status === 'PENDING' ? '#FEF3C7' : '#FFFFFF',
                  color: checkpointFilter.status === 'PENDING' ? '#B45309' : '#475569'
                }}
              >
                ⏳ Falta por Entregar
              </button>

              <button
                type="button"
                onClick={() => setCheckpointFilter({ name: 'ALL', status: 'ALL' })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#EF4444',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.2rem',
                  marginLeft: '0.25rem'
                }}
                title="Limpiar filtro de refrigerio"
              >
                <X size={13} />
                <span>Quitar filtro</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Actions & Export Bar */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          width: '100%',
          paddingTop: '0.75rem',
          borderTop: '1px solid #E2E8F0'
        }}>
          <div style={{ fontSize: '0.82rem', color: '#64748B' }}>
            Mostrando <strong>{filtered.length}</strong> de <strong>{totalCount}</strong> participantes registrados
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              href={`/admin/events/${eventId}/report`}
              target="_blank"
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '0.45rem 0.85rem',
                backgroundColor: '#EFF6FF',
                borderColor: '#BFDBFE',
                color: '#1D4ED8',
                borderRadius: '8px',
                textDecoration: 'none'
              }}
            >
              <FileText size={15} />
              <span>Generar Fichas (PDF)</span>
            </Link>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="btn btn-outline"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                padding: '0.45rem 0.85rem',
                backgroundColor: '#F0FDF4',
                borderColor: '#BBF7D0',
                color: '#15803D',
                borderRadius: '8px',
                cursor: exportingExcel ? 'not-allowed' : 'pointer'
              }}
            >
              <Download size={15} style={{ animation: exportingExcel ? 'bounce 1s infinite' : 'none' }} />
              <span>{exportingExcel ? 'Descargando...' : 'Descargar Base de Datos (Excel)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* RESULTS TABLE */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748B', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px dashed #CBD5E1' }}>
          <User size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.25rem 0', color: '#334155' }}>
            No se encontraron participantes
          </h3>
          <p style={{ fontSize: '0.85rem', margin: 0 }}>
            {search ? `Ningún registro coincide con "${search}".` : 'No hay participantes con el filtro seleccionado.'}
          </p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Foto & Asistente</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Documento</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Municipio & Contacto</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Estado</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>🎒 Kit Bienvenida</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>🍱 Refrigerios & Entregas</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Inscripción</th>
                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(reg => {
                let photoUrl: string | null = null
                let tel: string | null = null
                try {
                  const add = JSON.parse(reg.person.additionalData || '{}')
                  photoUrl = add.fotoIngreso || add.foto || null
                  tel = add.contactoEmergencia || null
                  if (!photoUrl && reg.checkpoints) {
                    const cps = JSON.parse(reg.checkpoints)
                    const ingresoCp = cps.find((c: any) => c.name === 'Ingreso' && c.evidenceUrl)
                    if (ingresoCp) photoUrl = ingresoCp.evidenceUrl
                  }
                } catch (e) {}

                const docs = getParticipantDocs(reg)

                const fullName = [reg.person.firstName, reg.person.middleName, reg.person.lastName, reg.person.secondLastName]
                  .filter(Boolean)
                  .join(' ')

                return (
                  <tr key={reg.id} style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s ease' }}>
                    
                    {/* Foto & Nombre */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {photoUrl ? (
                          <img 
                            src={photoUrl} 
                            alt="Foto" 
                            style={{ 
                              width: '40px', 
                              height: '40px', 
                              borderRadius: '8px', 
                              objectFit: 'cover', 
                              border: '2px solid #E2E8F0',
                              flexShrink: 0 
                            }} 
                          />
                        ) : (
                          <div style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '8px', 
                            backgroundColor: '#F1F5F9', 
                            border: '1px solid #E2E8F0', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            color: '#94A3B8', 
                            fontSize: '0.85rem', 
                            fontWeight: 700,
                            flexShrink: 0 
                          }}>
                            {reg.person.firstName?.[0] || 'P'}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, color: '#1E293B', fontSize: '0.95rem' }}>
                            {fullName}
                          </div>
                          {reg.person.specialCondition && reg.person.specialCondition !== 'Ninguna / No Aplica' && (
                            <span style={{ fontSize: '0.7rem', color: '#64748B', backgroundColor: '#F1F5F9', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              {reg.person.specialCondition === 'INDIGENTE' ? 'Habitante de calle' : reg.person.specialCondition}
                            </span>
                          )}

                          {/* BADGES / PILLS DE DOCUMENTOS ADJUNTOS Y CONSENTIMIENTO */}
                          {docs.length > 0 && docs.some(d => d.url) && (
                            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                              {docs.filter(d => d.url).map(d => (
                                <a
                                  key={d.id}
                                  href={d.url!}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  title={`Clic para ver: ${d.label}`}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.2rem',
                                    padding: '0.15rem 0.45rem',
                                    borderRadius: '6px',
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    backgroundColor: d.isConsent ? '#EFF6FF' : '#F0FDF4',
                                    color: d.isConsent ? '#1D4ED8' : '#15803D',
                                    border: `1px solid ${d.isConsent ? '#BFDBFE' : '#BBF7D0'}`,
                                    textDecoration: 'none'
                                  }}
                                >
                                  <Paperclip size={10} />
                                  <span>{d.label.length > 22 ? d.label.substring(0, 19) + '...' : d.label}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Documento */}
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 700, color: '#0F172A', letterSpacing: '0.5px' }}>
                        {reg.person.documentType} {reg.person.documentNumber}
                      </span>
                    </td>

                    {/* Municipio & Teléfono */}
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#475569' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <MapPin size={13} color="#94A3B8" /> {reg.person.municipality || 'No registrado'}
                      </div>
                      {tel && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748B', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                          <Phone size={11} color="#94A3B8" /> {tel}
                        </div>
                      )}
                    </td>

                    {/* Estado */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.25rem 0.65rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        backgroundColor: reg.status === 'ASISTIO' ? '#DCFCE7' : reg.status === 'REGISTRADO' ? '#DBEAFE' : '#FEE2E2',
                        color: reg.status === 'ASISTIO' ? '#15803D' : reg.status === 'REGISTRADO' ? '#1E40AF' : '#B91C1C',
                        border: `1px solid ${reg.status === 'ASISTIO' ? '#86EFAC' : reg.status === 'REGISTRADO' ? '#93C5FD' : '#FCA5A5'}`
                      }}>
                        {reg.status === 'ASISTIO' ? <CheckCircle size={12} /> : <Clock size={12} />}
                        {reg.status}
                      </span>
                    </td>

                    {/* Kit de Bienvenida */}
                    <td style={{ padding: '0.75rem 1rem' }}>
                      {(() => {
                        const kit = getKitScan(reg)
                        if (kit) {
                          const dateFormatted = new Date(kit.timestamp).toLocaleDateString('es-CO', {
                            timeZone: 'America/Bogota',
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short'
                          })
                          const timeFormatted = new Date(kit.timestamp).toLocaleTimeString('es-CO', {
                            timeZone: 'America/Bogota',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                backgroundColor: '#DCFCE7',
                                color: '#15803D',
                                border: '1px solid #86EFAC',
                                width: 'fit-content'
                              }}>
                                🎒 Entregado
                              </span>
                              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                                {dateFormatted} • {timeFormatted}
                              </span>
                              {kit.attendedBy && (
                                <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>
                                  Por: {kit.attendedBy}
                                </span>
                              )}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    let cps: any[] = []
                                    try {
                                      cps = typeof reg.checkpoints === 'string' ? JSON.parse(reg.checkpoints) : reg.checkpoints
                                    } catch(e) {}
                                    const kitIdx = cps.findIndex((c: any) => isKitName(c?.name))
                                    if (kitIdx >= 0) {
                                      handleOpenEditCheckpointDateTime(reg, kitIdx)
                                    }
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#2563EB',
                                    fontSize: '0.68rem',
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    padding: 0
                                  }}
                                  title="Ajustar fecha y hora de entrega del kit"
                                >
                                  Editar fecha
                                </button>
                                <span style={{ fontSize: '0.68rem', color: '#CBD5E1' }}>•</span>
                                <button
                                  type="button"
                                  onClick={() => handleToggleKit(reg, false)}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#EF4444',
                                    fontSize: '0.68rem',
                                    textDecoration: 'underline',
                                    cursor: 'pointer',
                                    padding: 0
                                  }}
                                  title="Desmarcar entrega de kit (por error o duplicado)"
                                >
                                  Desmarcar
                                </button>
                              </div>
                            </div>
                          )
                        } else {
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: '#FEF3C7',
                                color: '#B45309',
                                border: '1px solid #FDE68A',
                                width: 'fit-content'
                              }}>
                                ⏳ Pendiente
                              </span>
                              <button
                                type="button"
                                onClick={() => handleToggleKit(reg, true)}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  backgroundColor: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  color: '#1D4ED8',
                                  borderRadius: '6px',
                                  padding: '0.2rem 0.5rem',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  width: 'fit-content'
                                }}
                                title="Marcar kit de bienvenida entregado (con selección de fecha y hora)"
                              >
                                + Marcar Kit
                              </button>
                            </div>
                          )
                        }
                      })()}
                    </td>

                    {/* Entregas y Refrigerios en Vivo */}
                    <td style={{ padding: '0.75rem 1rem', minWidth: '240px', maxWidth: '340px' }}>
                      {(() => {
                        let cps: any[] = []
                        try {
                          cps = typeof reg.checkpoints === 'string' ? JSON.parse(reg.checkpoints || '[]') : (reg.checkpoints || [])
                          if (!Array.isArray(cps)) cps = []
                        } catch {
                          cps = []
                        }

                        // List all delivered checkpoints (except kit which has its own column)
                        const nonKitDeliveries = cps.filter((c: any) => c && c.name && !isKitName(c.name))
                        const totalConfiguredMeals = eventCheckpoints.filter((cp: string) => !isKitName(cp)).length

                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {nonKitDeliveries.length === 0 ? (
                              <span style={{ fontSize: '0.74rem', color: '#94A3B8', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Clock size={12} /> Sin refrigerios entregados
                              </span>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                {nonKitDeliveries.map((cp: any, idx: number) => {
                                  const icon = getMealIconHelper(cp.name)
                                  const timeStr = cp.timestamp ? new Date(cp.timestamp).toLocaleTimeString('es-CO', {
                                    timeZone: 'America/Bogota',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true
                                  }) : ''

                                  return (
                                    <span
                                      key={idx}
                                      title={`${cp.name} - Entregado a las ${timeStr}${cp.attendedBy ? ` por ${cp.attendedBy}` : ''}`}
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '0.2rem',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        padding: '0.15rem 0.45rem',
                                        borderRadius: '6px',
                                        backgroundColor: '#F0FDF4',
                                        color: '#166534',
                                        border: '1px solid #BBF7D0',
                                        lineHeight: 1.2
                                      }}
                                    >
                                      <span>{icon}</span>
                                      <span>{cp.name}</span>
                                      {timeStr && <span style={{ color: '#15803D', fontSize: '0.65rem', opacity: 0.85 }}>({timeStr})</span>}
                                    </span>
                                  )
                                })}
                              </div>
                            )}

                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.15rem' }}>
                              <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                                {nonKitDeliveries.length} de {totalConfiguredMeals} entregados
                              </span>
                              <button
                                type="button"
                                onClick={() => setManagingCheckpointsReg(reg)}
                                style={{
                                  background: '#EFF6FF',
                                  border: '1px solid #BFDBFE',
                                  borderRadius: '5px',
                                  color: '#1D4ED8',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  padding: '0.15rem 0.45rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.2rem'
                                }}
                                title="Marcar o editar entregas de comida"
                              >
                                <Utensils size={10} />
                                <span>Gestionar</span>
                              </button>
                            </div>
                          </div>
                        )
                      })()}
                    </td>

                    {/* Fecha Registro */}
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748B' }}>
                      {new Date(reg.registeredAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                        
                        {/* Ver Ficha Completa y Documentos */}
                        <button
                          type="button"
                          onClick={() => setViewingReg(reg)}
                          title="Ver Ficha y Documentos Adjuntos"
                          style={{
                            padding: '0.4rem 0.65rem',
                            backgroundColor: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            borderRadius: '6px',
                            color: '#15803D',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <Eye size={14} />
                          <span>Ver</span>
                        </button>

                        {/* Gestionar Refrigerios y Entregas */}
                        {(() => {
                          const stats = getParticipantCheckpointStats(reg)
                          return (
                            <button
                              type="button"
                              onClick={() => setManagingCheckpointsReg(reg)}
                              title="Gestionar y marcar refrigerios, comidas y puntos de control"
                              style={{
                                padding: '0.4rem 0.65rem',
                                backgroundColor: '#FEF3C7',
                                border: '1px solid #FCD34D',
                                borderRadius: '6px',
                                color: '#92400E',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              <Utensils size={14} color="#D97706" />
                              <span>Refrigerios</span>
                              <span style={{
                                fontSize: '0.68rem',
                                backgroundColor: '#FFFFFF',
                                color: stats.deliveredCount > 0 ? '#15803D' : '#92400E',
                                padding: '0.05rem 0.35rem',
                                borderRadius: '10px',
                                border: '1px solid #FDE68A',
                                fontWeight: 800
                              }}>
                                {stats.deliveredCount}
                              </span>
                            </button>
                          )
                        })()}

                        {/* Sticker */}
                        <Link 
                          href={`/event/${eventId}/sticker/${reg.id}`} 
                          target="_blank"
                          title="Imprimir Carnet / Sticker QR"
                          style={{
                            padding: '0.4rem 0.6rem',
                            backgroundColor: '#F8FAFC',
                            border: '1px solid #CBD5E1',
                            borderRadius: '6px',
                            color: '#1E293B',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'none'
                          }}
                        >
                          <Printer size={14} color="#2563EB" />
                          <span>QR</span>
                        </Link>

                        {/* Ficha Individual (PDF) */}
                        <Link 
                          href={`/admin/events/${eventId}/report?search=${encodeURIComponent(reg.person?.documentNumber || reg.id)}`} 
                          target="_blank"
                          title="Ver e Imprimir Ficha de Asistencia (PDF)"
                          style={{
                            padding: '0.4rem 0.6rem',
                            backgroundColor: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            borderRadius: '6px',
                            color: '#15803D',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textDecoration: 'none'
                          }}
                        >
                          <FileText size={14} color="#16A34A" />
                          <span>Ficha</span>
                        </Link>

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(reg)}
                          title="Editar Participante y Adjuntos"
                          style={{
                            padding: '0.4rem 0.6rem',
                            backgroundColor: '#EFF6FF',
                            border: '1px solid #BFDBFE',
                            borderRadius: '6px',
                            color: '#1D4ED8',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Edit3 size={14} />
                          <span>Editar</span>
                        </button>

                        {/* Eliminar */}
                        <button
                          type="button"
                          onClick={() => setDeletingReg({ id: reg.id, fullName, document: `${reg.person.documentType} ${reg.person.documentNumber}` })}
                          title="Eliminar Registro"
                          style={{
                            padding: '0.4rem 0.6rem',
                            backgroundColor: '#FEF2F2',
                            border: '1px solid #FECACA',
                            borderRadius: '6px',
                            color: '#DC2626',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                        </button>

                      </div>
                    </td>

                  </tr>
                )
              })}
            </tbody>
          </table>
          
          <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid #E2E8F0', fontSize: '0.8rem', color: '#64748B', display: 'flex', justifyContent: 'space-between' }}>
            <span>Mostrando <strong>{filtered.length}</strong> de <strong>{totalCount}</strong> participantes registrados</span>
          </div>
        </div>
      )}

      {/* ================= EDIT MODAL ================= */}
      {editingReg && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="animate-fade-in" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '750px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC'
            }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Editar Registro de Participante
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
                  ID Registro: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{editingReg.id}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingReg(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#64748B',
                  padding: '0.25rem'
                }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveEdit} style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* ESTADO DE ASISTENCIA */}
              <div style={{
                backgroundColor: '#EFF6FF',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid #BFDBFE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem'
              }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E40AF', display: 'block', marginBottom: '0.2rem' }}>
                    Estado de la Asistencia al Evento:
                  </label>
                  <span style={{ fontSize: '0.75rem', color: '#3B82F6' }}>
                    Controla si la persona ya ingresó o está pendiente
                  </span>
                </div>
                <select
                  value={editingReg.status}
                  onChange={e => setEditingReg({ ...editingReg, status: e.target.value })}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: '2px solid #2563EB',
                    backgroundColor: '#FFFFFF',
                    color: editingReg.status === 'ASISTIO' ? '#047857' : editingReg.status === 'REGISTRADO' ? '#1D4ED8' : '#B91C1C'
                  }}
                >
                  <option value="REGISTRADO">🔵 REGISTRADO (Pendiente)</option>
                  <option value="ASISTIO">🟢 ASISTIO (Verificado en Puerta)</option>
                  <option value="CANCELADO">🔴 CANCELADO</option>
                </select>
              </div>

              {/* FOTOGRAFÍA DE INGRESO */}
              <div style={{
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem'
              }}>
                <div style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  backgroundColor: '#E2E8F0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #CBD5E1',
                  flexShrink: 0
                }}>
                  {editingReg.fotoIngreso ? (
                    <img src={editingReg.fotoIngreso} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Camera size={30} color="#94A3B8" />
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1E293B', display: 'block', marginBottom: '0.25rem' }}>
                    Fotografía de Ingreso del Asistente
                  </label>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0 0 0.5rem' }}>
                    {editingReg.fotoIngreso ? 'Fotografía vinculada a los puntos de entrega y control.' : 'Aún no se ha cargado foto de ingreso.'}
                  </p>
                  
                  <input
                    type="file"
                    ref={fileInputModalRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploadingModalPhoto(true)
                      try {
                        const fd = new FormData()
                        fd.append('file', file)
                        const res = await fetch('/api/upload', { method: 'POST', body: fd })
                        const json = await res.json()
                        if (json.url) {
                          setEditingReg({ ...editingReg, fotoIngreso: json.url })
                        }
                      } catch (err) {
                        alert('Error al subir la imagen')
                      } finally {
                        setUploadingModalPhoto(false)
                      }
                    }}
                  />

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      disabled={uploadingModalPhoto}
                      onClick={() => fileInputModalRef.current?.click()}
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <UploadCloud size={14} />
                      {uploadingModalPhoto ? 'Subiendo...' : (editingReg.fotoIngreso ? 'Cambiar Foto' : 'Subir Foto')}
                    </button>
                    {editingReg.fotoIngreso && (
                      <button
                        type="button"
                        onClick={() => setEditingReg({ ...editingReg, fotoIngreso: null })}
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#DC2626', borderColor: '#FECACA' }}
                      >
                        Quitar Foto
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* SECCIÓN 1: IDENTIFICACIÓN Y NOMBRES */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '0.75rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.35rem' }}>
                  1. Identificación y Nombres
                </h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Tipo Doc. *</label>
                    <select
                      value={editingReg.documentType}
                      onChange={e => setEditingReg({ ...editingReg, documentType: e.target.value })}
                      required
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                      <option value="CC">CC - Cédula</option>
                      <option value="TI">TI - Tarjeta de Identidad</option>
                      <option value="RC">RC - Registro Civil</option>
                      <option value="CE">CE - Cédula de Extranjería</option>
                      <option value="PA">PA - Pasaporte</option>
                      <option value="PPT">PPT - Permiso Prot. Temporal</option>
                      <option value="NUI">NUI - Número Único Ident.</option>
                      <option value="SP">SP - Salvoconducto</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Número de Documento *</label>
                    <input
                      type="text"
                      value={editingReg.documentNumber}
                      onChange={e => setEditingReg({ ...editingReg, documentNumber: e.target.value.toUpperCase() })}
                      required
                      style={{ padding: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Primer Nombre *</label>
                    <input
                      type="text"
                      value={editingReg.firstName}
                      onChange={e => setEditingReg({ ...editingReg, firstName: e.target.value.toUpperCase() })}
                      required
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Segundo Nombre</label>
                    <input
                      type="text"
                      value={editingReg.middleName}
                      onChange={e => setEditingReg({ ...editingReg, middleName: e.target.value.toUpperCase() })}
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Primer Apellido *</label>
                    <input
                      type="text"
                      value={editingReg.lastName}
                      onChange={e => setEditingReg({ ...editingReg, lastName: e.target.value.toUpperCase() })}
                      required
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Segundo Apellido</label>
                    <input
                      type="text"
                      value={editingReg.secondLastName}
                      onChange={e => setEditingReg({ ...editingReg, secondLastName: e.target.value.toUpperCase() })}
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Municipio de Residencia</label>
                    <select
                      value={editingReg.municipality}
                      onChange={e => setEditingReg({ ...editingReg, municipality: e.target.value })}
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                      <option value="">Seleccione...</option>
                      {MUNICIPIOS_NDS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={editingReg.birthDate}
                      onChange={e => setEditingReg({ ...editingReg, birthDate: e.target.value })}
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Sexo</label>
                    <select
                      value={editingReg.sex}
                      onChange={e => setEditingReg({ ...editingReg, sex: e.target.value })}
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                      <option value="">Seleccione...</option>
                      <option value="HOMBRE">Hombre</option>
                      <option value="MUJER">Mujer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: CONDICIÓN Y SALUD */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '0.75rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.35rem' }}>
                  2. Condición, Salud y Contacto
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Condición Especial</label>
                    <select
                      value={editingReg.specialCondition}
                      onChange={e => setEditingReg({ ...editingReg, specialCondition: e.target.value })}
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                      <option value="">Ninguna / No Aplica</option>
                      <option value="HABITANTE_DE_CALLE">Habitante de calle</option>
                      <option value="REINTEGRADO">Reintegrado</option>
                      <option value="DESMOVILIZADO">Desmovilizado</option>
                      <option value="ADOLESCENTE_EMBARAZADA">Adolescente Embarazada</option>
                      <option value="DESPLAZADO">Desplazado</option>
                      <option value="PRIVADO_LIBERTAD">Privado de la libertad</option>
                      <option value="LIBERTAD_ASISTIDA">Libertad Asistida</option>
                      <option value="LGBTIQI">LGBTIQI+ / OSIGD</option>
                      <option value="MIGRANTE">Migrante</option>
                      <option value="REFUGIADO">Refugiado</option>
                      <option value="RETORNADO">Retornado</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Grupo al que Pertenece</label>
                    <select
                      value={editingReg.grupoJuvenil || ''}
                      onChange={e => setEditingReg({ ...editingReg, grupoJuvenil: e.target.value })}
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    >
                      <option value="">Ninguno / No Aplica</option>
                      <option value="CMJ">CMJ (Consejo Municipal de Juventudes)</option>
                      <option value="PMJ">PMJ (Plataforma Municipal de Juventudes)</option>
                      <option value="BASE_JUVENIL">Base Juvenil</option>
                      <option value="ENLACE_MUNICIPAL">Enlace Municipal</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>EPS</label>
                    <input
                      type="text"
                      value={editingReg.eps}
                      onChange={e => setEditingReg({ ...editingReg, eps: e.target.value.toUpperCase() })}
                      placeholder="Ej. SANITAS, NUEVA EPS..."
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.8rem' }}>Contacto / Teléfono Emergencia</label>
                    <input
                      type="text"
                      value={editingReg.contactoEmergencia}
                      onChange={e => setEditingReg({ ...editingReg, contactoEmergencia: e.target.value.toUpperCase() })}
                      placeholder="Nombre y teléfono"
                      style={{ padding: '0.5rem', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Alergias o Observaciones Médicas</label>
                  <textarea
                    rows={2}
                    value={editingReg.alergiasMedicas}
                    onChange={e => setEditingReg({ ...editingReg, alergiasMedicas: e.target.value.toUpperCase() })}
                    placeholder="Especifique alergias, medicamentos o necesidades médicas..."
                    style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                  />
                </div>
              </div>

              {/* SECCIÓN 3: DOCUMENTOS ADJUNTOS Y CONSENTIMIENTO INFORMADO */}
              <div>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '0.75rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Paperclip size={16} color="#2563EB" />
                  <span>3. Documentos Adjuntos y Consentimiento Informado</span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {editingReg.docs && editingReg.docs.length > 0 ? (
                    editingReg.docs.map((doc: any) => {
                      const isUploading = uploadingDocId === doc.id
                      const hasFile = Boolean(doc.url)

                      return (
                        <div 
                          key={doc.id}
                          style={{
                            backgroundColor: hasFile ? '#F0FDF4' : '#FFFBEB',
                            border: `1.5px solid ${hasFile ? '#86EFAC' : '#FCD34D'}`,
                            borderRadius: '10px',
                            padding: '0.85rem 1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '1rem',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <FileText size={16} color={hasFile ? '#16A34A' : '#D97706'} />
                              <span>{doc.label}</span>
                              {doc.isConsent && (
                                <span style={{ fontSize: '0.65rem', backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>
                                  Consentimiento
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: hasFile ? '#15803D' : '#B45309', marginTop: '0.2rem', fontWeight: 600 }}>
                              {hasFile ? `✅ Archivo cargado (${doc.url.split('/').pop()})` : '⚠️ Sin archivo adjunto'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {hasFile && (
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-outline"
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  padding: '0.35rem 0.65rem',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  backgroundColor: '#FFFFFF',
                                  color: '#1D4ED8',
                                  borderColor: '#BFDBFE',
                                  textDecoration: 'none'
                                }}
                              >
                                <Eye size={13} />
                                <span>Ver Archivo</span>
                              </a>
                            )}

                            <label
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                padding: '0.35rem 0.65rem',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                                borderRadius: '6px',
                                cursor: isUploading ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <UploadCloud size={13} />
                              <span>{isUploading ? 'Subiendo...' : (hasFile ? 'Reemplazar' : 'Subir Archivo')}</span>
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                style={{ display: 'none' }}
                                disabled={isUploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleUploadDocument(doc.id, file)
                                }}
                              />
                            </label>

                            {hasFile && (
                              <button
                                type="button"
                                onClick={() => handleRemoveDocument(doc.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#DC2626',
                                  cursor: 'pointer',
                                  padding: '0.25rem',
                                  fontSize: '0.75rem',
                                  textDecoration: 'underline'
                                }}
                              >
                                Quitar
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>
                      No hay campos de documentos configurados para este evento.
                    </p>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{
                marginTop: '1rem',
                paddingTop: '1rem',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem'
              }}>
                <button
                  type="button"
                  onClick={() => setEditingReg(null)}
                  className="btn btn-outline"
                  disabled={saving}
                  style={{ padding: '0.6rem 1.25rem', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ 
                    padding: '0.6rem 1.5rem', 
                    fontWeight: 700, 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    backgroundColor: '#2563EB' 
                  }}
                >
                  <Save size={18} />
                  {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================= VIEW PARTICIPANT & DOCUMENTS MODAL ================= */}
      {viewingReg && (() => {
        const docs = getParticipantDocs(viewingReg)
        let addData: any = {}
        try {
          addData = JSON.parse(viewingReg.person?.additionalData || '{}')
        } catch (e) {}

        let photoUrl = addData.fotoIngreso || addData.foto || null
        let cps: any[] = []
        try {
          cps = JSON.parse(viewingReg.checkpoints || '[]')
          if (!photoUrl) {
            const ingresoCp = cps.find((c: any) => c.name === 'Ingreso' && c.evidenceUrl)
            if (ingresoCp) photoUrl = ingresoCp.evidenceUrl
          }
        } catch (e) {}

        const fullName = [
          viewingReg.person.firstName,
          viewingReg.person.middleName,
          viewingReg.person.lastName,
          viewingReg.person.secondLastName
        ].filter(Boolean).join(' ')

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}>
            <div className="animate-fade-in" style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}>
              
              {/* Modal Header */}
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  {photoUrl ? (
                    <img 
                      src={photoUrl} 
                      alt="Foto" 
                      style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover', border: '2px solid #CBD5E1' }} 
                    />
                  ) : (
                    <div style={{ width: '48px', height: '48px', borderRadius: '10px', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#64748B', fontSize: '1.1rem' }}>
                      {viewingReg.person.firstName?.[0] || 'P'}
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                      {fullName}
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
                      {viewingReg.person.documentType} {viewingReg.person.documentNumber} • ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{viewingReg.id.slice(-8).toUpperCase()}</span>
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.35rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    backgroundColor: viewingReg.status === 'ASISTIO' ? '#DCFCE7' : viewingReg.status === 'REGISTRADO' ? '#DBEAFE' : '#FEE2E2',
                    color: viewingReg.status === 'ASISTIO' ? '#15803D' : viewingReg.status === 'REGISTRADO' ? '#1E40AF' : '#B91C1C',
                    border: `1px solid ${viewingReg.status === 'ASISTIO' ? '#86EFAC' : viewingReg.status === 'REGISTRADO' ? '#93C5FD' : '#FCA5A5'}`
                  }}>
                    {viewingReg.status === 'ASISTIO' ? <CheckCircle size={14} /> : <Clock size={14} />}
                    {viewingReg.status}
                  </span>

                  <button
                    type="button"
                    onClick={() => setViewingReg(null)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', padding: '0.25rem' }}
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* SECCIÓN DOCUMENTOS Y CONSENTIMIENTO (LO MÁS DESTACADO) */}
                <div style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '14px',
                  border: '1.5px solid #CBD5E1',
                  padding: '1.25rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Paperclip size={20} color="#2563EB" />
                      <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                        Documentos Adjuntos y Consentimiento Informado
                      </h4>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '0.2rem 0.6rem', borderRadius: '20px', border: '1px solid #BFDBFE' }}>
                      {docs.filter(d => d.url).length} de {docs.length} cargados
                    </span>
                  </div>

                  {docs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: '#64748B', fontSize: '0.85rem' }}>
                      No se han configurado preguntas con documentos adjuntos para este evento.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {docs.map(doc => {
                        const isPdf = doc.url?.toLowerCase().endsWith('.pdf')
                        const isImg = doc.url?.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)

                        return (
                          <div 
                            key={doc.id}
                            style={{
                              backgroundColor: doc.url ? '#FFFFFF' : '#FFFBEB',
                              borderRadius: '10px',
                              border: `1px solid ${doc.url ? (doc.isConsent ? '#93C5FD' : '#E2E8F0') : '#FDE68A'}`,
                              padding: '1rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '1rem',
                              flexWrap: 'wrap'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '220px' }}>
                              <div style={{
                                width: '42px',
                                height: '42px',
                                borderRadius: '8px',
                                backgroundColor: doc.url ? (doc.isConsent ? '#EFF6FF' : '#F0FDF4') : '#FEF3C7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: doc.url ? (doc.isConsent ? '#2563EB' : '#16A34A') : '#D97706',
                                flexShrink: 0
                              }}>
                                <FileText size={22} />
                              </div>
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                  {doc.label}
                                  {doc.isConsent && (
                                    <span style={{ fontSize: '0.65rem', backgroundColor: '#DBEAFE', color: '#1E40AF', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                                      Consentimiento
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: doc.url ? '#16A34A' : '#D97706', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                                  {doc.url ? (
                                    <>
                                      <CheckCircle2 size={13} />
                                      <span>Documento adjunto correctamente {isPdf ? '(PDF)' : isImg ? '(Imagen)' : ''}</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle size={13} />
                                      <span>Pendiente / No adjuntado por el participante</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Actions for Document */}
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              {doc.url ? (
                                <>
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-primary"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      padding: '0.45rem 0.9rem',
                                      fontSize: '0.8rem',
                                      fontWeight: 700,
                                      backgroundColor: '#2563EB',
                                      color: '#FFFFFF',
                                      borderRadius: '8px',
                                      textDecoration: 'none'
                                    }}
                                  >
                                    <Eye size={15} />
                                    <span>Ver Documento</span>
                                    <ExternalLink size={12} />
                                  </a>

                                  <a
                                    href={doc.url}
                                    download
                                    className="btn btn-outline"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '0.35rem',
                                      padding: '0.45rem 0.75rem',
                                      fontSize: '0.8rem',
                                      fontWeight: 600,
                                      color: '#334155',
                                      borderRadius: '8px',
                                      textDecoration: 'none'
                                    }}
                                  >
                                    <Download size={14} />
                                    <span>Descargar</span>
                                  </a>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const regToEdit = viewingReg
                                    setViewingReg(null)
                                    handleOpenEdit(regToEdit)
                                  }}
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.35rem',
                                    padding: '0.45rem 0.85rem',
                                    fontSize: '0.8rem',
                                    fontWeight: 700,
                                    backgroundColor: '#F59E0B',
                                    color: '#FFFFFF',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  <UploadCloud size={14} />
                                  <span>Subir ahora</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* DEMOGRÁFICA Y CONTACTO */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Municipio</span>
                    <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                      {viewingReg.person.municipality || 'No registrado'}
                    </p>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Fecha de Nacimiento</span>
                    <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                      {viewingReg.person.birthDate ? new Date(viewingReg.person.birthDate).toLocaleDateString('es-CO') : 'No registrada'}
                    </p>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Sexo / Género</span>
                    <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                      {viewingReg.person.sex || 'No registrado'} {viewingReg.person.gender ? `(${viewingReg.person.gender})` : ''}
                    </p>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>EPS</span>
                    <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                      {addData.eps || 'No registrada'}
                    </p>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Contacto de Emergencia</span>
                    <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                      {addData.contactoEmergencia || 'No registrado'}
                    </p>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Grupo Juvenil</span>
                    <p style={{ margin: '0.15rem 0 0', fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>
                      {addData.grupoJuvenil || 'Ninguno'}
                    </p>
                  </div>
                </div>

                {/* ESTADO KIT DE BIENVENIDA */}
                <div style={{
                  backgroundColor: hasKit(viewingReg) ? '#F0FDF4' : '#FFFBEB',
                  borderRadius: '12px',
                  padding: '1rem',
                  border: `1.5px solid ${hasKit(viewingReg) ? '#BBF7D0' : '#FDE68A'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ fontSize: '1.5rem' }}>🎒</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: hasKit(viewingReg) ? '#166534' : '#92400E' }}>
                        Kit de Bienvenida: {hasKit(viewingReg) ? 'ENTREGADO' : 'PENDIENTE POR ENTREGAR'}
                      </h4>
                      {(() => {
                        const kit = getKitScan(viewingReg)
                        if (kit) {
                          const dateStr = new Date(kit.timestamp).toLocaleDateString('es-CO', {
                            timeZone: 'America/Bogota',
                            weekday: 'long',
                            day: 'numeric',
                            month: 'short'
                          })
                          const hourStr = new Date(kit.timestamp).toLocaleTimeString('es-CO', {
                            timeZone: 'America/Bogota',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })
                          return (
                            <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#15803D' }}>
                              Entregado el {dateStr} a las {hourStr} {kit.attendedBy ? `(Atendido por: ${kit.attendedBy})` : ''}
                            </p>
                          )
                        }
                        return (
                          <p style={{ margin: '0.15rem 0 0', fontSize: '0.8rem', color: '#B45309' }}>
                            Este participante no tiene registrada la entrega del kit en ninguno de los días.
                          </p>
                        )
                      })()}
                    </div>
                  </div>

                  <div>
                    {hasKit(viewingReg) ? (
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            let cpsList: any[] = []
                            try {
                              cpsList = typeof viewingReg.checkpoints === 'string' ? JSON.parse(viewingReg.checkpoints) : viewingReg.checkpoints
                            } catch(e) {}
                            const kitIdx = cpsList.findIndex((c: any) => isKitName(c?.name))
                            if (kitIdx >= 0) {
                              handleOpenEditCheckpointDateTime(viewingReg, kitIdx)
                            }
                          }}
                          style={{
                            padding: '0.4rem 0.8rem',
                            backgroundColor: '#EFF6FF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                          title="Ajustar fecha y hora de entrega del kit"
                        >
                          ✏️ Editar Fecha/Hora
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleKit(viewingReg, false)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FECACA',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Desmarcar Kit
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleKit(viewingReg, true)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          backgroundColor: '#16A34A',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          boxShadow: '0 2px 5px rgba(22, 163, 74, 0.3)'
                        }}
                      >
                        + Marcar Kit como Entregado
                      </button>
                    )}
                  </div>
                </div>

                {/* CHECKPOINTS REGISTRADOS */}
                <div style={{ backgroundColor: '#F8FAFC', borderRadius: '12px', padding: '1rem', border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Utensils size={15} color="#D97706" /> Historial de Refrigerios y Puntos ({cps.length}):
                    </span>
                    <button
                      type="button"
                      onClick={() => setManagingCheckpointsReg(viewingReg)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        backgroundColor: '#FEF3C7',
                        border: '1px solid #FCD34D',
                        borderRadius: '6px',
                        color: '#92400E',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Utensils size={13} />
                      <span>Abrir Panel de Refrigerios</span>
                    </button>
                  </div>

                  {cps.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#94A3B8' }}>Aún no se han registrado refrigerios o puntos para este participante.</p>
                      <button
                        type="button"
                        onClick={() => setManagingCheckpointsReg(viewingReg)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.78rem', padding: '0.35rem 0.8rem', backgroundColor: '#D97706', borderColor: '#D97706' }}
                      >
                        + Marcar Refrigerios de este Asistente
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {cps.map((cp: any, idx: number) => {
                        const dateFormatted = new Date(cp.timestamp).toLocaleDateString('es-CO', {
                          timeZone: 'America/Bogota',
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short'
                        })
                        const timeFormatted = new Date(cp.timestamp).toLocaleTimeString('es-CO', {
                          timeZone: 'America/Bogota',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', backgroundColor: '#FFFFFF', padding: '0.4rem 0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.8rem', fontWeight: 700 }}>
                            <CheckCircle2 size={14} color="#16A34A" />
                            <span>{cp.name}</span>
                            <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 500 }}>
                              ({dateFormatted} • {timeFormatted})
                            </span>
                            {cp.attendedBy && (
                              <span style={{ fontSize: '0.68rem', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                                {cp.attendedBy}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenEditCheckpointDateTime(viewingReg, idx)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#2563EB',
                                cursor: 'pointer',
                                padding: '0.1rem 0.25rem',
                                display: 'flex',
                                alignItems: 'center',
                                marginLeft: '0.2rem'
                              }}
                              title="Modificar fecha y hora de esta entrega"
                            >
                              <Edit3 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveCheckpoint(viewingReg.id, idx)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#EF4444',
                                cursor: 'pointer',
                                padding: '0.1rem 0.25rem',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                              title="Eliminar esta entrega puntual"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC'
              }}>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <Link
                    href={`/event/${eventId}/sticker/${viewingReg.id}`}
                    target="_blank"
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    <Printer size={15} color="#2563EB" />
                    <span>Imprimir Carnet / Sticker</span>
                  </Link>

                  <Link
                    href={`/admin/events/${eventId}/report?search=${encodeURIComponent(viewingReg.person?.documentNumber || viewingReg.id)}`}
                    target="_blank"
                    className="btn btn-outline"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', fontWeight: 600, backgroundColor: '#F0FDF4', borderColor: '#BBF7D0', color: '#15803D' }}
                  >
                    <FileText size={15} color="#16A34A" />
                    <span>Ver / Imprimir Ficha (PDF)</span>
                  </Link>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const regToEdit = viewingReg
                      setViewingReg(null)
                      handleOpenEdit(regToEdit)
                    }}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 700, backgroundColor: '#2563EB' }}
                  >
                    <Edit3 size={15} />
                    <span>Editar Participante</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingReg(null)}
                    className="btn btn-outline"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    Cerrar
                  </button>
                </div>
              </div>

            </div>
          </div>
        )
      })()}

      {/* ================= DELETE CONFIRM MODAL ================= */}
      {deletingReg && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="animate-fade-in" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '460px',
            width: '100%',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            textAlign: 'center'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: '#FEE2E2',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem'
            }}>
              <Trash2 size={30} />
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem' }}>
              ¿Eliminar inscripción?
            </h3>
            
            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              ¿Estás seguro de que deseas eliminar el registro de <strong>{deletingReg.fullName}</strong> ({deletingReg.document})?
              Esta acción no se puede deshacer y revocará su código QR de acceso.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setDeletingReg(null)}
                className="btn btn-outline"
                disabled={deleting}
                style={{ flex: 1, padding: '0.7rem' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="btn"
                style={{
                  flex: 1,
                  padding: '0.7rem',
                  backgroundColor: '#DC2626',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  border: 'none',
                  borderRadius: '8px'
                }}
              >
                {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: GESTIÓN DE REFRIGERIOS Y PUNTOS DE CONTROL ================= */}
      {managingCheckpointsReg && (() => {
        let cps: any[] = []
        try {
          cps = typeof managingCheckpointsReg.checkpoints === 'string'
            ? JSON.parse(managingCheckpointsReg.checkpoints || '[]')
            : (managingCheckpointsReg.checkpoints || [])
          if (!Array.isArray(cps)) cps = []
        } catch {
          cps = []
        }

        const fullName = [
          managingCheckpointsReg.person?.firstName,
          managingCheckpointsReg.person?.middleName,
          managingCheckpointsReg.person?.lastName,
          managingCheckpointsReg.person?.secondLastName
        ].filter(Boolean).join(' ')

        let photoUrl: string | null = null
        try {
          const add = JSON.parse(managingCheckpointsReg.person?.additionalData || '{}')
          photoUrl = add.fotoIngreso || add.foto || null
          if (!photoUrl) {
            const ing = cps.find((c: any) => c.name === 'Ingreso' && c.evidenceUrl)
            if (ing) photoUrl = ing.evidenceUrl
          }
        } catch(e) {}

        const kitScan = cps.find((c: any) => isKitName(c?.name))
        const hasKitVal = !!kitScan

        // Helper to get meal icon
        const getMealIcon = (mealName: string) => {
          const lower = mealName.toLowerCase()
          if (lower.includes('desayuno')) return '☕'
          if (lower.includes('almuerzo')) return '🍱'
          if (lower.includes('tarde')) return '🍪'
          if (lower.includes('cena')) return '🍲'
          if (lower.includes('refrigerio')) return '🍪'
          if (lower.includes('kit') || lower.includes('bienvenida')) return '🎒'
          if (lower.includes('ingreso')) return '🚪'
          return '📍'
        }

        // Calculate progress
        const totalPossible = eventCheckpoints.length
        const totalDelivered = cps.length

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1rem'
          }}>
            <div className="animate-fade-in" style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '850px',
              width: '100%',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}>
              
              {/* Header */}
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  {photoUrl ? (
                    <img 
                      src={photoUrl} 
                      alt="Foto" 
                      style={{ width: '46px', height: '46px', borderRadius: '10px', objectFit: 'cover', border: '2px solid #CBD5E1' }} 
                    />
                  ) : (
                    <div style={{ width: '46px', height: '46px', borderRadius: '10px', backgroundColor: '#E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#64748B', fontSize: '1.1rem' }}>
                      {managingCheckpointsReg.person?.firstName?.[0] || 'P'}
                    </div>
                  )}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                        {fullName}
                      </h3>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '12px',
                        backgroundColor: managingCheckpointsReg.status === 'ASISTIO' ? '#DCFCE7' : '#EFF6FF',
                        color: managingCheckpointsReg.status === 'ASISTIO' ? '#15803D' : '#1D4ED8',
                        border: `1px solid ${managingCheckpointsReg.status === 'ASISTIO' ? '#86EFAC' : '#BFDBFE'}`
                      }}>
                        {managingCheckpointsReg.status}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
                      {managingCheckpointsReg.person?.documentType} {managingCheckpointsReg.person?.documentNumber} • {managingCheckpointsReg.person?.municipality || 'Municipio no reg.'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Entregas registradas</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                      {totalDelivered} / {totalPossible}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManagingCheckpointsReg(null)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B', padding: '0.25rem' }}
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Instructions banner */}
              <div style={{
                backgroundColor: '#EFF6FF',
                padding: '0.75rem 1.25rem',
                borderBottom: '1px solid #DBEAFE',
                fontSize: '0.82rem',
                color: '#1E40AF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Clock size={16} color="#2563EB" />
                  <span>
                    <strong>Marcación con Fecha y Hora Ajustable:</strong> Puedes marcar los refrigerios pendientes o ajustar la fecha y hora exacta en que se entregaron.
                  </span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#DBEAFE', padding: '0.15rem 0.5rem', borderRadius: '12px' }}>
                  {totalDelivered} entregados
                </span>
              </div>

              {/* Body */}
              <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* 1. SECCIÓN KIT DE BIENVENIDA */}
                <div style={{
                  backgroundColor: hasKitVal ? '#F0FDF4' : '#FFFBEB',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  border: `1.5px solid ${hasKitVal ? '#BBF7D0' : '#FDE68A'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ fontSize: '1.75rem' }}>🎒</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: hasKitVal ? '#166534' : '#92400E' }}>
                          Kit de Bienvenida
                        </h4>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 800,
                          padding: '0.1rem 0.45rem',
                          borderRadius: '12px',
                          backgroundColor: hasKitVal ? '#DCFCE7' : '#FEF3C7',
                          color: hasKitVal ? '#15803D' : '#B45309',
                          border: `1px solid ${hasKitVal ? '#86EFAC' : '#FCD34D'}`
                        }}>
                          {hasKitVal ? 'ENTREGADO' : 'PENDIENTE'}
                        </span>
                      </div>
                      {kitScan ? (
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#15803D' }}>
                          Entregado: {new Date(kitScan.timestamp).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'short', day: 'numeric', month: 'short' })} a las {new Date(kitScan.timestamp).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true })}
                          {kitScan.attendedBy ? ` • Por: ${kitScan.attendedBy}` : ''}
                        </p>
                      ) : (
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#B45309' }}>
                          El kit aún no ha sido marcado para este participante.
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                    {hasKitVal ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const kitIdx = cps.findIndex((c: any) => isKitName(c?.name))
                            if (kitIdx >= 0) handleOpenEditCheckpointDateTime(managingCheckpointsReg, kitIdx)
                          }}
                          style={{
                            padding: '0.4rem 0.8rem',
                            backgroundColor: '#FFFFFF',
                            color: '#1D4ED8',
                            border: '1px solid #BFDBFE',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem'
                          }}
                        >
                          <Edit3 size={13} />
                          <span>Ajustar Fecha/Hora</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleKit(managingCheckpointsReg, false)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FECACA',
                            borderRadius: '8px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Desmarcar
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenMarkCheckpoint(managingCheckpointsReg, 'Kit de Bienvenida')}
                        style={{
                          padding: '0.45rem 0.9rem',
                          backgroundColor: '#16A34A',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          boxShadow: '0 2px 5px rgba(22, 163, 74, 0.3)'
                        }}
                      >
                        <Plus size={14} />
                        <span>Marcar Kit Entregado</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. SECCIÓN REFRIGERIOS ORGANIZADOS POR DÍA */}
                {eventDaysList && eventDaysList.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {eventDaysList.map((dayItem: any, dayIdx: number) => {
                      return (
                        <div key={dayIdx} style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          padding: '1rem',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <Calendar size={16} color="#2563EB" />
                              <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>
                                {dayItem.day}
                              </h4>
                            </div>
                            <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                              {dayItem.meals.filter((m: string) => cps.some((c: any) => c.name === `${dayItem.day} - ${m}` || c.name === m)).length} de {dayItem.meals.length} entregados
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.65rem' }}>
                            {dayItem.meals.map((meal: string, mealIdx: number) => {
                              const targetCpName = `${dayItem.day} - ${meal}`
                              const existingIdx = cps.findIndex((c: any) => c.name === targetCpName || c.name === meal)
                              const isDelivered = existingIdx >= 0
                              const scanInfo = isDelivered ? cps[existingIdx] : null

                              return (
                                <div key={mealIdx} style={{
                                  backgroundColor: isDelivered ? '#F0FDF4' : '#F8FAFC',
                                  borderRadius: '10px',
                                  border: `1.5px solid ${isDelivered ? '#86EFAC' : '#E2E8F0'}`,
                                  padding: '0.75rem 0.85rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justifyContent: 'space-between',
                                  gap: '0.5rem'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.4rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                      <span style={{ fontSize: '1.2rem' }}>{getMealIcon(meal)}</span>
                                      <div>
                                        <div style={{ fontSize: '0.82rem', fontWeight: 800, color: isDelivered ? '#166534' : '#1E293B' }}>
                                          {meal}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748B' }}>
                                          {dayItem.day}
                                        </div>
                                      </div>
                                    </div>

                                    <span style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      padding: '0.1rem 0.4rem',
                                      borderRadius: '8px',
                                      backgroundColor: isDelivered ? '#DCFCE7' : '#F1F5F9',
                                      color: isDelivered ? '#15803D' : '#64748B',
                                      border: `1px solid ${isDelivered ? '#BBF7D0' : '#CBD5E1'}`
                                    }}>
                                      {isDelivered ? '✅ Listo' : '⏳ Pendiente'}
                                    </span>
                                  </div>

                                  {isDelivered && scanInfo ? (
                                    <div style={{ borderTop: '1px dashed #BBF7D0', paddingTop: '0.4rem' }}>
                                      <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: 600 }}>
                                        {new Date(scanInfo.timestamp).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(scanInfo.timestamp).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true })}
                                      </div>
                                      {scanInfo.attendedBy && (
                                        <div style={{ fontSize: '0.65rem', color: '#64748B', marginTop: '0.1rem' }}>
                                          Por: {scanInfo.attendedBy}
                                        </div>
                                      )}

                                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem' }}>
                                        <button
                                          type="button"
                                          onClick={() => handleOpenEditCheckpointDateTime(managingCheckpointsReg, existingIdx)}
                                          style={{
                                            flex: 1,
                                            padding: '0.25rem 0.4rem',
                                            backgroundColor: '#FFFFFF',
                                            color: '#1D4ED8',
                                            border: '1px solid #BFDBFE',
                                            borderRadius: '6px',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.2rem'
                                          }}
                                          title="Modificar fecha y hora de entrega"
                                        >
                                          <Edit3 size={11} />
                                          <span>Ajustar Fecha</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveCheckpoint(managingCheckpointsReg.id, existingIdx)}
                                          style={{
                                            padding: '0.25rem 0.45rem',
                                            backgroundColor: '#FEF2F2',
                                            color: '#DC2626',
                                            border: '1px solid #FECACA',
                                            borderRadius: '6px',
                                            fontSize: '0.7rem',
                                            fontWeight: 700,
                                            cursor: 'pointer'
                                          }}
                                          title="Desmarcar entrega"
                                        >
                                          <Trash2 size={11} />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '0.4rem' }}>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenMarkCheckpoint(managingCheckpointsReg, targetCpName)}
                                        style={{
                                          width: '100%',
                                          padding: '0.35rem 0.6rem',
                                          backgroundColor: '#EFF6FF',
                                          color: '#1D4ED8',
                                          border: '1px solid #BFDBFE',
                                          borderRadius: '6px',
                                          fontSize: '0.75rem',
                                          fontWeight: 700,
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: '0.3rem'
                                        }}
                                      >
                                        <Plus size={13} />
                                        <span>Marcar Entrega</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  /* Flat Checkpoints List fallback */
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.75rem' }}>
                    {eventCheckpoints.filter((cp: string) => !isKitName(cp)).map((cpName: string, cpIdx: number) => {
                      const existingIdx = cps.findIndex((c: any) => c.name === cpName)
                      const isDelivered = existingIdx >= 0
                      const scanInfo = isDelivered ? cps[existingIdx] : null

                      return (
                        <div key={cpIdx} style={{
                          backgroundColor: isDelivered ? '#F0FDF4' : '#F8FAFC',
                          borderRadius: '10px',
                          border: `1.5px solid ${isDelivered ? '#86EFAC' : '#CBD5E1'}`,
                          padding: '0.85rem',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '0.5rem'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span>{getMealIcon(cpName)}</span>
                              <strong style={{ fontSize: '0.85rem', color: isDelivered ? '#166534' : '#0F172A' }}>{cpName}</strong>
                            </div>
                            <span style={{
                              fontSize: '0.7rem',
                              fontWeight: 800,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '8px',
                              backgroundColor: isDelivered ? '#DCFCE7' : '#F1F5F9',
                              color: isDelivered ? '#15803D' : '#64748B'
                            }}>
                              {isDelivered ? '✅ Listo' : '⏳ Pendiente'}
                            </span>
                          </div>

                          {isDelivered && scanInfo ? (
                            <div style={{ borderTop: '1px dashed #BBF7D0', paddingTop: '0.4rem' }}>
                              <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>
                                {new Date(scanInfo.timestamp).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', weekday: 'short', day: 'numeric', month: 'short' })} • {new Date(scanInfo.timestamp).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: true })}
                              </div>
                              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem' }}>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditCheckpointDateTime(managingCheckpointsReg, existingIdx)}
                                  className="btn btn-outline"
                                  style={{ flex: 1, padding: '0.25rem 0.4rem', fontSize: '0.7rem', fontWeight: 700 }}
                                >
                                  <Edit3 size={11} /> Ajustar Fecha
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCheckpoint(managingCheckpointsReg.id, existingIdx)}
                                  style={{ padding: '0.25rem 0.45rem', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer' }}
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenMarkCheckpoint(managingCheckpointsReg, cpName)}
                              style={{
                                width: '100%',
                                padding: '0.35rem 0.6rem',
                                backgroundColor: '#EFF6FF',
                                color: '#1D4ED8',
                                border: '1px solid #BFDBFE',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.3rem'
                              }}
                            >
                              <Plus size={13} />
                              <span>Marcar Entrega</span>
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 3. MARCAR PUNTO ADICIONAL O PERSONALIZADO */}
                <div style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '12px',
                  padding: '1rem',
                  border: '1px dashed #CBD5E1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem'
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#475569', display: 'block', marginBottom: '0.25rem' }}>
                      + Marcar Entrega Adicional o Punto Especial:
                    </label>
                    <input
                      type="text"
                      value={customCheckpointInput}
                      onChange={e => setCustomCheckpointInput(e.target.value)}
                      placeholder="Ej: Refrigerio Extra, Certificado, etc."
                      style={{
                        width: '100%',
                        padding: '0.45rem 0.75rem',
                        fontSize: '0.82rem',
                        borderRadius: '6px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const clean = customCheckpointInput.trim()
                      if (!clean) {
                        showToast('error', 'Escribe el nombre del punto o refrigerio adicional.')
                        return
                      }
                      handleOpenMarkCheckpoint(managingCheckpointsReg, clean)
                      setCustomCheckpointInput('')
                    }}
                    style={{
                      padding: '0.5rem 1rem',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      alignSelf: 'flex-end',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Plus size={14} />
                    <span>Continuar y Elegir Fecha</span>
                  </button>
                </div>

              </div>

              {/* Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  Total entregas de este asistente: <strong>{totalDelivered}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => setManagingCheckpointsReg(null)}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, backgroundColor: '#0F172A' }}
                >
                  Listo / Cerrar
                </button>
              </div>

            </div>
          </div>
        )
      })()}

      {/* ================= MODAL: AJUSTAR FECHA Y HORA DE MARCADO ================= */}
      {markingModal && (() => {
        const pName = [
          markingModal.reg.person?.firstName,
          markingModal.reg.person?.middleName,
          markingModal.reg.person?.lastName,
          markingModal.reg.person?.secondLastName
        ].filter(Boolean).join(' ')

        // Preset event days
        const eventDays = eventDaysList.map((d: any) => d.day)

        // Helper to quickly change date to a preset day
        const applyDayPreset = (dayName: string) => {
          const matchDay = dayName.match(/\b(2[0-9]|1[0-9]|[1-9])\b/)
          if (matchDay) {
            const dayNum = matchDay[1].padStart(2, '0')
            const currentParts = (markingModal.dateTimeValue || '').split('T')
            const currentHour = currentParts[1] || '10:30'
            setMarkingModal({
              ...markingModal,
              dateTimeValue: `2026-10-${dayNum}T${currentHour}`
            })
          }
        }

        const applyNow = () => {
          setMarkingModal({
            ...markingModal,
            dateTimeValue: toDatetimeLocalValue(new Date())
          })
        }

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem'
          }}>
            <div className="animate-fade-in" style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
              overflow: 'hidden'
            }}>
              
              {/* Header */}
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#F8FAFC'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={20} color="#2563EB" />
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                      {markingModal.isEdit ? 'Modificar Fecha y Hora' : 'Marcar Entrega'}
                    </h3>
                    <p style={{ margin: '0.15rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
                      {markingModal.checkpointName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMarkingModal(null)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
                >
                  <X size={22} />
                </button>
              </div>

              {/* Form Body */}
              <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* Attendee Info Banner */}
                <div style={{ backgroundColor: '#F1F5F9', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase' }}>Participante:</span>
                  <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A' }}>{pName}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B' }}>
                    {markingModal.reg.person?.documentType} {markingModal.reg.person?.documentNumber}
                  </div>
                </div>

                {/* Date & Time Picker */}
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1E293B', display: 'block', marginBottom: '0.4rem' }}>
                    📅 Fecha y Hora de la Entrega: *
                  </label>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0 0 0.5rem 0' }}>
                    Indica el momento exacto en que se entregó (puedes elegir cualquier día u hora pasada):
                  </p>
                  <input
                    type="datetime-local"
                    value={markingModal.dateTimeValue}
                    onChange={e => setMarkingModal({ ...markingModal, dateTimeValue: e.target.value })}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.85rem',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      borderRadius: '8px',
                      border: '2px solid #2563EB',
                      backgroundColor: '#FFFFFF',
                      color: '#0F172A',
                      outline: 'none'
                    }}
                  />

                  {/* Quick Preset Buttons */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.6rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginRight: '0.2rem' }}>
                      Acceso rápido:
                    </span>
                    <button
                      type="button"
                      onClick={applyNow}
                      style={{
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#334155'
                      }}
                    >
                      ⏱️ Ahora mismo
                    </button>

                    {eventDays.map((dayName: string, dIdx: number) => (
                      <button
                        key={dIdx}
                        type="button"
                        onClick={() => applyDayPreset(dayName)}
                        style={{
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: '#EFF6FF',
                          border: '1px solid #BFDBFE',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          color: '#1D4ED8'
                        }}
                      >
                        📅 {dayName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Operator / Attended By */}
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '0.35rem' }}>
                    👤 Registrado / Atendido por:
                  </label>
                  <input
                    type="text"
                    value={markingModal.attendedBy}
                    onChange={e => setMarkingModal({ ...markingModal, attendedBy: e.target.value })}
                    placeholder="Ej: Administrador, Operador, etc."
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.85rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1'
                    }}
                  />
                </div>

              </div>

              {/* Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                backgroundColor: '#F8FAFC'
              }}>
                <button
                  type="button"
                  onClick={() => setMarkingModal(null)}
                  className="btn btn-outline"
                  style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem', fontWeight: 600 }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveCheckpointDateTime}
                  className="btn btn-primary"
                  style={{
                    padding: '0.55rem 1.35rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    backgroundColor: '#16A34A',
                    borderColor: '#16A34A',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    boxShadow: '0 2px 5px rgba(22, 163, 74, 0.3)'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{markingModal.isEdit ? 'Actualizar Fecha y Hora' : 'Confirmar y Guardar Entrega'}</span>
                </button>
              </div>

            </div>
          </div>
        )
      })()}

    </div>
  )
}
