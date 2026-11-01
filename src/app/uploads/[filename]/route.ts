import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params

    if (!filename) {
      return new NextResponse('Filename missing', { status: 400 })
    }

    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename)

    // Candidate directories where photos can be found
    const candidateDirs = [
      path.join(process.cwd(), 'public', 'uploads'),
      '/var/data/asistencia/uploads',
      path.join(process.cwd(), 'uploads'),
      '/var/www/asistenciaeventos/public/uploads'
    ]

    for (const dir of candidateDirs) {
      const candidatePath = path.join(/*turbopackIgnore: true*/ dir, safeFilename)
      if (fs.existsSync(/*turbopackIgnore: true*/ candidatePath)) {
        const fileBuffer = fs.readFileSync(/*turbopackIgnore: true*/ candidatePath)
        const ext = path.extname(safeFilename).toLowerCase()

        let contentType = 'application/octet-stream'
        if (ext === '.pdf') contentType = 'application/pdf'
        else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg'
        else if (ext === '.png') contentType = 'image/png'
        else if (ext === '.webp') contentType = 'image/webp'
        else if (ext === '.svg') contentType = 'image/svg+xml'
        else if (ext === '.gif') contentType = 'image/gif'
        else if (ext === '.doc') contentType = 'application/msword'
        else if (ext === '.docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': contentType,
            'Content-Disposition': ext === '.pdf' || ext.startsWith('.jp') || ext === '.png' || ext === '.webp' ? `inline; filename="${safeFilename}"` : `attachment; filename="${safeFilename}"`,
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*',
          },
        })
      }
    }

    return new NextResponse('Imagen no encontrada', { status: 404 })
  } catch (error: any) {
    console.error('Error serving upload:', error)
    return new NextResponse('Error al cargar la imagen', { status: 500 })
  }
}
