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

    // Checkpoint deliveries stats
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
        } catch (e) {}
      }
    })

    return NextResponse.json({
      registrations: event.registrations,
      stats: {
        totalCount,
        attendedCount,
        pendingCount,
        cancelledCount,
        registrationsByMunicipality,
        checkpointStats
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
