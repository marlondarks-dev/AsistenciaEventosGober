import prisma from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { Users, UserPlus, Shield, Scan, CheckCircle, Trash2 } from 'lucide-react'

export const instant = false

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  })

  async function createUser(formData: FormData) {
    'use server'
    const name = formData.get('name') as string
    const email = (formData.get('email') as string)?.toLowerCase().trim()
    const password = formData.get('password') as string
    const role = formData.get('role') as string || 'VALIDADOR'

    if (!name || !email || !password) return

    const passwordHash = await bcrypt.hash(password, 10)

    try {
      await prisma.user.upsert({
        where: { email },
        update: { name, role, passwordHash },
        create: { name, email, role, passwordHash }
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={28} color="var(--primary)" />
            Gestión de Usuarios y Lectores de QR
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            Administre los usuarios con acceso al sistema y a los escáneres de asistencia / entrega.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Formulario Crear Usuario */}
        <div className="card" style={{ height: 'fit-content' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={20} color="var(--primary)" />
            Crear Usuario / Lector
          </h2>
          
          <form action={createUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Nombre Completo *</label>
              <input type="text" name="name" required placeholder="Ej. Lector Puerta 1" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Correo Electrónico / Usuario *</label>
              <input type="email" name="email" required placeholder="ejemplo@gobernacion.gov.co" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Contraseña *</label>
              <input type="password" name="password" required placeholder="Contraseña de acceso" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>Rol en el Sistema *</label>
              <select name="role" required defaultValue="VALIDADOR" style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontWeight: 500 }}>
                <option value="VALIDADOR">📱 VALIDADOR (Lector de QR / Entregas)</option>
                <option value="ADMIN">🛡️ ADMIN (Administrador Completo)</option>
                <option value="GESTOR">📋 GESTOR (Gestión de Eventos)</option>
                <option value="AUXILIAR">✏️ AUXILIAR (Registro de datos)</option>
                <option value="CONSULTA">🔍 CONSULTA (Solo ver reportes)</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '0.5rem', justifyContent: 'center' }}>
              Guardar Usuario
            </button>
          </form>
        </div>

        {/* Lista de Usuarios */}
        <div className="card md:col-span-2">
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.25rem' }}>
            Usuarios Registrados ({users.length})
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B' }}>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Usuario</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Correo</th>
                  <th style={{ padding: '0.75rem 0.5rem' }}>Rol</th>
                  <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600, color: '#0F172A' }}>
                      {u.name}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', color: '#475569' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem',
                        fontSize: '0.75rem', 
                        fontWeight: 700, 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '20px',
                        backgroundColor: u.role === 'ADMIN' ? '#EFF6FF' : u.role === 'VALIDADOR' ? '#F0FDF4' : '#F8FAFC',
                        color: u.role === 'ADMIN' ? '#1D4ED8' : u.role === 'VALIDADOR' ? '#166534' : '#475569',
                        border: u.role === 'ADMIN' ? '1px solid #BFDBFE' : u.role === 'VALIDADOR' ? '1px solid #BBF7D0' : '1px solid #CBD5E1'
                      }}>
                        {u.role === 'VALIDADOR' ? <Scan size={12} /> : <Shield size={12} />}
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                      <form action={deleteUser} style={{ display: 'inline' }}>
                        <input type="hidden" name="id" value={u.id} />
                        <button type="submit" style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.3rem' }} title="Eliminar usuario">
                          <Trash2 size={16} />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
