import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'



export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        registrations: {
          include: { person: true },
          orderBy: { registeredAt: 'desc' }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    const attendedCount = event.registrations.filter(r => r.status === 'ASISTIO').length
    const pendingCount = event.registrations.filter(r => r.status === 'REGISTRADO').length
    const cancelledCount = event.registrations.filter(r => r.status === 'CANCELADO').length
    const totalCount = event.registrations.length

    // Municipality registrations count
    const registrationsByMunicipality: Record<string, number> = {}
    event.registrations.forEach(r => {
      const m = r.person?.municipality
      if (m) {
        registrationsByMunicipality[m] = (registrationsByMunicipality[m] || 0) + 1
      }
    })

    // Checkpoint deliveries stats & configured list
    let configuredCheckpoints: string[] = ['Ingreso', 'Kit de Bienvenida']
    try {
      const parsedConfig = event.requiredFields ? JSON.parse(event.requiredFields) : {}
      if (Array.isArray(parsedConfig.checkpoints) && parsedConfig.checkpoints.length > 0) {
        configuredCheckpoints = parsedConfig.checkpoints
      }
    } catch (e) {}

    const checkpointStats: Record<string, number> = {}
    configuredCheckpoints.forEach(cpName => {
      checkpointStats[cpName] = 0
    })

    let attendedWithoutIngreso = 0
    let attendedWithoutKit = 0

    event.registrations.forEach(r => {
      let cps: any[] = []
      if (r.checkpoints) {
        try {
          cps = typeof r.checkpoints === 'string' ? JSON.parse(r.checkpoints) : r.checkpoints
          if (!Array.isArray(cps)) cps = []
        } catch (e) {
          cps = []
        }
      }

      const isKit = (n: string) => {
        if (!n) return false
        const norm = n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        return norm.includes('kit') || norm.includes('bienvenida')
      }

      const hasIngreso = cps.some((c: any) => c && c.name === 'Ingreso')
      const hasKit = cps.some((c: any) => c && isKit(c.name))

      if (r.status === 'ASISTIO') {
        if (!hasIngreso) attendedWithoutIngreso++
        if (!hasKit) attendedWithoutKit++
      }

      cps.forEach((cp: any) => {
        if (cp && cp.name) {
          const key = isKit(cp.name) ? 'Kit de Bienvenida' : cp.name
          checkpointStats[key] = (checkpointStats[key] || 0) + 1
        }
      })
    })

    return NextResponse.json({
      registrations: event.registrations,
      stats: {
        totalCount,
        attendedCount,
        pendingCount,
        cancelledCount,
        registrationsByMunicipality,
        checkpointStats,
        configuredCheckpoints,
        attendedWithoutIngreso,
        attendedWithoutKit
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  } catch (err: any) {
    console.error('Error fetching registrations:', err)
    return NextResponse.json({ error: err.message || 'Error al obtener registros' }, { status: 500 })
  }
}
