import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getSession } from '@/lib/auth'

const MASTER_PINS = [
  process.env.ADMIN_MASTER_PIN,
  'Gober2026*',
  'GoberPili2026*',
  'pili_gobernacion_secret_key_2026_nds'
].filter(Boolean) as string[]

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, email, newPassword, masterPin } = body

    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 4 caracteres.' },
        { status: 400 }
      )
    }

    const session = await getSession()

    // 1. Restablecimiento realizado por un Administrador desde el panel
    if (session && (session.role === 'ADMIN' || session.role === 'GESTOR') && userId) {
      const passwordHash = await bcrypt.hash(newPassword, 10)
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { passwordHash }
      })

      return NextResponse.json({
        success: true,
        message: 'Contraseña actualizada correctamente.',
        user: { id: updated.id, name: updated.name, email: updated.email }
      })
    }

    // 2. Restablecimiento de emergencia desde /login con PIN Maestro
    if (email && masterPin) {
      const isValidPin = MASTER_PINS.includes(masterPin.toString().trim())
      if (!isValidPin) {
        return NextResponse.json(
          { error: 'El PIN Maestro de Seguridad es incorrecto.' },
          { status: 403 }
        )
      }

      const normalizedEmail = email.toString().toLowerCase().trim()
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      })

      if (!user) {
        return NextResponse.json(
          { error: `No se encontró ningún usuario registrado con el correo "${normalizedEmail}".` },
          { status: 404 }
        )
      }

      const passwordHash = await bcrypt.hash(newPassword, 10)
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash }
      })

      return NextResponse.json({
        success: true,
        message: '¡Contraseña restablecida exitosamente! Ya puedes iniciar sesión con tu nueva clave.'
      })
    }

    return NextResponse.json(
      { error: 'No autorizado o faltan parámetros requeridos.' },
      { status: 401 }
    )
  } catch (err: any) {
    console.error('Reset password error:', err)
    return NextResponse.json(
      { error: err.message || 'Error al restablecer la contraseña.' },
      { status: 500 }
    )
  }
}
