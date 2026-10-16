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
  RotateCw
} from 'lucide-react'

const MUNICIPIOS_NDS = [
  'Ábrego', 'Arboledas', 'Bochalema', 'Bucarasica', 'Cáchira', 'Cácota', 'Chinácota', 'Chitagá', 'Convención', 'Cúcuta',
  'Cucutilla', 'Durania', 'El Carmen', 'El Tarra', 'El Zulia', 'Gramalote', 'Hacarí', 'Herrán', 'La Esperanza', 'La Playa de Belén',
  'Labateca', 'Los Patios', 'Lourdes', 'Mutiscua', 'Ocaña', 'Pamplona', 'Pamplonita', 'Puerto Santander', 'Ragonvalia', 'Salazar de Las Palmas',
  'San Calixto', 'San Cayetano', 'Santiago', 'Sardinata', 'Silos', 'Teorama', 'Tibú', 'Toledo', 'Villa Caro', 'Villa del Rosario'
]

export default function RegistrationsTable({ 
  eventId, 
  initialRegistrations 
}: { 
  eventId: string, 
  initialRegistrations: any[] 
}) {
  const router = useRouter()
  const [registrations, setRegistrations] = useState(initialRegistrations)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ASISTIO' | 'REGISTRADO' | 'CANCELADO'>('ALL')
  
  // Modals state
  const [editingReg, setEditingReg] = useState<any | null>(null)
  const [deletingReg, setDeletingReg] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Upload photo inside edit modal
  const [uploadingModalPhoto, setUploadingModalPhoto] = useState(false)
  const fileInputModalRef = useRef<HTMLInputElement>(null)

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

  // Filter registrations
  const filtered = useMemo(() => {
    return registrations.filter(r => {
      // Status filter
      if (statusFilter !== 'ALL' && r.status !== statusFilter) {
        return false
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
  }, [registrations, search, statusFilter])

  // Count stats
  const totalCount = registrations.length
  const attendedCount = registrations.filter(r => r.status === 'ASISTIO').length
  const registeredCount = registrations.filter(r => r.status === 'REGISTRADO').length
  const cancelledCount = registrations.filter(r => r.status === 'CANCELADO').length

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
      fotoIngreso: photoUrl
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

  return (
    <div>
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

                    {/* Fecha Registro */}
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748B' }}>
                      {new Date(reg.registeredAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>

                    {/* Acciones */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        
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

                        {/* Editar */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(reg)}
                          title="Editar Participante"
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
          zIndex: 100,
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
          zIndex: 100,
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

    </div>
  )
}
