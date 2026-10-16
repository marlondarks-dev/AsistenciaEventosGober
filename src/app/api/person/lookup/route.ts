import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const docType = searchParams.get('type')
  const docNumber = searchParams.get('number')
  const eventId = searchParams.get('eventId')

  if (!docType || !docNumber || !eventId) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  try {
    const person = await prisma.person.findUnique({
      where: {
        documentType_documentNumber: {
          documentType: docType,
          documentNumber: docNumber
        }
      }
    })

    if (!person) {
      return NextResponse.json({ person: null })
    }

    // Check if already registered
    const registration = await prisma.registration.findUnique({
      where: {
        eventId_personId: {
          eventId,
          personId: person.id
        }
      }
    })

    if (registration) {
      return NextResponse.json({ 
        person, 
        alreadyRegistered: true, 
        registrationId: registration.id 
      })
    }

    return NextResponse.json({ person, alreadyRegistered: false })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
