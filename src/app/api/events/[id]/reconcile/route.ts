import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// Normaliza nombres de kit
const isKitName = (name: string) => {
  if (!name) return false
  const n = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  return n.includes('kit') || n.includes('bienvenida')
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        registrations: {
          select: {
            id: true,
            status: true,
            checkpoints: true,
            attendedAt: true,
            registeredAt: true
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    let configuredCheckpoints: string[] = ['Ingreso', 'Kit de Bienvenida']
    try {
      const parsedConfig = event.requiredFields ? JSON.parse(event.requiredFields) : {}
      if (Array.isArray(parsedConfig.checkpoints) && parsedConfig.checkpoints.length > 0) {
        configuredCheckpoints = parsedConfig.checkpoints
      }
    } catch (e) {}

    const totalCount = event.registrations.length
    const attendedCount = event.registrations.filter(r => r.status === 'ASISTIO').length
    const pendingCount = event.registrations.filter(r => r.status === 'REGISTRADO').length

    // Conteo por cada checkpoint
    const deliveriesCount: Record<string, number> = {}
    configuredCheckpoints.forEach(name => {
      deliveriesCount[name] = 0
    })

    let attendedWithoutIngreso = 0
    let attendedWithoutKit = 0

    event.registrations.forEach(r => {
      let cps: any[] = []
      if (r.checkpoints) {
        try {
          cps = typeof r.checkpoints === 'string' ? JSON.parse(r.checkpoints) : r.checkpoints
          if (!Array.isArray(cps)) cps = []
        } catch {
          cps = []
        }
      }

      const hasIngreso = cps.some((c: any) => c && c.name === 'Ingreso')
      const hasKit = cps.some((c: any) => c && isKitName(c.name))

      if (r.status === 'ASISTIO') {
        if (!hasIngreso) attendedWithoutIngreso++
        if (!hasKit) attendedWithoutKit++
      }

      cps.forEach((c: any) => {
        if (c && c.name) {
          const cpName = isKitName(c.name) ? 'Kit de Bienvenida' : c.name
          deliveriesCount[cpName] = (deliveriesCount[cpName] || 0) + 1
        }
      })
    })

    return NextResponse.json({
      success: true,
      totalCount,
      attendedCount,
      pendingCount,
      attendedWithoutIngreso,
      attendedWithoutKit,
      configuredCheckpoints,
      deliveriesCount
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
  } catch (error: any) {
    console.error('Reconcile audit error:', error)
    return NextResponse.json({ error: error.message || 'Error en auditoría' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    const body = await request.json()
    const { action } = body

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        registrations: true
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    if (action === 'sync_ingreso') {
      // Para todos los que tienen status === 'ASISTIO' pero no tienen checkpoint 'Ingreso', agregarlo con su hora de asistencia
      let updatedCount = 0

      for (const reg of event.registrations) {
        if (reg.status === 'ASISTIO') {
          let cps: any[] = []
          try {
            cps = typeof reg.checkpoints === 'string' ? JSON.parse(reg.checkpoints || '[]') : (reg.checkpoints || [])
            if (!Array.isArray(cps)) cps = []
          } catch {
            cps = []
          }

          const hasIngreso = cps.some((c: any) => c && c.name === 'Ingreso')
          if (!hasIngreso) {
            const timeIso = reg.attendedAt ? new Date(reg.attendedAt).toISOString() : (reg.registeredAt ? new Date(reg.registeredAt).toISOString() : new Date().toISOString())
            cps.unshift({
              name: 'Ingreso',
              timestamp: timeIso,
              attendedBy: reg.attendedBy || 'Sincronización Asistencia'
            })

            await prisma.registration.update({
              where: { id: reg.id },
              data: {
                checkpoints: JSON.stringify(cps),
                attendedAt: reg.attendedAt || new Date(timeIso)
              }
            })
            updatedCount++
          }
        }
      }

      revalidatePath(`/admin/events/${eventId}`)
      return NextResponse.json({
        success: true,
        message: `Se sincronizó el punto "Ingreso" para ${updatedCount} asistentes verificados.`,
        updatedCount
      })
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })
  } catch (error: any) {
    console.error('Reconcile execute error:', error)
    return NextResponse.json({ error: error.message || 'Error al ejecutar reconciliación' }, { status: 500 })
  }
}
