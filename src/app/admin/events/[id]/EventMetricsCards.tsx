"use client"

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Users, UserCheck, QrCode, Printer, ExternalLink, RefreshCw, Utensils, CheckCircle2, Clock, Sparkles, Filter, Trash2 } from 'lucide-react'
import CopyLink from './CopyLink'

interface EventMetricsCardsProps {
  eventId: string
  initialTotal: number
  initialAttended: number
  initialPending: number
  initialCheckpoints: Record<string, number>
  initialConfiguredCheckpoints?: string[]
  initialAttendedWithoutIngreso?: number
  eventRequiredFields?: string
}

export default function EventMetricsCards({
  eventId,
  initialTotal,
  initialAttended,
  initialPending,
  initialCheckpoints,
  initialConfiguredCheckpoints = ['Ingreso'],
  initialAttendedWithoutIngreso = 0,
  eventRequiredFields
}: EventMetricsCardsProps) {
  const [total, setTotal] = useState(initialTotal)
  const [attended, setAttended] = useState(initialAttended)
  const [pending, setPending] = useState(initialPending)
  const [checkpoints, setCheckpoints] = useState<Record<string, number>>(initialCheckpoints)
  const [configuredCheckpoints, setConfiguredCheckpoints] = useState<string[]>(initialConfiguredCheckpoints)
  const [attendedWithoutIngreso, setAttendedWithoutIngreso] = useState(initialAttendedWithoutIngreso)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSyncingIngreso, setIsSyncingIngreso] = useState(false)
  const [isClearingKits, setIsClearingKits] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>('')

  // Sync state if props change from server
  useEffect(() => {
    setTotal(initialTotal)
    setAttended(initialAttended)
    setPending(initialPending)
    setCheckpoints(initialCheckpoints)
    if (initialConfiguredCheckpoints && initialConfiguredCheckpoints.length > 0) {
      setConfiguredCheckpoints(initialConfiguredCheckpoints)
    }
    setAttendedWithoutIngreso(initialAttendedWithoutIngreso)
  }, [initialTotal, initialAttended, initialPending, initialCheckpoints, initialConfiguredCheckpoints, initialAttendedWithoutIngreso])

  // Direct live fetch from API
  const fetchLatestStats = async (showLoading = false) => {
    if (showLoading) setIsRefreshing(true)
    try {
      const res = await fetch(`/api/events/${eventId}/registrations?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
      })
      if (!res.ok) return
      const data = await res.json()
      if (data.stats) {
        if (typeof data.stats.totalCount === 'number') setTotal(data.stats.totalCount)
        if (typeof data.stats.attendedCount === 'number') setAttended(data.stats.attendedCount)
        if (typeof data.stats.pendingCount === 'number') setPending(data.stats.pendingCount)
        if (data.stats.checkpointStats) setCheckpoints(data.stats.checkpointStats)
        if (Array.isArray(data.stats.configuredCheckpoints) && data.stats.configuredCheckpoints.length > 0) {
          setConfiguredCheckpoints(data.stats.configuredCheckpoints)
        }
        if (typeof data.stats.attendedWithoutIngreso === 'number') {
          setAttendedWithoutIngreso(data.stats.attendedWithoutIngreso)
        }
        setLastSyncTime(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
      }
    } catch (e) {
      console.error('Error fetching live event metrics:', e)
    } finally {
      if (showLoading) setIsRefreshing(false)
    }
  }

  // Fetch immediately on mount & poll every 3.5 seconds
  useEffect(() => {
    setLastSyncTime(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    fetchLatestStats(false)
    const interval = setInterval(() => {
      fetchLatestStats(false)
    }, 3500)
    return () => clearInterval(interval)
  }, [eventId])

  // Listen for real-time broadcasts from table actions
  useEffect(() => {
    const handleSync = (e: any) => {
      const stats = e.detail
      if (!stats) return
      if (typeof stats.totalCount === 'number') setTotal(stats.totalCount)
      if (typeof stats.attendedCount === 'number') setAttended(stats.attendedCount)
      if (typeof stats.pendingCount === 'number') setPending(stats.pendingCount)
      if (stats.checkpointStats) setCheckpoints(stats.checkpointStats)
      if (Array.isArray(stats.configuredCheckpoints)) setConfiguredCheckpoints(stats.configuredCheckpoints)
      if (typeof stats.attendedWithoutIngreso === 'number') setAttendedWithoutIngreso(stats.attendedWithoutIngreso)
      setLastSyncTime(new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }

    window.addEventListener('registrations-live-sync', handleSync)
    return () => window.removeEventListener('registrations-live-sync', handleSync)
  }, [])

  // Sincronizar Ingreso para todos los asistentes verificados
  const handleSyncIngreso = async () => {
    if (!confirm(`¿Deseas agregar el punto "Ingreso" a los ${attendedWithoutIngreso} asistentes que tienen estado ASISTIÓ pero no tienen Ingreso registrado?\n\nEsto hará que el contador de "Ingreso" sea igual a ${attended} (Asistentes Verificados).`)) {
      return
    }

    setIsSyncingIngreso(true)
    try {
      const res = await fetch(`/api/events/${eventId}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_ingreso' })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al sincronizar ingresos')

      alert(`✅ ¡Sincronización exitosa!\n${data.message || 'Puntos de ingreso agregados correctamente.'}`)
      await fetchLatestStats(true)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('registrations-refreshed'))
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`)
    } finally {
      setIsSyncingIngreso(false)
    }
  }

  // Helper: check if checkpoint is kit
  const isKit = (name: string) => {
    if (!name) return false
    const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    return n.includes('kit') || n.includes('bienvenida')
  }

  // Check if event explicitly has kit configured
  const eventHasKit = useMemo(() => {
    try {
      const parsed = eventRequiredFields ? JSON.parse(eventRequiredFields) : {}
      if (parsed.hasKit === false) return false
      if (parsed.hasKit === true) return true
      if (Array.isArray(parsed.checkpoints)) {
        return parsed.checkpoints.some((c: string) => isKit(c))
      }
      return configuredCheckpoints.some(c => isKit(c))
    } catch {
      return configuredCheckpoints.some(c => isKit(c))
    }
  }, [eventRequiredFields, configuredCheckpoints])

  // Desmarcar todos los kits para este evento
  const handleClearKits = async () => {
    const kitCount = checkpoints['Kit de Bienvenida'] || 0
    if (!confirm(`¿Deseas desmarcar el Kit de Bienvenida para todos los participantes de este evento?\n\nEsta acción eliminará el registro de kit para ${kitCount > 0 ? kitCount + ' participante(s)' : 'todos'} y desactivará el Kit para este evento.`)) {
      return
    }
    setIsClearingKits(true)
    try {
      const res = await fetch(`/api/events/${eventId}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_kits' })
      })
      const data = await res.json()
      if (res.ok) {
        alert(`✅ ${data.message}`)
        fetchLatestStats(true)
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('registrations-refreshed'))
        }
      } else {
        alert(`❌ ${data.error || 'Error al desmarcar kits'}`)
      }
    } catch (err: any) {
      alert(`❌ Error de conexión: ${err.message}`)
    } finally {
      setIsClearingKits(false)
    }
  }

  // Helper: icon according to delivery type
  const getCheckpointIcon = (name: string) => {
    const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    if (n.includes('kit') || n.includes('bienvenida')) return '🎒'
    if (n.includes('ingreso') || n.includes('puerta') || n.includes('entrada')) return '🚪'
    if (n.includes('desayuno')) return '☕'
    if (n.includes('almuerzo')) return '🍽️'
    if (n.includes('cena')) return '🍲'
    if (n.includes('refrigerio')) return '🍪'
    return '📍'
  }

  // Combined list of all checkpoints to display (configured + any that exist in DB)
  const allCheckpointNames = useMemo(() => {
    const set = new Set<string>()

    // Add configured checkpoints
    configuredCheckpoints.forEach(cp => {
      if (isKit(cp)) {
        if (eventHasKit) set.add('Kit de Bienvenida')
      } else {
        set.add(cp)
      }
    })

    // Add recorded checkpoints from registrations
    Object.keys(checkpoints).forEach(k => {
      if (isKit(k)) {
        // Only include Kit if event has it OR there are actual deliveries recorded
        if (eventHasKit || (checkpoints[k] || 0) > 0) {
          set.add('Kit de Bienvenida')
        }
      } else {
        set.add(k)
      }
    })

    const arr = Array.from(set)
    arr.sort((a, b) => {
      if (a === 'Ingreso') return -1
      if (b === 'Ingreso') return 1
      const aIsKit = isKit(a)
      const bIsKit = isKit(b)
      if (aIsKit && !bIsKit) return -1
      if (!aIsKit && bIsKit) return 1
      return a.localeCompare(b)
    })
    return arr
  }, [configuredCheckpoints, checkpoints, eventHasKit])

  // Total deliveries performed across all checkpoints
  const totalDeliveriesPerformed = useMemo(() => {
    return Object.values(checkpoints).reduce((acc, count) => acc + (typeof count === 'number' ? count : 0), 0)
  }, [checkpoints])

  // Trigger filtering in table and scroll down
  const handleFilterInTable = (cpName: string, status: 'DELIVERED' | 'PENDING') => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('filter-by-checkpoint', {
        detail: { name: cpName, status }
      }))
      const tableElem = document.getElementById('participants-table-container')
      if (tableElem) {
        tableElem.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <div style={{ marginBottom: '2rem' }}>
      
      {/* 3 TOP HIGH-LEVEL CARDS */}
      <div className="grid md:grid-cols-3 gap-4 mb-4">
        
        {/* Metric 1: Total Registrations */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #3B82F6', borderRadius: '14px', padding: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Inscritos</h3>
              <Users size={22} color="#3B82F6" />
            </div>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.4rem 0', color: '#1E293B' }}>{total}</p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '0.5rem' }}>
            <span>Pendientes por ingresar:</span>
            <strong style={{ color: '#2563EB', fontWeight: 800 }}>{pending}</strong>
          </div>
        </div>

        {/* Metric 2: Verified Attendees */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #10B981', borderRadius: '14px', padding: '1.25rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase' }}>Asistentes Verificados</h3>
              <UserCheck size={22} color="#10B981" />
            </div>
            <p style={{ fontSize: '2.5rem', fontWeight: 800, margin: '0.4rem 0', color: 'var(--success)' }}>{attended}</p>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '0.5rem' }}>
            <span>Entregas registradas: <strong style={{ color: '#0F172A' }}>{totalDeliveriesPerformed}</strong></span>
            <button
              type="button"
              onClick={() => fetchLatestStats(true)}
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                cursor: 'pointer',
                color: '#1D4ED8',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.2rem 0.5rem',
                borderRadius: '6px'
              }}
              title="Refrescar números en vivo"
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>

        {/* Action Panel: Links and QR Operations */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center', borderRadius: '14px', padding: '1.25rem' }}>
          <Link href={`/admin/events/${eventId}/scanner`} className="btn btn-success w-full" style={{ justifyContent: 'space-between', padding: '0.75rem 1rem', fontWeight: 800 }}>
            <span>Abrir Escáner QR (PWA)</span>
            <QrCode size={18} />
          </Link>
          <Link href={`/event/${eventId}/register?mode=onsite`} target="_blank" className="btn btn-primary w-full" style={{ justifyContent: 'space-between', padding: '0.65rem 1rem', fontWeight: 700 }}>
            <span>Formulario en Sitio (Foto + QR)</span>
            <Printer size={18} />
          </Link>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href={`/event/${eventId}/register`} target="_blank" className="btn btn-outline" style={{ flex: 1, justifyContent: 'space-between', fontSize: '0.78rem', padding: '0.45rem 0.65rem' }}>
              <span>Pre-Registro</span>
              <ExternalLink size={13} />
            </Link>
            <CopyLink url={`/event/${eventId}/register`} />
          </div>
        </div>

      </div>

      {/* FULL COMPREHENSIVE DELIVERIES & CHECKPOINTS CONTROL BOARD */}
      <div className="card" style={{ borderRadius: '16px', padding: '1.5rem', border: '1px solid #E2E8F0', boxShadow: '0 4px 15px rgba(0,0,0,0.03)' }}>
        
        {/* Header with Title and Live Sync */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.85rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.4rem' }}>📊</span>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                Tablero de Control de Entregas y Refrigerios en Vivo
              </h2>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#64748B' }}>
              Monitoreo en tiempo real de cada punto de entrega frente a los <strong>{attended}</strong> asistentes verificados.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            {lastSyncTime && (
              <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Clock size={13} color="#10B981" />
                Sincronizado: <strong>{lastSyncTime}</strong>
              </span>
            )}
            <button
              type="button"
              onClick={() => fetchLatestStats(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 5px rgba(37,99,235,0.2)'
              }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              <span>{isRefreshing ? 'Actualizando...' : 'Actualizar Tablero'}</span>
            </button>
          </div>
        </div>

        {/* Informative Diagnostic Banner if Ingreso differs from Asistentes Verificados */}
        {attendedWithoutIngreso > 0 && (
          <div style={{
            backgroundColor: '#FFFBEB',
            border: '1.5px solid #FDE68A',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', flex: 1, minWidth: '280px' }}>
              <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>💡</span>
              <div style={{ fontSize: '0.84rem', color: '#92400E', lineHeight: '1.45' }}>
                <strong>¿Por qué "Ingreso" marca {checkpoints['Ingreso'] || 0} si hay {attended} Asistentes Verificados?</strong>
                <p style={{ margin: '0.25rem 0 0', color: '#78350F' }}>
                  Hay <strong>{attended}</strong> participantes que asistieron al evento (fueron escaneados en estaciones de refrigerio/almuerzo o marcados con estado <em>ASISTIÓ</em>). De ellos, <strong>{checkpoints['Ingreso'] || 0}</strong> fueron registrados específicamente en el punto de puerta <em>"Ingreso"</em> y <strong>{attendedWithoutIngreso}</strong> llegaron directamente a las entregas de comida.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSyncIngreso}
              disabled={isSyncingIngreso}
              style={{
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 0.95rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: isSyncingIngreso ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.25)',
                whiteSpace: 'nowrap'
              }}
              title="Asigna el punto de Ingreso a todos los que ya tienen estado ASISTIÓ"
            >
              <Sparkles size={14} />
              <span>{isSyncingIngreso ? 'Sincronizando...' : `⚡ Sincronizar Ingreso para los ${attended} Asistentes`}</span>
            </button>
          </div>
        )}

        {/* Informative Diagnostic Banner if Kit is recorded on an event that does not use Kit */}
        {(!eventHasKit && (checkpoints['Kit de Bienvenida'] || 0) > 0) && (
          <div style={{
            backgroundColor: '#FEF2F2',
            border: '1.5px solid #FECACA',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flex: 1, minWidth: '280px' }}>
              <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>⚠️</span>
              <div style={{ fontSize: '0.84rem', color: '#991B1B', lineHeight: '1.45' }}>
                <strong>Este evento no incluye Kit de Bienvenida</strong>
                <p style={{ margin: '0.2rem 0 0', color: '#B91C1C' }}>
                  Se registran <strong>{checkpoints['Kit de Bienvenida'] || 0}</strong> entregas de Kit marcadas. Puedes desmarcar todos los kits de este evento con un solo clic.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearKits}
              disabled={isClearingKits}
              style={{
                backgroundColor: '#DC2626',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 0.95rem',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: isClearingKits ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.25)',
                whiteSpace: 'nowrap'
              }}
              title="Desmarcar todos los kits de este evento"
            >
              <Trash2 size={14} />
              <span>{isClearingKits ? 'Desmarcando kits...' : `🧹 Desmarcar todos los Kits (${checkpoints['Kit de Bienvenida'] || 0})`}</span>
            </button>
          </div>
        )}

        {/* GRID OF CHECKPOINT DELIVERY METRICS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
          {allCheckpointNames.map(cpName => {
            const delivered = checkpoints[cpName] || 0
            const percentage = attended > 0 ? Math.round((delivered / attended) * 100) : 0
            const pendingForDelivery = Math.max(0, attended - delivered)
            const icon = getCheckpointIcon(cpName)
            const isKitItem = isKit(cpName)
            const isKitDisabledInEvent = isKitItem && !eventHasKit

            return (
              <div
                key={cpName}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: isKitDisabledInEvent ? '1.5px dashed #FCA5A5' : '1.5px solid #E2E8F0',
                  padding: '1.1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                {/* Top card info */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.4rem' }}>{icon}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>
                            {cpName}
                          </h4>
                          {isKitDisabledInEvent && (
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, backgroundColor: '#FEE2E2', color: '#DC2626', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>
                              No aplica
                            </span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#64748B' }}>
                          {isKitDisabledInEvent ? 'Desactivado en este evento' : 'Punto de control'}
                        </span>
                      </div>
                    </div>

                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '12px',
                      backgroundColor: delivered > 0 ? '#DCFCE7' : '#F1F5F9',
                      color: delivered > 0 ? '#15803D' : '#64748B',
                      border: `1px solid ${delivered > 0 ? '#86EFAC' : '#CBD5E1'}`
                    }}>
                      {percentage}%
                    </span>
                  </div>

                  {/* Big Number Counters */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', margin: '0.75rem 0 0.35rem' }}>
                    <span style={{ fontSize: '2.1rem', fontWeight: 800, color: delivered > 0 ? '#0F172A' : '#94A3B8' }}>
                      {delivered}
                    </span>
                    <span style={{ fontSize: '0.9rem', color: '#64748B', fontWeight: 600 }}>
                      / {attended} asistentes
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden', margin: '0.4rem 0' }}>
                    <div
                      style={{
                        width: `${Math.min(100, percentage)}%`,
                        height: '100%',
                        backgroundColor: percentage >= 80 ? '#10B981' : percentage >= 40 ? '#3B82F6' : '#F59E0B',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748B' }}>
                    <span>Entregados: <strong style={{ color: '#15803D' }}>{delivered}</strong></span>
                    <span>Faltan: <strong style={{ color: '#B45309' }}>{pendingForDelivery}</strong></span>
                  </div>
                </div>

                {/* Quick Interactive Filter Buttons */}
                <div style={{ display: 'flex', gap: '0.4rem', borderTop: '1px solid #F1F5F9', paddingTop: '0.65rem' }}>
                  <button
                    type="button"
                    onClick={() => handleFilterInTable(cpName, 'DELIVERED')}
                    style={{
                      flex: 1,
                      backgroundColor: '#F0FDF4',
                      border: '1px solid #BBF7D0',
                      color: '#15803D',
                      borderRadius: '6px',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}
                    title={`Ver en la tabla los ${delivered} que recibieron ${cpName}`}
                  >
                    <CheckCircle2 size={12} />
                    <span>Ver {delivered}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleFilterInTable(cpName, 'PENDING')}
                    style={{
                      flex: 1,
                      backgroundColor: '#FEF3C7',
                      border: '1px solid #FDE68A',
                      color: '#92400E',
                      borderRadius: '6px',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.25rem'
                    }}
                    title={`Ver en la tabla los ${pendingForDelivery} a quienes les falta ${cpName}`}
                  >
                    <Clock size={12} />
                    <span>Faltan {pendingForDelivery}</span>
                  </button>
                </div>

              </div>
            )
          })}
        </div>

      </div>

    </div>
  )
}
