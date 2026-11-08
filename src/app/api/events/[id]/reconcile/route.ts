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

    let configuredCheckpoints: string[] = ['Ingreso']
    let hasKitConfigured = false
    try {
      const parsedConfig = event.requiredFields ? JSON.parse(event.requiredFields) : {}
      if (Array.isArray(parsedConfig.checkpoints) && parsedConfig.checkpoints.length > 0) {
        configuredCheckpoints = parsedConfig.checkpoints
      } else if (parsedConfig.hasKit !== false) {
        configuredCheckpoints = ['Ingreso', 'Kit de Bienvenida']
      }
      if (parsedConfig.hasKit === false) {
        configuredCheckpoints = configuredCheckpoints.filter(cp => !isKitName(cp))
      }
      hasKitConfigured = configuredCheckpoints.some(c => isKitName(c))
    } catch (e) {}

    // Discover any checkpoints present across registrations
    event.registrations.forEach(r => {
      if (!r.checkpoints) return
      try {
        const cps = typeof r.checkpoints === 'string' ? JSON.parse(r.checkpoints) : r.checkpoints
        if (Array.isArray(cps)) {
          cps.forEach((c: any) => {
            if (c?.name && typeof c.name === 'string') {
              const trimmed = c.name.trim()
              if (trimmed) {
                if (isKitName(trimmed)) {
                  if (hasKitConfigured && !configuredCheckpoints.includes(trimmed)) configuredCheckpoints.push(trimmed)
                } else if (!configuredCheckpoints.includes(trimmed)) {
                  configuredCheckpoints.push(trimmed)
                }
              }
            }
          })
        }
      } catch {}
    })

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
        if (hasKitConfigured && !hasKit) attendedWithoutKit++
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
      deliveriesCount,
      hasKitConfigured
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
      revalidatePath(`/admin/events/${eventId}/report`)
      return NextResponse.json({
        success: true,
        message: `Se sincronizó el punto "Ingreso" para ${updatedCount} asistentes verificados.`,
        updatedCount
      })
    }

    if (action === 'clear_kits') {
      let clearedCount = 0

      for (const reg of event.registrations) {
        let cps: any[] = []
        try {
          cps = typeof reg.checkpoints === 'string' ? JSON.parse(reg.checkpoints || '[]') : (reg.checkpoints || [])
          if (!Array.isArray(cps)) cps = []
        } catch {
          cps = []
        }

        const hadKit = cps.some((c: any) => c && isKitName(c.name))
        if (hadKit) {
          const newCps = cps.filter((c: any) => !c || !isKitName(c.name))
          await prisma.registration.update({
            where: { id: reg.id },
            data: { checkpoints: JSON.stringify(newCps) }
          })
          clearedCount++
        }
      }

      // Also ensure event requiredFields has hasKit: false and kit is removed from checkpoints & generalPoints
      let requiredFieldsObj: any = {}
      try {
        requiredFieldsObj = event.requiredFields ? JSON.parse(event.requiredFields) : {}
      } catch (e) {}

      requiredFieldsObj.hasKit = false
      if (Array.isArray(requiredFieldsObj.checkpoints)) {
        requiredFieldsObj.checkpoints = requiredFieldsObj.checkpoints.filter((c: string) => !isKitName(c))
      }
      if (requiredFieldsObj.dailySchedule?.generalPoints) {
        requiredFieldsObj.dailySchedule.generalPoints = requiredFieldsObj.dailySchedule.generalPoints.filter((p: string) => !isKitName(p))
      }

      await prisma.event.update({
        where: { id: eventId },
        data: { requiredFields: JSON.stringify(requiredFieldsObj) }
      })

      revalidatePath(`/admin/events/${eventId}`)
      revalidatePath(`/admin/events/${eventId}/report`)
      revalidatePath(`/admin/events/${eventId}/scanner`)
      return NextResponse.json({
        success: true,
        message: `Se desmarcó el Kit de Bienvenida para ${clearedCount} participante(s) y se desactivó el Kit para este evento.`,
        clearedCount
      })
    }

    if (action === 'toggle_kit') {
      const enableKit = Boolean(body.enableKit)
      let requiredFieldsObj: any = {}
      try {
        requiredFieldsObj = event.requiredFields ? JSON.parse(event.requiredFields) : {}
      } catch (e) {}

      requiredFieldsObj.hasKit = enableKit
      let cps = Array.isArray(requiredFieldsObj.checkpoints) ? [...requiredFieldsObj.checkpoints] : ['Ingreso']
      let genPoints = Array.isArray(requiredFieldsObj.dailySchedule?.generalPoints) ? [...requiredFieldsObj.dailySchedule.generalPoints] : ['Ingreso']

      if (enableKit) {
        if (!cps.some((c: string) => isKitName(c))) {
          cps.splice(1, 0, 'Kit de Bienvenida')
        }
        if (!genPoints.some((p: string) => isKitName(p))) {
          genPoints.push('Kit de Bienvenida')
        }
      } else {
        cps = cps.filter((c: string) => !isKitName(c))
        genPoints = genPoints.filter((p: string) => !isKitName(p))
      }

      requiredFieldsObj.checkpoints = cps
      if (!requiredFieldsObj.dailySchedule) {
        requiredFieldsObj.dailySchedule = { generalPoints: genPoints, days: [] }
      } else {
        requiredFieldsObj.dailySchedule.generalPoints = genPoints
      }

      await prisma.event.update({
        where: { id: eventId },
        data: { requiredFields: JSON.stringify(requiredFieldsObj) }
      })

      revalidatePath(`/admin/events/${eventId}`)
      revalidatePath(`/admin/events/${eventId}/report`)
      revalidatePath(`/admin/events/${eventId}/scanner`)
      return NextResponse.json({
        success: true,
        message: enableKit ? 'Kit de Bienvenida activado para este evento.' : 'Kit de Bienvenida desactivado para este evento.',
        hasKit: enableKit
      })
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })
  } catch (error: any) {
    console.error('Reconcile execute error:', error)
    return NextResponse.json({ error: error.message || 'Error al ejecutar reconciliación' }, { status: 500 })
  }
}
