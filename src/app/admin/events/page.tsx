import Link from 'next/link'
import prisma from '@/lib/prisma'
import { Plus, Edit, Users, CalendarDays } from 'lucide-react'

export const instant = false

export default async function EventsPage() {
  const events = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { registrations: true }
      }
    }
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Gestión de Eventos</h1>
        <Link href="/admin/events/new" className="btn btn-primary">
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          Nuevo Evento
        </Link>
      </div>

      <div className="card table-container">
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <CalendarDays size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <p>No hay eventos creados. Crea el primer evento para comenzar.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Fecha Inicio</th>
                <th>Lugar</th>
                <th>Estado</th>
                <th>Inscritos</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id}>
                  <td style={{ fontWeight: 500 }}>{event.name}</td>
                  <td>{new Date(event.startDate).toLocaleDateString('es-CO')}</td>
                  <td>{event.location || '-'}</td>
                  <td>
                    <span className={`badge ${event.status === 'ABIERTO' ? 'badge-success' : event.status === 'BORRADOR' ? 'badge-neutral' : 'badge-primary'}`}>
                      {event.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Users size={14} color="var(--text-muted)" />
                      {event._count.registrations} {event.capacity ? `/ ${event.capacity}` : ''}
                    </div>
                  </td>
                  <td>
                    <Link href={`/admin/events/${event.id}`} className="btn btn-outline" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                      <Edit size={14} style={{ marginRight: '0.25rem' }} />
                      Administrar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
