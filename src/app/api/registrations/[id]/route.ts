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

    // 1. Update registration status if provided
    const regUpdateData: any = {}
    if (status && status !== reg.status) {
      regUpdateData.status = status
      if (status === 'ASISTIO') {
        regUpdateData.attendedAt = reg.attendedAt || new Date()
        regUpdateData.attendedBy = reg.attendedBy || 'Administrador'
        
        // Add Ingreso checkpoint if not present
        const cpArray = reg.checkpoints ? JSON.parse(reg.checkpoints) : []
        if (!cpArray.some((c: any) => c.name === 'Ingreso')) {
          cpArray.push({
            name: 'Ingreso',
            timestamp: new Date().toISOString(),
            evidenceUrl: fotoIngreso || null
          })
          regUpdateData.checkpoints = JSON.stringify(cpArray)
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

    const updatedAdditionalData = {
      ...currentAdditionalData,
      ...(eps !== undefined && { eps: typeof eps === 'string' ? eps.trim().toUpperCase() : eps }),
      ...(contactoEmergencia !== undefined && { contactoEmergencia: typeof contactoEmergencia === 'string' ? contactoEmergencia.trim().toUpperCase() : contactoEmergencia }),
      ...(alergiasMedicas !== undefined && { alergiasMedicas: typeof alergiasMedicas === 'string' ? alergiasMedicas.trim().toUpperCase() : alergiasMedicas }),
      ...(grupoJuvenil !== undefined && { grupoJuvenil }),
      ...(discapacidad !== undefined && { discapacidad }),
      ...(grupoEtnico !== undefined && { grupoEtnico }),
      ...(victima !== undefined && { victima }),
      ...(fotoIngreso !== undefined && { fotoIngreso, foto: fotoIngreso }),
      ...(customAnswers || {})
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
