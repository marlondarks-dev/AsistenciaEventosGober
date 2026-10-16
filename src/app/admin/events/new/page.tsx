import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import FormConfigBuilder from './FormConfigBuilder'

export default function NewEventPage() {
  async function createEvent(formData: FormData) {
    'use server'
    
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string
    const location = formData.get('location') as string
    const capacity = parseInt(formData.get('capacity') as string) || null
    const status = formData.get('status') as string

    if (!name || !startDate || !endDate) return

    const event = await prisma.event.create({
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        capacity,
        status,
        requiredFields: formData.get('requiredFields') as string || "{}"
      }
    })

    redirect(`/admin/events/${event.id}`)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link href="/admin/events" className="btn btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Crear Nuevo Evento</h1>
      </div>

      <div className="card max-w-2xl">
        <form action={createEvent} className="flex flex-col gap-4">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Nombre del Evento *</label>
            <input type="text" id="name" name="name" required placeholder="Ej. Congreso Anual PILI" />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Descripción y Objetivo</label>
            <textarea id="description" name="description" rows={3} placeholder="Describa el objetivo del evento..."></textarea>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="startDate">Fecha y Hora de Inicio *</label>
              <input type="datetime-local" id="startDate" name="startDate" required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="endDate">Fecha y Hora de Finalización *</label>
              <input type="datetime-local" id="endDate" name="endDate" required />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="location">Lugar de Realización</label>
              <input type="text" id="location" name="location" placeholder="Auditorio Principal" />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="capacity">Capacidad Máxima (Opcional)</label>
              <input type="number" id="capacity" name="capacity" min="1" placeholder="Ej. 500" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="status">Estado Inicial</label>
            <select id="status" name="status">
              <option value="BORRADOR">Borrador (No visible)</option>
              <option value="PUBLICADO">Publicado (Próximamente)</option>
              <option value="ABIERTO">Abierto (Inscripciones habilitadas)</option>
            </select>
          </div>

          <FormConfigBuilder />

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Link href="/admin/events" className="btn btn-outline">Cancelar</Link>
            <button type="submit" className="btn btn-primary">Guardar Evento</button>
          </div>
        </form>
      </div>
    </div>
  )
}
