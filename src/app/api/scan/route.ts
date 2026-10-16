import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { qrToken, eventId, checkpoint, attendedBy } = data

    if (!qrToken || !eventId) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // 1. Limpiar y normalizar el valor recibido
    let raw = String(qrToken || '').trim()

    // Si viene como URL (ej: escaneado desde navegador o cámara externa)
    if (raw.includes('token=')) {
      const match = raw.match(/token=([a-zA-Z0-9_-]+)/)
      if (match) raw = match[1]
    } else if (raw.includes('/sticker/')) {
      const parts = raw.split('/sticker/')
      if (parts[1]) raw = parts[1].split('/')[0].split('?')[0]
    } else if (raw.startsWith('http://') || raw.startsWith('https://')) {
      try {
        const u = new URL(raw)
        const pathSegments = u.pathname.split('/').filter(Boolean)
        if (pathSegments.length > 0) {
          raw = pathSegments[pathSegments.length - 1]
        }
      } catch (e) {}
    }

    // Quitar prefijos comunes si se ingresó manualmente ej: "ID: ABC123" o "#ABC123"
    raw = raw.replace(/^ID:\s*/i, '').replace(/^#\s*/, '').trim()

    let registration = null

    // Intento 1: Buscar por qrToken exacto (UUID)
    registration = await prisma.registration.findUnique({
      where: { qrToken: raw },
      include: { person: true, event: true }
    })

    // Intento 2: Buscar por ID directo de la inscripción (ej: cmv2nijt9000311dig1xrf6uw)
    if (!registration) {
      registration = await prisma.registration.findUnique({
        where: { id: raw },
        include: { person: true, event: true }
      })
    }

    // Intento 3: Buscar por número de documento / cédula en el evento
    if (!registration) {
      const cleanDoc = raw.replace(/[^\w]/g, '')
      registration = await prisma.registration.findFirst({
        where: {
          eventId,
          OR: [
            { person: { documentNumber: raw } },
            { person: { documentNumber: cleanDoc } }
          ]
        },
        include: { person: true, event: true }
      })
    }

    // Intento 4: Buscar por coincidencia de sufijo de ID (código corto impreso en el sticker)
    if (!registration && raw.length >= 4) {
      const upperRaw = raw.toUpperCase()
      const eventRegistrations = await prisma.registration.findMany({
        where: { eventId },
        include: { person: true, event: true }
      })
      registration = eventRegistrations.find(r => 
        r.id.toUpperCase().endsWith(upperRaw) ||
        r.qrToken.toUpperCase().endsWith(upperRaw)
      ) || null
    }

    if (!registration) {
      return NextResponse.json({ 
        error: `Código QR, Cédula o ID "${raw}" no encontrado en el sistema` 
      }, { status: 404 })
    }

    if (registration.eventId !== eventId) {
      return NextResponse.json({ 
        error: `El código pertenece al evento "${registration.event.name}", no al evento actual.` 
      }, { status: 400 })
    }

    if (registration.status === 'CANCELADO') {
      return NextResponse.json({ error: 'La inscripción se encuentra cancelada' }, { status: 400 })
    }

    const cpArray = registration.checkpoints ? JSON.parse(registration.checkpoints) : []
    const cpName = checkpoint || 'Ingreso'

    // Check if they already scanned THIS checkpoint
    const existingScan = cpArray.find((c: any) => c.name === cpName)
    if (existingScan) {
       return NextResponse.json({ 
         error: `Ya registró su paso por: ${cpName}`, 
         attendedAt: existingScan.timestamp,
         person: registration.person
       }, { status: 409 })
    }

    // Otherwise, add scan
    cpArray.push({
       name: cpName,
       timestamp: new Date().toISOString(),
       attendedBy: attendedBy || 'Lector de QR',
       evidenceUrl: null
    })

    // Mark as attended
    const updated = await prisma.registration.update({
      where: { id: registration.id },
      data: {
        status: 'ASISTIO',
        attendedAt: registration.attendedAt || new Date(),
        attendedBy: attendedBy || registration.attendedBy || 'Lector de QR',
        checkpoints: JSON.stringify(cpArray)
      },
      include: { person: true }
    })

    revalidatePath(`/admin/events/${eventId}`)

    return NextResponse.json({ 
      success: true, 
      person: updated.person,
      attendedAt: updated.attendedAt,
      registrationId: updated.id,
      checkpoint: cpName
    })

  } catch (error: any) {
    return NextResponse.json({ error: 'Error en el servidor' }, { status: 500 })
  }
}
