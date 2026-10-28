import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'
import { Users, UserPlus, Shield, Scan, CheckCircle, Trash2, Calendar, QrCode, ExternalLink, Info } from 'lucide-react'
import UsersTableClient from './UsersTableClient'

export const instant = false

export default async function UsersPage() {
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN "assignedEventId" TEXT;`)
  } catch (e) {}

  const [users, events] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    }),
    prisma.event.findMany({
      select: { id: true, name: true, status: true, startDate: true },
      orderBy: { startDate: 'desc' }
    })
  ])

  async function createUser(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const email = (formData.get('email') as string)?.toLowerCase().trim()
    const password = formData.get('password') as string
    const role = formData.get('role') as string || 'VALIDADOR'
    const assignedEventId = (formData.get('assignedEventId') as string)?.trim() || null

    if (!name || !email || !password) return

    const passwordHash = await bcrypt.hash(password, 10)

    try {
      await prisma.user.upsert({
        where: { email },
        update: { name, role, passwordHash, assignedEventId },
        create: { name, email, role, passwordHash, assignedEventId }
      })
      revalidatePath('/admin/users')
    } catch (e) {
      console.error(e)
    }
  }

  async function deleteUser(formData: FormData) {
    'use server'
    const id = formData.get('id') as string
    if (!id) return
    try {
      await prisma.user.delete({ where: { id } })
      revalidatePath('/admin/users')
    } catch (e) {}
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0, color: '#0F172A' }}>
            <Users size={28} color="#2563EB" />
            Gestión de Usuarios y Operadores de Escáner
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.92rem', margin: '0.25rem 0 0' }}>
            Crea cuentas exclusivas para cada evento para que los operadores no se confundan de evento ni compartan la misma sesión.
          </p>
        </div>
      </div>

      {/* RECOMENDACIÓN PARA EVENTOS SIMULTÁNEOS */}
      <div style={{
        backgroundColor: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1.75rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}>
        <Info size={20} color="#2563EB" style={{ flexShrink: 0, marginTop: '0.15rem' }} />
        <div style={{ fontSize: '0.85rem', color: '#1E40AF', lineHeight: 1.5 }}>
          <strong>¿Tienes dos o más eventos al mismo tiempo?</strong><br />
          No uses el mismo usuario para varias personas ni para eventos diferentes. Crea un usuario con rol <strong>VALIDADOR</strong> y selecciona el <strong>Evento Asignado</strong> correspondiente. Al iniciar sesión, el operador entrará <strong>directamente al escáner de su evento</strong>, el sistema registrará su nombre en cada refrigerio entregado y evitará que escanee por error a personas de otro evento.
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Formulario Crear Usuario */}
        <div className="card" style={{ height: 'fit-content', padding: '1.5rem', borderRadius: '16px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0F172A' }}>
            <UserPlus size={20} color="#2563EB" />
            Crear Operador / Usuario
          </h2>
          
          <form action={createUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                Nombre del Operador *
              </label>
              <input 
                type="text" 
                name="name" 
                required 
                placeholder="Ej. Carlos Pérez (Refrigerios Juventudes)" 
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }} 
              />
              <span style={{ fontSize: '0.72rem', color: '#64748B' }}>Este nombre aparecerá en los reportes de quién entregó cada refrigerio.</span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                Correo / Nombre de Usuario *
              </label>
              <input 
                type="email" 
                name="email" 
                required 
                placeholder="operador1@gobernacion.gov.co" 
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                Contraseña de Acceso *
              </label>
              <input 
                type="password" 
                name="password" 
                required 
                placeholder="Mínimo 6 caracteres" 
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.9rem' }} 
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#334155' }}>
                Rol en el Sistema *
              </label>
              <select 
                name="role" 
                required 
                defaultValue="VALIDADOR" 
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontWeight: 600, fontSize: '0.85rem', backgroundColor: '#FFFFFF' }}
              >
                <option value="VALIDADOR">📱 VALIDADOR (Lector QR / Entrega Refrigerios)</option>
                <option value="ADMIN">🛡️ ADMIN (Acceso Total y Configuración)</option>
                <option value="GESTOR">📋 GESTOR (Gestión y Edición de Eventos)</option>
                <option value="AUXILIAR">✏️ AUXILIAR (Solo Registro y Formularios)</option>
                <option value="CONSULTA">🔍 CONSULTA (Solo Ver y Exportar)</option>
              </select>
            </div>

            {/* EVENTO ASIGNADO (EXCLUSIVIDAD) */}
            <div style={{ backgroundColor: '#F8FAFC', padding: '0.85rem', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.35rem', color: '#0F172A' }}>
                🎪 Evento Asignado:
              </label>
              <select 
                name="assignedEventId" 
                defaultValue=""
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.82rem', fontWeight: 600, backgroundColor: '#FFFFFF' }}
              >
                <option value="">🌐 Todos los eventos (Sin exclusividad)</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    🎪 {ev.name} ({ev.status})
                  </option>
                ))}
              </select>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.74rem', color: '#64748B', lineHeight: 1.3 }}>
                Si seleccionas un evento, el usuario entrará <strong>directamente a su escáner</strong> al iniciar sesión y no se confundirá con los otros eventos.
              </p>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ marginTop: '0.5rem', justifyContent: 'center', padding: '0.75rem', fontWeight: 700, backgroundColor: '#2563EB' }}
            >
              Guardar Usuario
            </button>
          </form>
        </div>

        {/* Lista de Usuarios */}
        <div className="card md:col-span-2" style={{ padding: '1.5rem', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
              Usuarios Registrados ({users.length})
            </h2>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
              {events.length} evento(s) disponibles
            </span>
          </div>

          <UsersTableClient users={users} events={events} deleteUserAction={deleteUser} />
        </div>

      </div>
    </div>
  )
}
