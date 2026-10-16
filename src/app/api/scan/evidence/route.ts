import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { registrationId, checkpoint, evidenceUrl } = await req.json()
    
    if (!registrationId || !checkpoint || !evidenceUrl) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    const reg = await prisma.registration.findUnique({ where: { id: registrationId } })
    if (!reg) {
      return NextResponse.json({ error: 'Registro no encontrado' }, { status: 404 })
    }

    const cpArray = reg.checkpoints ? JSON.parse(reg.checkpoints) : []
    const cpIndex = cpArray.findIndex((c: any) => c.name === checkpoint)
    
    if (cpIndex > -1) {
      cpArray[cpIndex].evidenceUrl = evidenceUrl
      await prisma.registration.update({
        where: { id: registrationId },
        data: { checkpoints: JSON.stringify(cpArray) }
      })

      // Si es el punto de Ingreso, guardar también como foto de perfil del participante
      if (checkpoint === 'Ingreso' && reg.personId) {
        try {
          const person = await prisma.person.findUnique({ where: { id: reg.personId } })
          if (person) {
            const addData = person.additionalData ? JSON.parse(person.additionalData) : {}
            addData.fotoIngreso = evidenceUrl
            await prisma.person.update({
              where: { id: reg.personId },
              data: { additionalData: JSON.stringify(addData) }
            })
          }
        } catch (err) {}
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Punto de control no registrado' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
