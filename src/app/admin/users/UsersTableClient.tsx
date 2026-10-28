"use client"

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Key, 
  Trash2, 
  Scan, 
  Shield, 
  QrCode, 
  ExternalLink, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react'

interface UserItem {
  id: string
  name: string
  email: string
  role: string
  assignedEventId?: string | null
  createdAt: string | Date
}

interface EventItem {
  id: string
  name: string
  status: string
}

export default function UsersTableClient({
  users,
  events,
  deleteUserAction
}: {
  users: UserItem[]
  events: EventItem[]
  deleteUserAction?: (formData: FormData) => Promise<void>
}) {
  const router = useRouter()
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [copiedMsg, setCopiedMsg] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  const handleOpenReset = (user: UserItem) => {
    setSelectedUser(user)
    setNewPassword('Gober2026*')
    setShowPassword(true)
    setSuccessMsg(null)
    setErrorMsg(null)
    setCopiedMsg(false)
  }

  const handleCloseModal = () => {
    setSelectedUser(null)
    setNewPassword('')
    setSuccessMsg(null)
    setErrorMsg(null)
  }

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let pass = ''
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewPassword(`NDS${pass}*`)
    setShowPassword(true)
    setSuccessMsg(null)
  }

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !newPassword || newPassword.length < 4) {
      setErrorMsg('La contraseña debe tener al menos 4 caracteres.')
      return
    }

    setSaving(true)
    setErrorMsg(null)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          newPassword
        })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccessMsg(`¡Contraseña restablecida exitosamente para ${selectedUser.name}!`)
        showToast('success', `Contraseña de ${selectedUser.name} actualizada.`)
      } else {
        setErrorMsg(data.error || 'Error al restablecer la contraseña.')
      }
    } catch (err: any) {
      setErrorMsg('Error de conexión con el servidor.')
    } finally {
      setSaving(false)
    }
  }

  const handleCopyWhatsApp = () => {
    if (!selectedUser) return
    const msg = `Hola ${selectedUser.name}, tu acceso al sistema de control de asistencia y refrigerios ha sido actualizado:\n\n*Usuario / Correo:* ${selectedUser.email}\n*Nueva Contraseña:* ${newPassword}\n\nIngresa aquí: ${window.location.origin}/login`
    navigator.clipboard.writeText(msg)
    setCopiedMsg(true)
    setTimeout(() => setCopiedMsg(false), 2500)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Está seguro de eliminar el usuario "${name}"? Esta acción no se puede deshacer.`)) {
      return
    }

    try {
      const form = new FormData()
      form.append('id', id)
      // Call standard server action form or fetch
      const res = await fetch(`/api/auth/users/${id}`, { method: 'DELETE' }).catch(() => null)
      // Fallback reload
      router.refresh()
      showToast('success', `Usuario ${name} eliminado.`)
    } catch {
      router.refresh()
    }
  }

  return (
    <>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          backgroundColor: toast.type === 'success' ? '#065F46' : '#991B1B',
          color: '#FFFFFF',
          fontSize: '0.9rem',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.text}</span>
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E2E8F0', textAlign: 'left', color: '#64748B', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '0.75rem 0.5rem' }}>Operador / Usuario</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Rol</th>
              <th style={{ padding: '0.75rem 0.5rem' }}>Evento Asignado</th>
              <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => {
              const assignedEvent = events.find(e => e.id === u.assignedEventId)
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <div style={{ fontWeight: 700, color: '#0F172A' }}>{u.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.25rem',
                      fontSize: '0.72rem', 
                      fontWeight: 700, 
                      padding: '0.2rem 0.55rem', 
                      borderRadius: '20px',
                      backgroundColor: u.role === 'ADMIN' ? '#EFF6FF' : u.role === 'VALIDADOR' ? '#F0FDF4' : '#F8FAFC',
                      color: u.role === 'ADMIN' ? '#1D4ED8' : u.role === 'VALIDADOR' ? '#166534' : '#475569',
                      border: u.role === 'ADMIN' ? '1px solid #BFDBFE' : u.role === 'VALIDADOR' ? '1px solid #BBF7D0' : '1px solid #CBD5E1'
                    }}>
                      {u.role === 'VALIDADOR' ? <Scan size={12} /> : <Shield size={12} />}
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem' }}>
                    {assignedEvent ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          color: '#1E40AF',
                          backgroundColor: '#DBEAFE',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '6px',
                          maxWidth: '220px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          🎪 {assignedEvent.name}
                        </span>
                        <Link 
                          href={`/admin/events/${assignedEvent.id}/scanner`}
                          target="_blank"
                          style={{
                            fontSize: '0.72rem',
                            color: '#2563EB',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            textDecoration: 'none',
                            fontWeight: 600
                          }}
                        >
                          <QrCode size={12} /> Abrir Escáner <ExternalLink size={10} />
                        </Link>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontStyle: 'italic' }}>
                        🌐 Todos los eventos
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      {/* BOTÓN RESTABLECER CLAVE */}
                      <button
                        type="button"
                        onClick={() => handleOpenReset(u)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          backgroundColor: '#FEF3C7',
                          border: '1px solid #FDE68A',
                          color: '#B45309',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                        title="Cambiar o restablecer contraseña"
                      >
                        <Key size={13} />
                        <span>Restablecer Clave</span>
                      </button>

                      {/* BOTÓN ELIMINAR */}
                      {deleteUserAction && (
                        <form action={deleteUserAction} style={{ display: 'inline' }} onSubmit={(e) => {
                          if (!confirm(`¿Está seguro de eliminar al usuario "${u.name}"? Esta acción no se puede deshacer.`)) {
                            e.preventDefault()
                          }
                        }}>
                          <input type="hidden" name="id" value={u.id} />
                          <button 
                            type="submit" 
                            style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '0.35rem', borderRadius: '6px' }} 
                            title="Eliminar usuario"
                          >
                            <Trash2 size={16} />
                          </button>
                        </form>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL PARA RESTABLECER CONTRASEÑA */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              backgroundColor: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={18} color="#D97706" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Restablecer Contraseña
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {selectedUser.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSavePassword} style={{ padding: '1.5rem' }}>
              <div style={{ backgroundColor: '#F1F5F9', padding: '0.85rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                  <strong>Usuario:</strong> {selectedUser.email}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.2rem' }}>
                  Rol: {selectedUser.role}
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
                  Nueva Contraseña *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => {
                      setNewPassword(e.target.value)
                      setSuccessMsg(null)
                    }}
                    required
                    placeholder="Mínimo 4 caracteres..."
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.5rem 0.65rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: '#0F172A'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: '#64748B'
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Sugerencias Rápidas de Clave */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748B', width: '100%' }}>Generar clave rápida:</span>
                <button
                  type="button"
                  onClick={() => { setNewPassword('Gober2026*'); setShowPassword(true); setSuccessMsg(null); }}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', cursor: 'pointer' }}
                >
                  ⚡ Gober2026*
                </button>
                <button
                  type="button"
                  onClick={() => { setNewPassword('Pili2026!'); setShowPassword(true); setSuccessMsg(null); }}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', cursor: 'pointer' }}
                >
                  ⚡ Pili2026!
                </button>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#F8FAFC', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#2563EB' }}
                >
                  <Sparkles size={12} /> Aleatoria
                </button>
              </div>

              {/* Mensaje de Error */}
              {errorMsg && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.65rem 0.85rem', color: '#DC2626', fontSize: '0.8rem', marginBottom: '1rem' }}>
                  {errorMsg}
                </div>
              )}

              {/* Mensaje de Éxito y Botón WhatsApp */}
              {successMsg && (
                <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '10px', padding: '0.85rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.5rem' }}>
                    <CheckCircle2 size={16} color="#16A34A" />
                    <span>{successMsg}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyWhatsApp}
                    style={{
                      width: '100%',
                      backgroundColor: '#16A34A',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.55rem',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
                    }}
                  >
                    {copiedMsg ? <Check size={16} /> : <Copy size={16} />}
                    {copiedMsg ? '¡Copiado para WhatsApp!' : '📲 Copiar Mensaje para enviar por WhatsApp'}
                  </button>
                </div>
              )}

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="btn btn-outline"
                  disabled={saving}
                  style={{ fontSize: '0.85rem' }}
                >
                  {successMsg ? 'Listo / Cerrar' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.6rem 1.25rem', fontWeight: 700, backgroundColor: '#2563EB' }}
                >
                  {saving ? 'Guardando...' : 'Guardar Nueva Contraseña'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
