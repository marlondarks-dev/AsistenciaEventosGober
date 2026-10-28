import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as xlsx from 'xlsx'

function calculateAge(birthDate: Date | string | null | undefined): number | string {
  if (!birthDate) return 'No registrada'
  const birth = new Date(birthDate)
  if (isNaN(birth.getTime())) return 'No registrada'
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age >= 0 ? age : 'No registrada'
}

function formatBirthDate(birthDate: Date | string | null | undefined): string {
  if (!birthDate) return 'No registrada'
  const d = new Date(birthDate)
  if (isNaN(d.getTime())) return 'No registrada'
  return d.toISOString().split('T')[0]
}

function formatColombiaDateTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return ''
  try {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    })
  } catch {
    return ''
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params
    let baseUrl = ''
    try {
      const urlObj = new URL(request.url)
      baseUrl = `${urlObj.protocol}//${urlObj.host}`
    } catch (e) {
      baseUrl = ''
    }

    const toFullUrl = (path: string | null | undefined) => {
      if (!path || typeof path !== 'string') return ''
      const trimmed = path.trim()
      if (!trimmed) return ''
      // If it is a base64 image, NEVER put it in an Excel cell (it exceeds Excel's 32,767 char limit)
      if (trimmed.startsWith('data:image')) {
        return '[Foto en Ficha PDF]'
      }
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed
      }
      return baseUrl ? `${baseUrl}${trimmed.startsWith('/') ? '' : '/'}${trimmed}` : trimmed
    }

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
      q_auth_menores: 'Formato Autorización Menores (Consentimiento)',
      q_compromiso_convivencia: 'Compromiso de Convivencia y Comportamiento',
      fotoIngreso: 'Fotografía de Ingreso',
      grupoJuvenil: 'Grupo al que Pertenece',
      eps: 'EPS',
      contactoEmergencia: 'Contacto / Teléfono Emergencia',
      alergiasMedicas: 'Alergias o Observaciones Médicas',
      discapacidad: 'Discapacidad',
      grupoEtnico: 'Grupo Étnico',
      victima: 'Víctima del Conflicto',
      liderSocial: 'Líder Social'
    }

    if (event.requiredFields) {
      try {
        const config = JSON.parse(event.requiredFields)
        if (config && typeof config === 'object' && Array.isArray(config.customQuestions)) {
          config.customQuestions.forEach((q: any) => {
            if (q && q.id && q.label) questionLabels[q.id] = q.label
          })
        }
      } catch (e) {}
    }

    // Format data for Excel
    const dataToExport = event.registrations.map((reg, index) => {
      const p = reg.person || {}
      
      const specialConditionDisplay = (p.specialCondition === 'INDIGENTE' || p.specialCondition === 'HABITANTE_DE_CALLE')
        ? 'Habitante de calle'
        : (p.specialCondition || 'Ninguna')

      let addData: Record<string, any> = {}
      if (p.additionalData) {
        try {
          const parsed = JSON.parse(p.additionalData)
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            addData = parsed
          }
        } catch (e) {}
      }

      // Format juvenile group nicely
      let grupoJuvenilDisplay = addData.grupoJuvenil || ''
      if (grupoJuvenilDisplay === 'BASE_JUVENIL') grupoJuvenilDisplay = 'Base Juvenil'
      else if (grupoJuvenilDisplay === 'ENLACE_MUNICIPAL') grupoJuvenilDisplay = 'Enlace Municipal'
      else if (grupoJuvenilDisplay === 'CMJ') grupoJuvenilDisplay = 'CMJ (Consejo Municipal de Juventudes)'
      else if (grupoJuvenilDisplay === 'PMJ') grupoJuvenilDisplay = 'PMJ (Plataforma Municipal de Juventudes)'

      const fullName = [p.firstName, p.middleName, p.lastName, p.secondLastName]
        .filter(Boolean)
        .join(' ')

      // Parse checkpoints and find kit scan
      let kitScan: any = null
      let cpList: any[] = []
      if (reg.checkpoints) {
        try {
          const parsedCps = JSON.parse(reg.checkpoints)
          if (Array.isArray(parsedCps)) {
            cpList = parsedCps
            kitScan = cpList.find((c: any) => {
              const n = (c?.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              return n.includes('kit') || n.includes('bienvenida')
            }) || null
          }
        } catch (e) {}
      }
      const hasKit = Boolean(kitScan)

      const row: Record<string, any> = {
        'No.': index + 1,
        'ID Registro': reg.id,
        'Estado de Asistencia': reg.status,
        'Kit de Bienvenida Entregado': hasKit ? 'SÍ' : 'NO',
        'Kit de Bienvenida (Fecha y Hora)': kitScan ? formatColombiaDateTime(kitScan.timestamp) : 'Pendiente',
        'Kit de Bienvenida (Atendido Por)': kitScan?.attendedBy || 'N/A',
        'Fecha de Inscripción': formatColombiaDateTime(reg.registeredAt),
        'Fecha y Hora Ingreso (Puerta)': reg.attendedAt ? formatColombiaDateTime(reg.attendedAt) : 'Pendiente',
        'Atendido Por': reg.attendedBy || 'N/A',
        'Código QR Token': reg.qrToken,
        
        // Identificación y Nombres
        'Tipo Documento': p.documentType || '',
        'Número Documento': p.documentNumber || '',
        'Nombre Completo': fullName,
        'Primer Nombre': p.firstName || '',
        'Segundo Nombre': p.middleName || '',
        'Primer Apellido': p.lastName || '',
        'Segundo Apellido': p.secondLastName || '',

        // Datos Demográficos, Nacimiento y Edad
        'Fecha de Nacimiento': formatBirthDate(p.birthDate),
        'Edad': calculateAge(p.birthDate),
        'Sexo': p.sex || '',
        'Género': p.gender || '',
        'Municipio': p.municipality || '',
        'Zona / Ubicación': p.locationType || '',
        'Nivel Educativo': p.educationLevel || '',
        'Condición Especial': specialConditionDisplay,

        // Salud y Emergencia
        'EPS': addData.eps || '',
        'Contacto / Teléfono Emergencia': addData.contactoEmergencia || '',
        'Alergias o Condiciones Médicas': addData.alergiasMedicas || 'Ninguna',

        // Enfoque Poblacional y Juvenil
        'Grupo al que Pertenece': grupoJuvenilDisplay,
        'Discapacidad': addData.discapacidad || 'No',
        'Grupo Étnico': addData.grupoEtnico || 'No reporta',
        'Víctima del Conflicto': addData.victima || 'No',
        'Líder Social': addData.liderSocial || 'No',

        // Documentos y Consentimiento
        'Consentimiento / Autorización Menores (Enlace)': toFullUrl(addData.q_auth_menores || addData.consentimiento || addData.autorizacion),
        'Compromiso de Convivencia (Enlace)': toFullUrl(addData.q_compromiso_convivencia || addData.compromiso),
        'Fotografía Asistente (Enlace)': toFullUrl(addData.fotoIngreso || addData.foto)
      }

      // Add any additional dynamic questions safely
      const processedKeys = new Set([
        'eps', 'contactoEmergencia', 'alergiasMedicas', 'grupoJuvenil',
        'discapacidad', 'grupoEtnico', 'victima', 'liderSocial',
        'q_auth_menores', 'q_compromiso_convivencia', 'consentimiento', 'autorizacion', 'compromiso',
        'foto', 'fotoIngreso'
      ])

      for (const key of Object.keys(addData)) {
        if (!processedKeys.has(key)) {
          const displayKey = questionLabels[key] || `Info: ${key}`
          let val = addData[key]
          if (typeof val === 'object' && val !== null) {
            val = Array.isArray(val) ? val.join(', ') : JSON.stringify(val)
          } else if (typeof val === 'string') {
            if (val.startsWith('data:image')) {
              val = '[Foto capturada]'
            } else if (val.startsWith('/') || val.startsWith('http')) {
              val = toFullUrl(val)
            }
          } else if (val === null || val === undefined) {
            val = ''
          }
          if (row[displayKey] === undefined && val !== '') {
            row[displayKey] = val
          }
        }
      }

      // Add Checkpoint History
      if (Array.isArray(cpList)) {
        for (const cp of cpList) {
          if (cp && typeof cp === 'object' && cp.name) {
            row[`Entrega: ${cp.name} (Hora)`] = formatColombiaDateTime(cp.timestamp)
            if (cp.attendedBy) {
              row[`Entrega: ${cp.name} (Atendido Por)`] = cp.attendedBy
            }
            if (cp.evidenceUrl) {
              row[`Entrega: ${cp.name} (Foto Evidencia)`] = toFullUrl(cp.evidenceUrl)
            }
          }
        }
      }

      // STRICT PROTECTION: Truncate any string over 1,000 characters to prevent Excel cell limits (32,767 max)
      for (const k of Object.keys(row)) {
        let cellVal = row[k]
        if (typeof cellVal === 'string') {
          if (cellVal.startsWith('data:image')) {
            row[k] = '[Foto capturada]'
          } else if (cellVal.length > 1000) {
            row[k] = cellVal.substring(0, 1000)
          }
        }
      }

      return row
    })

    // Collect all unique headers across all rows in a consistent order
    const standardOrder = [
      'No.', 'ID Registro', 'Estado de Asistencia', 'Kit de Bienvenida Entregado',
      'Kit de Bienvenida (Fecha y Hora)', 'Kit de Bienvenida (Atendido Por)',
      'Fecha de Inscripción', 'Fecha y Hora Ingreso (Puerta)', 'Atendido Por', 'Código QR Token',
      'Tipo Documento', 'Número Documento', 'Nombre Completo', 'Primer Nombre', 'Segundo Nombre',
      'Primer Apellido', 'Segundo Apellido', 'Fecha de Nacimiento', 'Edad', 'Sexo', 'Género',
      'Municipio', 'Zona / Ubicación', 'Nivel Educativo', 'Condición Especial',
      'EPS', 'Contacto / Teléfono Emergencia', 'Alergias o Condiciones Médicas',
      'Grupo al que Pertenece', 'Discapacidad', 'Grupo Étnico', 'Víctima del Conflicto', 'Líder Social',
      'Consentimiento / Autorización Menores (Enlace)', 'Compromiso de Convivencia (Enlace)', 'Fotografía Asistente (Enlace)'
    ]

    const allKeysSet = new Set<string>()
    standardOrder.forEach(k => allKeysSet.add(k))
    dataToExport.forEach(row => {
      Object.keys(row).forEach(k => allKeysSet.add(k))
    })
    const headerList = Array.from(allKeysSet)

    // Fallback if event has zero registrations
    const rowsToExport = dataToExport.length > 0 
      ? dataToExport 
      : [{ 'Aviso': 'No hay participantes registrados en este evento aún.' }]

    const worksheet = dataToExport.length > 0 
      ? xlsx.utils.json_to_sheet(rowsToExport, { header: headerList })
      : xlsx.utils.json_to_sheet(rowsToExport)

    // Set automatic column widths for clean reading in Excel
    const colKeys = dataToExport.length > 0 ? headerList : Object.keys(rowsToExport[0])
    worksheet['!cols'] = colKeys.map(k => ({
      wch: Math.min(Math.max(k.length + 3, 14), 40)
    }))

    const workbook = xlsx.utils.book_new()
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Participantes')

    // Generate buffer as standard Uint8Array
    const buf = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // Clean, short filename (never exceeds Windows MAX_PATH or causes character issues)
    const fileName = 'Reporte_Participantes.xlsx'

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache'
      }
    })
  } catch (error: any) {
    console.error('Error generating excel:', error)
    return NextResponse.json({ error: error?.message || 'Error generando el reporte' }, { status: 500 })
  }
}
