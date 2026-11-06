import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import prisma from '@/lib/prisma'



export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    const reg = await prisma.registration.findUnique({
      where: { id }
    })

    if (!reg) {
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
    }

    await prisma.registration.delete({
      where: { id }
    })

    revalidatePath(`/admin/events/${reg.eventId}`)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Delete registration error:', err)
    return NextResponse.json({ error: err.message || 'Error al eliminar el registro' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const reg = await prisma.registration.findUnique({
      where: { id },
      include: { person: true }
    })

    if (!reg) {
      return NextResponse.json({ error: 'Inscripción no encontrada' }, { status: 404 })
    }

    const {
      status,
      firstName,
      middleName,
      lastName,
      secondLastName,
      documentType,
      documentNumber,
      municipality,
      birthDate,
      sex,
      gender,
      specialCondition,
      locationType,
      educationLevel,
      eps,
      contactoEmergencia,
      alergiasMedicas,
      grupoJuvenil,
      discapacidad,
      grupoEtnico,
      victima,
      fotoIngreso,
      customAnswers
    } = body

    // 1. Update registration status and checkpoints if provided
    const regUpdateData: any = {}

    // Determine current checkpoints: prioritize body.checkpoints if provided, otherwise reg.checkpoints
    let currentCheckpoints: any[] = []
    if (body.checkpoints !== undefined) {
      try {
        currentCheckpoints = typeof body.checkpoints === 'string'
          ? JSON.parse(body.checkpoints)
          : body.checkpoints
        if (!Array.isArray(currentCheckpoints)) currentCheckpoints = []
      } catch {
        currentCheckpoints = []
      }
      regUpdateData.checkpoints = JSON.stringify(currentCheckpoints)
    } else if (reg.checkpoints) {
      try {
        currentCheckpoints = typeof reg.checkpoints === 'string'
          ? JSON.parse(reg.checkpoints)
          : reg.checkpoints
        if (!Array.isArray(currentCheckpoints)) currentCheckpoints = []
      } catch {
        currentCheckpoints = []
      }
    }

    // CRITICAL: Synchronize fotoIngreso with checkpoints
    // If fotoIngreso is sent (either a new URL or null/empty to delete),
    // update the "Ingreso" checkpoint's evidenceUrl so it never keeps the old photo!
    if (fotoIngreso !== undefined) {
      const normalizedPhoto = (fotoIngreso && typeof fotoIngreso === 'string' && fotoIngreso.trim()) ? fotoIngreso.trim() : null
      let cpUpdated = false
      currentCheckpoints = currentCheckpoints.map((cp: any) => {
        if (cp && cp.name === 'Ingreso') {
          cpUpdated = true
          return {
            ...cp,
            evidenceUrl: normalizedPhoto
          }
        }
        return cp
      })
      if (cpUpdated) {
        regUpdateData.checkpoints = JSON.stringify(currentCheckpoints)
      }
    }

    if (status && status !== reg.status) {
      regUpdateData.status = status
      if (status === 'ASISTIO') {
        regUpdateData.attendedAt = reg.attendedAt || new Date()
        regUpdateData.attendedBy = reg.attendedBy || 'Administrador'
        
        // Ensure "Ingreso" checkpoint is present without erasing any newly added refrigerios or checkpoints!
        if (!currentCheckpoints.some((c: any) => c.name === 'Ingreso')) {
          const photoForIngreso = (fotoIngreso && typeof fotoIngreso === 'string' && fotoIngreso.trim()) ? fotoIngreso.trim() : null
          currentCheckpoints.unshift({
            name: 'Ingreso',
            timestamp: new Date().toISOString(),
            evidenceUrl: photoForIngreso
          })
          regUpdateData.checkpoints = JSON.stringify(currentCheckpoints)
        }
      } else if (status === 'REGISTRADO') {
        regUpdateData.attendedAt = null
      }
    }

    if (Object.keys(regUpdateData).length > 0) {
      await prisma.registration.update({
        where: { id },
        data: regUpdateData
      })
    }

    // 2. Merge additionalData
    let currentAdditionalData: Record<string, any> = {}
    try {
      currentAdditionalData = JSON.parse(reg.person.additionalData || '{}')
    } catch (e) {}

    // Clean customAnswers so old photo values cannot overwrite the new photo or removal
    const cleanCustomAnswers = { ...(customAnswers || {}) }
    delete cleanCustomAnswers.fotoIngreso
    delete cleanCustomAnswers.foto

    const finalPhotoVal = (fotoIngreso && typeof fotoIngreso === 'string' && fotoIngreso.trim()) 
      ? fotoIngreso.trim() 
      : (fotoIngreso === null ? null : undefined)

    const updatedAdditionalData = {
      ...currentAdditionalData,
      ...cleanCustomAnswers,
      ...(eps !== undefined && { eps: typeof eps === 'string' ? eps.trim().toUpperCase() : eps }),
      ...(contactoEmergencia !== undefined && { contactoEmergencia: typeof contactoEmergencia === 'string' ? contactoEmergencia.trim().toUpperCase() : contactoEmergencia }),
      ...(alergiasMedicas !== undefined && { alergiasMedicas: typeof alergiasMedicas === 'string' ? alergiasMedicas.trim().toUpperCase() : alergiasMedicas }),
      ...(grupoJuvenil !== undefined && { grupoJuvenil }),
      ...(discapacidad !== undefined && { discapacidad }),
      ...(grupoEtnico !== undefined && { grupoEtnico }),
      ...(victima !== undefined && { victima }),
      ...(finalPhotoVal !== undefined && { fotoIngreso: finalPhotoVal, foto: finalPhotoVal })
    }

    // 3. Update Person record
    const parsedBirthDate = birthDate ? new Date(birthDate) : undefined

    await prisma.person.update({
      where: { id: reg.personId },
      data: {
        ...(firstName !== undefined && { firstName: firstName.trim().toUpperCase() }),
        ...(middleName !== undefined && { middleName: middleName ? middleName.trim().toUpperCase() : null }),
        ...(lastName !== undefined && { lastName: lastName.trim().toUpperCase() }),
        ...(secondLastName !== undefined && { secondLastName: secondLastName ? secondLastName.trim().toUpperCase() : null }),
        ...(documentType !== undefined && { documentType }),
        ...(documentNumber !== undefined && { documentNumber: documentNumber.trim().toUpperCase() }),
        ...(municipality !== undefined && { municipality: municipality || null }),
        ...(birthDate !== undefined && { birthDate: parsedBirthDate }),
        ...(sex !== undefined && { sex: sex || null }),
        ...(gender !== undefined && { gender: gender || null }),
        ...(specialCondition !== undefined && { specialCondition: specialCondition || null }),
        ...(locationType !== undefined && { locationType: locationType || null }),
        ...(educationLevel !== undefined && { educationLevel: educationLevel || null }),
        additionalData: JSON.stringify(updatedAdditionalData)
      }
    })

    const updated = await prisma.registration.findUnique({
      where: { id },
      include: { person: true }
    })

    revalidatePath(`/admin/events/${reg.eventId}`)
    return NextResponse.json({ success: true, registration: updated })
  } catch (err: any) {
    console.error('Update registration error:', err)
    return NextResponse.json({ error: err.message || 'Error al actualizar el registro' }, { status: 500 })
  }
}
