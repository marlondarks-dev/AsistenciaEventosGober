import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as xlsx from 'xlsx'

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
          include: { person: true },
          orderBy: { registeredAt: 'desc' }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
    }

    // Map custom question IDs to user-friendly labels
    const questionLabels: Record<string, string> = {
      q_auth_menores: 'Autorización Menores de Edad (PDF)',
      q_compromiso_convivencia: 'Compromiso Convivencia (Adjunto)',
      fotoIngreso: 'Foto de Ingreso',
      grupoJuvenil: 'Grupo al que Pertenece',
      eps: 'EPS',
      contactoEmergencia: 'Contacto de Emergencia',
      alergiasMedicas: 'Alergias o Observaciones Médicas',
      discapacidad: 'Discapacidad',
      grupoEtnico: 'Grupo Étnico',
      victima: 'Víctima del Conflicto',
      liderSocial: 'Líder Social'
    }
    if (event.requiredFields) {
      try {
        const config = JSON.parse(event.requiredFields)
        if (config.customQuestions && Array.isArray(config.customQuestions)) {
          config.customQuestions.forEach((q: any) => {
            if (q.id && q.label) questionLabels[q.id] = q.label
          })
        }
      } catch (e) {}
    }

    // Format data for Excel
    const dataToExport = event.registrations.map(reg => {
      const specialConditionDisplay = (reg.person.specialCondition === 'INDIGENTE' || reg.person.specialCondition === 'HABITANTE_DE_CALLE')
        ? 'Habitante de calle'
        : (reg.person.specialCondition || '')

      const baseData: Record<string, any> = {
        'Estado de Asistencia': reg.status,
        'Fecha Inscripción': new Date(reg.registeredAt).toLocaleString('es-CO'),
        'Fecha Primera Asistencia': reg.attendedAt ? new Date(reg.attendedAt).toLocaleString('es-CO') : 'N/A',
        'Tipo Documento': reg.person.documentType,
        'Documento': reg.person.documentNumber,
        'Primer Nombre': reg.person.firstName,
        'Segundo Nombre': reg.person.middleName || '',
        'Primer Apellido': reg.person.lastName,
        'Segundo Apellido': reg.person.secondLastName || '',
        'Género': reg.person.gender || '',
        'Sexo': reg.person.sex || '',
        'Municipio': reg.person.municipality || '',
        'Condición Especial': specialConditionDisplay,
        'Nivel Educativo': reg.person.educationLevel || '',
      };

      // Add dynamic fields from person.additionalData
      if (reg.person.additionalData) {
        try {
          const addData = JSON.parse(reg.person.additionalData)
          for (const key of Object.keys(addData)) {
             const displayKey = questionLabels[key] || `Info: ${key}`
             let val = addData[key]
             if (key === 'grupoJuvenil') {
               if (val === 'BASE_JUVENIL') val = 'Base Juvenil'
               else if (val === 'ENLACE_MUNICIPAL') val = 'Enlace Municipal'
             }
             if (!baseData[displayKey] && val !== '') {
               baseData[displayKey] = val
             }
          }
        } catch(e) {}
      }

      // Add checkpoint info from reg.checkpoints
      if (reg.checkpoints) {
        try {
          const checkpoints = JSON.parse(reg.checkpoints)
          for (const cp of checkpoints) {
             baseData[`Punto: ${cp.name} (Hora)`] = new Date(cp.timestamp).toLocaleString('es-CO')
             if (cp.evidenceUrl) {
                // Determine full url roughly for the excel
                const fullUrl = cp.evidenceUrl.startsWith('http') ? cp.evidenceUrl : `https://[Tu_Dominio]${cp.evidenceUrl}`
                baseData[`Punto: ${cp.name} (Evidencia)`] = fullUrl
             }
          }
        } catch(e) {}
      }

      return baseData
    })

    // Create workbook and worksheet
    const worksheet = xlsx.utils.json_to_sheet(dataToExport)
    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Inscritos')

    // Generate buffer
    const buf = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Set headers for file download
    const headers = new Headers()
    headers.set('Content-Disposition', `attachment; filename="Reporte_Asistencia_${event.name.replace(/[^a-z0-9]/gi, '_')}.xlsx"`)
    headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

    return new NextResponse(buf, {
      status: 200,
      headers
    })
  } catch (error) {
    console.error('Error generating excel:', error)
    return NextResponse.json({ error: 'Error generando el reporte' }, { status: 500 })
  }
}
