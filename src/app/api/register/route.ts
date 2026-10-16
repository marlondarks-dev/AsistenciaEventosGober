import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'
import { randomUUID } from 'crypto'

export async function POST(request: Request) {
  try {
    const data = await request.json()
    
    const { 
      eventId, docType, docNumber, personId, 
      firstName, middleName, lastName, secondLastName, 
      municipality, birthDate, gender, 
      sex, specialCondition, locationType, educationLevel,
      customAnswers
    } = data

    if (!eventId || !docType || !docNumber || !firstName || !lastName) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    // Check if event is open
    const event = await prisma.event.findUnique({ where: { id: eventId } })
    if (!event || event.status !== 'ABIERTO') {
      return NextResponse.json({ error: 'El evento no está disponible para inscripciones.' }, { status: 403 })
    }

    // Validate municipality quota if configured (and not an onsite operator override)
    if (municipality && event.requiredFields && !data.isOnsite) {
      try {
        const parsedConfig = JSON.parse(event.requiredFields)
        const quotas = parsedConfig?.municipalityQuotas || {}
        const maxQuota = quotas[municipality]

        if (maxQuota && maxQuota > 0) {
          const currentMunCount = await prisma.registration.count({
            where: {
              eventId,
              person: { municipality },
              ...(personId ? { personId: { not: personId } } : {})
            }
          })

          if (currentMunCount >= maxQuota) {
            return NextResponse.json({ 
              error: `Cupo lleno para el municipio ${municipality} (${currentMunCount}/${maxQuota} personas registradas). No es posible completar más pre-registros para este municipio.` 
            }, { status: 400 })
          }
        }
      } catch (e) {
        console.error('Error checking municipality quota:', e)
      }
    }

    // Validate email authorization whitelist if configured (and not onsite)
    if (event.requiredFields && !data.isOnsite) {
      try {
        const parsedConfig = JSON.parse(event.requiredFields)
        if (parsedConfig?.restrictedByEmail && Array.isArray(parsedConfig?.allowedEmails) && parsedConfig.allowedEmails.length > 0) {
          const authEmail = (customAnswers?.authorizedEmail || data.authorizedEmail || '').toString().toLowerCase().trim()
          const allowedList = parsedConfig.allowedEmails.map((e: string) => e.toString().toLowerCase().trim())

          if (!authEmail || !allowedList.includes(authEmail)) {
            return NextResponse.json({
              error: 'Acceso no autorizado: El correo ingresado no se encuentra en la lista de invitados para este evento institucional.'
            }, { status: 403 })
          }
        }
      } catch (e) {
        console.error('Error validating email whitelist:', e)
      }
    }

    // Convert text inputs in customAnswers to uppercase (excluding file paths / URLs)
    const processedCustomAnswers: Record<string, any> = {}
    if (customAnswers && typeof customAnswers === 'object') {
      Object.entries(customAnswers).forEach(([k, v]) => {
        if (typeof v === 'string') {
          processedCustomAnswers[k] = (v.startsWith('/') || v.startsWith('http')) ? v : v.trim().toUpperCase()
        } else {
          processedCustomAnswers[k] = v
        }
      })
    }

    if (data.authorizedEmail) {
      processedCustomAnswers.authorizedEmail = data.authorizedEmail.toString().trim().toLowerCase()
    }

    const additionalData = JSON.stringify(processedCustomAnswers)
    const parsedBirthDate = birthDate ? new Date(birthDate) : undefined

    const cleanFirstName = firstName ? firstName.trim().toUpperCase() : ''
    const cleanMiddleName = middleName ? middleName.trim().toUpperCase() : undefined
    const cleanLastName = lastName ? lastName.trim().toUpperCase() : ''
    const cleanSecondLastName = secondLastName ? secondLastName.trim().toUpperCase() : undefined
    const cleanDocNumber = docNumber ? docNumber.trim().toUpperCase() : ''

    const personData = {
      firstName: cleanFirstName,
      middleName: cleanMiddleName,
      lastName: cleanLastName,
      secondLastName: cleanSecondLastName,
      municipality: municipality || undefined,
      birthDate: parsedBirthDate,
      gender: gender || undefined,
      sex: sex || undefined,
      specialCondition: specialCondition || undefined,
      locationType: locationType || undefined,
      educationLevel: educationLevel || undefined,
      additionalData
    }

    let pId = personId

    if (pId) {
      // Update existing person if needed
      await prisma.person.update({
        where: { id: pId },
        data: personData
      })
    } else {
      // Upsert just in case it was created concurrently
      const person = await prisma.person.upsert({
        where: {
          documentType_documentNumber: { documentType: docType, documentNumber: cleanDocNumber }
        },
        update: personData,
        create: {
          documentType: docType,
          documentNumber: cleanDocNumber,
          ...personData
        }
      })
      pId = person.id
    }

    // Create unique token
    const qrToken = randomUUID()

    const photoUrl = data.fotoIngreso || customAnswers?.fotoIngreso || customAnswers?.foto || null

    // Determine initial status based on whether the form was filled onsite by an operator
    const isAutoVerified = data.isOnsite === true
    const initialStatus = isAutoVerified ? 'ASISTIO' : 'REGISTRADO'
    const initialAttendedAt = isAutoVerified ? new Date() : undefined
    const initialAttendedBy = isAutoVerified ? 'Operador en Sitio' : undefined
    const initialCheckpoints = isAutoVerified ? JSON.stringify([{ name: 'Ingreso', timestamp: new Date().toISOString(), evidenceUrl: photoUrl }]) : "[]"

    try {
      // Create registration
      const registration = await prisma.registration.create({
        data: {
          eventId,
          personId: pId,
          qrToken,
          status: initialStatus,
          attendedAt: initialAttendedAt,
          attendedBy: initialAttendedBy,
          checkpoints: initialCheckpoints
        }
      })

      revalidatePath(`/admin/events/${eventId}`)
      return NextResponse.json({ success: true, registrationId: registration.id })
    } catch (e: any) {
      if (e.code === 'P2002') {
        const existingReg = await prisma.registration.findUnique({
          where: { eventId_personId: { eventId, personId: pId } }
        })
        if (existingReg) {
          // Si ya estaba pre-registrado y ahora llegó al sitio, lo marcamos como ASISTIO
          const cpArray = existingReg.checkpoints ? JSON.parse(existingReg.checkpoints) : []
          const existingIngreso = cpArray.find((cp: any) => cp.name === 'Ingreso')

          if (!existingIngreso && isAutoVerified) {
            cpArray.push({ name: 'Ingreso', timestamp: new Date().toISOString(), evidenceUrl: photoUrl })
          } else if (existingIngreso && photoUrl && !existingIngreso.evidenceUrl) {
            existingIngreso.evidenceUrl = photoUrl
          }

          if (isAutoVerified) {
            await prisma.registration.update({
              where: { id: existingReg.id },
              data: {
                status: 'ASISTIO',
                attendedAt: existingReg.attendedAt || new Date(),
                attendedBy: existingReg.attendedBy || 'Operador en Sitio',
                checkpoints: JSON.stringify(cpArray)
              }
            })
          }
          revalidatePath(`/admin/events/${eventId}`)
          return NextResponse.json({ success: true, registrationId: existingReg.id })
        }
      }
      throw e
    }

  } catch (error: any) {
    console.error('Registration Error:', error)
    return NextResponse.json({ error: error.message || 'Error al procesar la inscripción' }, { status: 500 })
  }
}
