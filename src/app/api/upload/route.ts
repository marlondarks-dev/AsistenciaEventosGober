import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import fs from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  try {
    const data = await req.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const rawExt = file.name ? file.name.split('.').pop() || 'jpg' : 'jpg'
    const ext = rawExt.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
    const filename = `${randomUUID()}.${ext}`

    // 1. Primary public/uploads directory
    const publicUploadDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(publicUploadDir, { recursive: true })
    await writeFile(path.join(publicUploadDir, filename), buffer)

    // 2. Persistent storage in /var/data/asistencia/uploads (if on production server)
    if (fs.existsSync('/var/data/asistencia')) {
      try {
        const prodUploadDir = '/var/data/asistencia/uploads'
        await mkdir(prodUploadDir, { recursive: true })
        await writeFile(path.join(prodUploadDir, filename), buffer)
      } catch (e) {
        console.error('Could not duplicate to /var/data/asistencia/uploads:', e)
      }
    }

    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch (e: any) {
    console.error('Upload Error:', e)
    return NextResponse.json({ error: e.message || 'Error al procesar el archivo' }, { status: 500 })
  }
}
