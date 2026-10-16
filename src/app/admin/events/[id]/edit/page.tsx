import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import FormConfigBuilder from '../../new/FormConfigBuilder'

export const instant = false

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) {
    redirect('/admin/events')
  }

  const initialConfig = event.requiredFields ? JSON.parse(event.requiredFields) : {}

  async function updateEvent(formData: FormData) {
    'use server'
    
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const startDate = formData.get('startDate') as string
    const endDate = formData.get('endDate') as string
    const location = formData.get('location') as string
    const capacity = parseInt(formData.get('capacity') as string) || null
    const status = formData.get('status') as string
    const requiredFields = formData.get('requiredFields') as string || "{}"

    if (!name || !startDate || !endDate) return

    await prisma.event.update({
      where: { id },
      data: {
        name,
        description,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        location,
        capacity,
        status,
        requiredFields
      }
    })

    redirect(`/admin/events/${id}`)
  }

  // Format dates for input[type="datetime-local"]
  const formatForInput = (dateObj: Date) => {
    // get string in local timezone format yyyy-MM-ddThh:mm
    const tzoffset = (new Date()).getTimezoneOffset() * 60000
    const localISOTime = (new Date(dateObj.getTime() - tzoffset)).toISOString().slice(0, 16)
    return localISOTime
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <Link href={`/admin/events/${id}`} className="btn btn-outline" style={{ padding: '0.5rem' }}>
          <ArrowLeft size={18} />
        </Link>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Editar Evento</h1>
      </div>

      <div className="card max-w-4xl" style={{ margin: '0 auto', padding: '2rem' }}>
        <p style={{ color: '#64748B', fontSize: '0.9rem', marginBottom: '1.5rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
          Actualiza la información del evento, configura los <strong>límites de cupos por municipio</strong> o añade preguntas adicionales.
        </p>
        <form action={updateEvent} className="flex flex-col gap-5">
          <div className="form-group">
            <label className="form-label" htmlFor="name">Nombre del Evento *</label>
            <input type="text" id="name" name="name" defaultValue={event.name} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="description">Descripción y Objetivo</label>
            <textarea id="description" name="description" defaultValue={event.description || ''} rows={3}></textarea>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="startDate">Fecha y Hora de Inicio *</label>
              <input type="datetime-local" id="startDate" name="startDate" defaultValue={formatForInput(event.startDate)} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="endDate">Fecha y Hora de Finalización *</label>
              <input type="datetime-local" id="endDate" name="endDate" defaultValue={formatForInput(event.endDate)} required />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label" htmlFor="location">Lugar de Realización</label>
              <input type="text" id="location" name="location" defaultValue={event.location || ''} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="capacity">Capacidad Máxima (Opcional)</label>
              <input type="number" id="capacity" name="capacity" defaultValue={event.capacity || ''} min="1" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="status">Estado Inicial</label>
            <select id="status" name="status" defaultValue={event.status}>
              <option value="BORRADOR">Borrador (No visible)</option>
              <option value="PUBLICADO">Publicado (Próximamente)</option>
              <option value="ABIERTO">Abierto (Inscripciones habilitadas)</option>
              <option value="CERRADO">Cerrado</option>
              <option value="FINALIZADO">Finalizado</option>
            </select>
          </div>

          <FormConfigBuilder initialConfig={initialConfig} />

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
            <Link href={`/admin/events/${id}`} className="btn btn-outline">Cancelar</Link>
            <button type="submit" className="btn btn-primary">Guardar Cambios</button>
          </div>
        </form>
      </div>
    </div>
  )
}
