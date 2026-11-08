import Link from 'next/link'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { ArrowLeft, ExternalLink, Users, QrCode, Printer, FileSpreadsheet, CheckCircle2, UserCheck, Shield } from 'lucide-react'
import CopyLink from './CopyLink'
import DeleteEventButton from './DeleteEventButton'
import RegistrationsTable from './RegistrationsTable'
import MunicipalityQuotaManager from './MunicipalityQuotaManager'
import EmailAccessManager from './EmailAccessManager'
import EventCheckpointsManager from './EventCheckpointsManager'
import EventMetricsCards from './EventMetricsCards'

export const instant = false

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        include: {
          person: true
        },
        orderBy: { registeredAt: 'desc' }
      }
    }
  })

  if (!event) {
    redirect('/admin/events')
  }

  const attendedCount = event.registrations.filter(r => r.status === 'ASISTIO').length
  const pendingCount = event.registrations.filter(r => r.status === 'REGISTRADO').length

  // Calculate municipality registrations and quotas
  const registrationsByMunicipality: Record<string, number> = {}
  event.registrations.forEach(r => {
    const m = r.person?.municipality
    if (m) {
      registrationsByMunicipality[m] = (registrationsByMunicipality[m] || 0) + 1
    }
  })

  let municipalityQuotas: Record<string, number> = {}
  let restrictedByEmail = false
  let allowedEmails: string[] = []
  let checkpoints: string[] = ['Ingreso']
  let dailySchedule: any = null
  let eventHasKit = true

  const isKit = (n: string) => {
    if (!n) return false
    const norm = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    return norm.includes('kit') || norm.includes('bienvenida')
  }

  try {
    const parsed = event.requiredFields ? JSON.parse(event.requiredFields) : {}
    municipalityQuotas = parsed.municipalityQuotas || {}
    restrictedByEmail = Boolean(parsed.restrictedByEmail)
    allowedEmails = Array.isArray(parsed.allowedEmails) ? parsed.allowedEmails : []
    checkpoints = Array.isArray(parsed.checkpoints) ? [...parsed.checkpoints] : ['Ingreso']
    dailySchedule = parsed.dailySchedule || null
    if (parsed.hasKit === false) {
      eventHasKit = false
      checkpoints = checkpoints.filter(cp => !isKit(cp))
    }
  } catch (e) {}

  // Discover any checkpoints present across registrations so they are never lost from dashboard & metrics
  event.registrations.forEach(r => {
    if (!r.checkpoints) return
    try {
      const cps = typeof r.checkpoints === 'string' ? JSON.parse(r.checkpoints) : r.checkpoints
      if (Array.isArray(cps)) {
        cps.forEach((c: any) => {
          if (c?.name && typeof c.name === 'string') {
            const trimmed = c.name.trim()
            if (trimmed) {
              if (isKit(trimmed)) {
                if (eventHasKit && !checkpoints.includes(trimmed)) checkpoints.push(trimmed)
              } else if (!checkpoints.includes(trimmed)) {
                checkpoints.push(trimmed)
              }
            }
          }
        })
      }
    } catch {}
  })

  // Calculate checkpoints stats
  const checkpointStats: Record<string, number> = {}
  checkpoints.forEach(cpName => {
    checkpointStats[cpName] = 0
  })

  let attendedWithoutIngreso = 0
  event.registrations.forEach(r => {
    let cps: any[] = []
    if (r.checkpoints) {
      try {
        cps = typeof r.checkpoints === 'string' ? JSON.parse(r.checkpoints) : r.checkpoints
        if (!Array.isArray(cps)) cps = []
      } catch(e) {
        cps = []
      }
    }

    const hasIngreso = cps.some((c: any) => c && c.name === 'Ingreso')
    if (r.status === 'ASISTIO' && !hasIngreso) {
      attendedWithoutIngreso++
    }

    cps.forEach((cp: any) => {
      if (cp && cp.name) {
        const key = isKit(cp.name) ? 'Kit de Bienvenida' : cp.name
        checkpointStats[key] = (checkpointStats[key] || 0) + 1
      }
    })
  })

  return (
    <div>
      {/* Top Breadcrumb & Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <Link href="/admin/events" className="btn btn-outline" style={{ padding: '0.5rem', display: 'flex', alignItems: 'center' }}>
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: 0, color: '#0F172A', letterSpacing: '-0.02em' }}>
              {event.name}
            </h1>
            <span className={`badge ${event.status === 'ABIERTO' ? 'badge-success' : 'badge-neutral'}`}>
              {event.status}
            </span>
          </div>
          {event.location && (
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.25rem 0 0' }}>
              📍 {event.location} • Inicio: {new Date(event.startDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
          <Link href={`/admin/events/${event.id}/edit`} className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', fontWeight: 600 }}>
            Editar Evento
          </Link>
          <DeleteEventButton eventId={event.id} eventName={event.name} />
        </div>
      </div>

      {/* LIVE METRICS & QUICK ACTION CARDS */}
      <EventMetricsCards
        eventId={event.id}
        initialTotal={event.registrations.length}
        initialAttended={attendedCount}
        initialPending={pendingCount}
        initialCheckpoints={checkpointStats}
        initialConfiguredCheckpoints={checkpoints}
        initialAttendedWithoutIngreso={attendedWithoutIngreso}
        eventRequiredFields={event.requiredFields || undefined}
      />

      {/* CHECKPOINTS & DAILY MEALS SCHEDULE MANAGER */}
      <div style={{ marginBottom: '1.25rem' }}>
        <EventCheckpointsManager
          eventId={event.id}
          eventName={event.name}
          initialCheckpoints={checkpoints}
          initialDailySchedule={dailySchedule}
        />
      </div>

      {/* EMAIL ACCESS CONTROL (WHITELIST) MANAGER */}
      <div style={{ marginBottom: '1.25rem' }}>
        <EmailAccessManager
          eventId={event.id}
          eventName={event.name}
          initialRestricted={restrictedByEmail}
          initialEmails={allowedEmails}
        />
      </div>

      {/* MUNICIPALITY QUOTAS MANAGER WIDGET */}
      <div style={{ marginBottom: '2rem' }}>
        <MunicipalityQuotaManager
          eventId={event.id}
          eventName={event.name}
          initialQuotas={municipalityQuotas}
          registrationsByMunicipality={registrationsByMunicipality}
        />
      </div>

      {/* PARTICIPANTS TABLE CONTAINER */}
      <div className="card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>Participantes Inscritos</h2>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
              Búsqueda en tiempo real, edición de datos personales, eliminación de registros e impresión de stickers QR.
            </p>
          </div>
          
          {event.registrations.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link href={`/admin/events/${event.id}/report`} prefetch={false} target="_blank" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#EFF6FF', borderColor: '#BFDBFE', color: '#1D4ED8', fontSize: '0.85rem', padding: '0.5rem 0.85rem', fontWeight: 700 }}>
                <FileSpreadsheet size={16} />
                Generar Fichas (PDF)
              </Link>
              <a href={`/api/events/${event.id}/export`} download="Reporte_Participantes.xlsx" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 0.85rem', fontWeight: 700, textDecoration: 'none' }}>
                <FileSpreadsheet size={16} color="var(--success)" />
                Descargar Base de Datos (Excel)
              </a>
            </div>
          )}
        </div>

        {/* Client Interactive Table */}
        <RegistrationsTable 
          eventId={event.id} 
          initialRegistrations={event.registrations} 
          eventRequiredFields={event.requiredFields}
        />
      </div>
    </div>
  )
}

