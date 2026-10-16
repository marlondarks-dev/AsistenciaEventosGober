import Link from 'next/link'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { ArrowLeft, ExternalLink, Users, QrCode, Printer, FileSpreadsheet, CheckCircle2, UserCheck, Shield } from 'lucide-react'
import CopyLink from './CopyLink'
import DeleteEventButton from './DeleteEventButton'
import RegistrationsTable from './RegistrationsTable'
import MunicipalityQuotaManager from './MunicipalityQuotaManager'
import EmailAccessManager from './EmailAccessManager'
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
  try {
    const parsed = event.requiredFields ? JSON.parse(event.requiredFields) : {}
    municipalityQuotas = parsed.municipalityQuotas || {}
    restrictedByEmail = Boolean(parsed.restrictedByEmail)
    allowedEmails = Array.isArray(parsed.allowedEmails) ? parsed.allowedEmails : []
  } catch (e) {}

  // Calculate checkpoints stats
  const checkpointStats: Record<string, number> = {}
  event.registrations.forEach(r => {
    if (r.checkpoints) {
      try {
        const cps = JSON.parse(r.checkpoints)
        cps.forEach((cp: any) => {
          if (cp && cp.name) {
            checkpointStats[cp.name] = (checkpointStats[cp.name] || 0) + 1
          }
        })
      } catch(e) {}
    }
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
      />

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
              <Link href={`/admin/events/${event.id}/report`} target="_blank" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#FEF2F2', borderColor: '#FECACA', color: '#DC2626', fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}>
                <FileSpreadsheet size={16} />
                Generar Fichas (PDF)
              </Link>
              <Link href={`/api/events/${event.id}/export`} target="_blank" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 0.85rem' }}>
                <FileSpreadsheet size={16} color="var(--success)" />
                Exportar a Excel
              </Link>
            </div>
          )}
        </div>

        {/* Client Interactive Table */}
        <RegistrationsTable 
          eventId={event.id} 
          initialRegistrations={event.registrations} 
        />
      </div>
    </div>
  )
}

