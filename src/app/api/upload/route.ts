import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
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

    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `${randomUUID()}.${ext}`
    
    // Save to public/uploads
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')
    
    try {
      await mkdir(uploadDir, { recursive: true })
    } catch (err) {
      // Ignore if dir exists
    }
    
    const filePath = path.join(uploadDir, filename)
    await writeFile(filePath, buffer)

    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch (e: any) {
    console.error('Upload Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
