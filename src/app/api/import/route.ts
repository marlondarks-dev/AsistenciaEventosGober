import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as xlsx from 'xlsx'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Read the Excel file
    const workbook = xlsx.read(buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // We convert it to a 2D array to find the header row
    const rows = xlsx.utils.sheet_to_json<any[]>(worksheet, { header: 1 })
    
    let headerRowIndex = -1
    // Simple heuristic: find a row that contains "DOCUMENTO" or "IDENTIDAD"
    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i] || []
      const joinedRow = row.join(' ').toUpperCase()
      if (joinedRow.includes('DOCUMENTO') || joinedRow.includes('IDENTIDAD') || joinedRow.includes('NOMBRES')) {
        headerRowIndex = i
        break
      }
    }

    if (headerRowIndex === -1) {
      return NextResponse.json({ error: 'No se pudo detectar la fila de encabezados en el archivo Excel.' }, { status: 400 })
    }

    // Now convert to JSON using that specific header row
    const data = xlsx.utils.sheet_to_json<any>(worksheet, {
      range: headerRowIndex,
      defval: null
    })

    let importedCount = 0
    let updatedCount = 0
    let errorCount = 0

    // Mapping heuristics for dynamic PILI format
    const findKey = (obj: any, keywords: string[]) => {
      const keys = Object.keys(obj)
      for (const k of keys) {
        const kUpper = k.toUpperCase()
        if (keywords.some(kw => kUpper.includes(kw))) {
          return obj[k]
        }
      }
      return null
    }

    for (const row of data) {
      // Extract required fields
      const documentNumber = findKey(row, ['DOCUMENTO', 'IDENTIFICACIÓN', 'IDENTIFICACION', 'CEDULA', 'CÉDULA', 'NUMERO'])?.toString().trim()
      const documentType = findKey(row, ['TIPO DE DOCUMENTO', 'TIPO DOC', 'TIPO_DOC']) || 'CC'
      const firstName = findKey(row, ['PRIMER NOMBRE', 'NOMBRE 1', 'NOMBRES'])?.toString().trim() || 'Sin Nombre'
      const middleName = findKey(row, ['SEGUNDO NOMBRE', 'NOMBRE 2'])?.toString().trim()
      const lastName = findKey(row, ['PRIMER APELLIDO', 'APELLIDO 1', 'APELLIDOS'])?.toString().trim() || 'Sin Apellido'
      const secondLastName = findKey(row, ['SEGUNDO APELLIDO', 'APELLIDO 2'])?.toString().trim()

      if (!documentNumber) {
        errorCount++
        continue
      }

      // Find other PILI specific data
      const gender = findKey(row, ['GENERO', 'GÉNERO'])
      const sex = findKey(row, ['SEXO'])
      const municipality = findKey(row, ['MUNICIPIO'])
      const educationLevel = findKey(row, ['ESCOLARIDAD'])

      const personData = {
        documentType: String(documentType).trim(),
        firstName,
        middleName,
        lastName,
        secondLastName,
        gender: gender ? String(gender).trim() : null,
        sex: sex ? String(sex).trim() : null,
        municipality: municipality ? String(municipality).trim() : null,
        educationLevel: educationLevel ? String(educationLevel).trim() : null,
        additionalData: JSON.stringify(row) // Store the rest just in case
      }

      try {
        const existing = await prisma.person.findUnique({
          where: {
            documentType_documentNumber: {
              documentType: String(documentType).trim(),
              documentNumber
            }
          }
        })

        if (existing) {
          // Update missing fields
          await prisma.person.update({
            where: { id: existing.id },
            data: {
              firstName: existing.firstName === 'Sin Nombre' ? firstName : undefined,
              lastName: existing.lastName === 'Sin Apellido' ? lastName : undefined,
              municipality: existing.municipality ? undefined : personData.municipality,
              additionalData: personData.additionalData
            }
          })
          updatedCount++
        } else {
          // Create new
          await prisma.person.create({
            data: {
              documentNumber,
              ...personData
            }
          })
          importedCount++
        }
      } catch (err) {
        errorCount++
      }
    }

    await prisma.importHistory.create({
      data: {
        filename: file.name,
        importedBy: 'Admin', // Hardcoded for now
        recordsTotal: data.length,
        recordsNew: importedCount,
        recordsUpdated: updatedCount,
        recordsRejected: errorCount
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Importación completada',
      results: {
        total: data.length,
        imported: importedCount,
        updated: updatedCount,
        errors: errorCount
      }
    })
  } catch (error: any) {
    console.error('Import error:', error)
    return NextResponse.json({ error: error.message || 'Error en la importación' }, { status: 500 })
  }
}
