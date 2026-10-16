"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, UserCheck, QrCode, Printer, ExternalLink } from 'lucide-react'
import CopyLink from './CopyLink'

interface EventMetricsCardsProps {
  eventId: string
  initialTotal: number
  initialAttended: number
  initialPending: number
  initialCheckpoints: Record<string, number>
}

export default function EventMetricsCards({
  eventId,
  initialTotal,
  initialAttended,
  initialPending,
  initialCheckpoints
}: EventMetricsCardsProps) {
  const [total, setTotal] = useState(initialTotal)
  const [attended, setAttended] = useState(initialAttended)
  const [pending, setPending] = useState(initialPending)
  const [checkpoints, setCheckpoints] = useState<Record<string, number>>(initialCheckpoints)

  useEffect(() => {
    const handleSync = (e: any) => {
      const stats = e.detail
      if (!stats) return
      if (typeof stats.totalCount === 'number') setTotal(stats.totalCount)
      if (typeof stats.attendedCount === 'number') setAttended(stats.attendedCount)
      if (typeof stats.pendingCount === 'number') setPending(stats.pendingCount)
      if (stats.checkpointStats) setCheckpoints(stats.checkpointStats)
    }

    window.addEventListener('registrations-live-sync', handleSync)
    return () => window.removeEventListener('registrations-live-sync', handleSync)
  }, [])

  return (
    <div className="grid md:grid-cols-3 gap-4 mb-8">
      
      {/* Metric 1: Total Registrations */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #3B82F6' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase' }}>Total Inscritos</h3>
            <Users size={20} color="#3B82F6" />
          </div>
          <p style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0.5rem 0', color: '#1E293B' }}>{total}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#64748B', borderTop: '1px solid #F1F5F9', paddingTop: '0.5rem' }}>
          <span>Pendientes por ingresar:</span>
          <strong style={{ color: '#2563EB' }}>{pending}</strong>
        </div>
      </div>

      {/* Metric 2: Verified Attendees & Checkpoints */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderTop: '4px solid #10B981' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 700, textTransform: 'uppercase' }}>Asistentes Verificados</h3>
            <UserCheck size={20} color="#10B981" />
          </div>
          <p style={{ fontSize: '2.4rem', fontWeight: 800, margin: '0.5rem 0', color: 'var(--success)' }}>{attended}</p>
        </div>
        
        {Object.keys(checkpoints).length > 0 && (
          <div style={{ marginTop: '0.5rem', borderTop: '1px solid #E2E8F0', paddingTop: '0.5rem' }}>
            <h4 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Entregas Realizadas:</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
              {Object.entries(checkpoints).map(([name, count]) => (
                <span key={name} style={{ fontSize: '0.75rem', backgroundColor: '#F1F5F9', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#334155', fontWeight: 600 }}>
                  {name}: <strong style={{ color: '#0F172A' }}>{count}</strong>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Panel: Links and QR Operations */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', justifyContent: 'center' }}>
        <Link href={`/admin/events/${eventId}/scanner`} className="btn btn-success w-full" style={{ justifyContent: 'space-between', padding: '0.85rem 1rem', fontWeight: 800 }}>
          <span>Abrir Escáner QR (PWA)</span>
          <QrCode size={18} />
        </Link>
        <Link href={`/event/${eventId}/register?mode=onsite`} target="_blank" className="btn btn-primary w-full" style={{ justifyContent: 'space-between', padding: '0.75rem 1rem', fontWeight: 700 }}>
          <span>Formulario en Sitio (Foto + QR)</span>
          <Printer size={18} />
        </Link>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href={`/event/${eventId}/register`} target="_blank" className="btn btn-outline" style={{ flex: 1, justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}>
            <span>Pre-Registro (Sin QR)</span>
            <ExternalLink size={14} />
          </Link>
          <CopyLink url={`/event/${eventId}/register`} />
        </div>
      </div>

    </div>
  )
}
