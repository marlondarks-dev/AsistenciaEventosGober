"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Mail, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  ChevronDown, 
  ChevronUp, 
  Users, 
  Copy, 
  X,
  ShieldCheck,
  Globe
} from 'lucide-react'

interface EmailAccessManagerProps {
  eventId: string
  eventName: string
  initialRestricted?: boolean
  initialEmails?: string[]
}

export default function EmailAccessManager({
  eventId,
  eventName,
  initialRestricted = false,
  initialEmails = []
}: EmailAccessManagerProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isRestricted, setIsRestricted] = useState(initialRestricted)
  const [emails, setEmails] = useState<string[]>(initialEmails.map(e => e.trim().toLowerCase()))
  const [pasteInput, setPasteInput] = useState('')
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  // Parse emails from text input
  const handleAddEmails = () => {
    if (!pasteInput.trim()) return

    const parsed = pasteInput
      .split(/[\n,; \t]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.includes('@') && e.includes('.'))

    if (parsed.length === 0) {
      showToast('error', 'No se encontraron correos electrónicos válidos para agregar.')
      return
    }

    const merged = Array.from(new Set([...emails, ...parsed]))
    const newCount = merged.length - emails.length
    setEmails(merged)
    setPasteInput('')
    showToast('success', `Se agregaron ${newCount} correo(s) nuevo(s) a la lista.`)
  }

  const handleRemoveEmail = (target: string) => {
    setEmails(emails.filter(e => e !== target))
  }

  const handleClearAll = () => {
    if (confirm('¿Está seguro de vaciar toda la lista de correos autorizados?')) {
      setEmails([])
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restrictedByEmail: isRestricted,
          allowedEmails: emails
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar configuración de correos')
      }

      showToast('success', '¡Configuración de acceso por correo guardada con éxito!')
      router.refresh()
    } catch (err: any) {
      showToast('error', err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const filteredEmails = emails.filter(e => e.toLowerCase().includes(search.toLowerCase().trim()))

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      borderRadius: '16px',
      border: isRestricted ? '1.5px solid #818CF8' : '1px solid #E2E8F0',
      boxShadow: isRestricted ? '0 4px 20px rgba(99, 102, 241, 0.08)' : '0 2px 8px rgba(0,0,0,0.03)',
      overflow: 'hidden',
      transition: 'all 0.2s ease'
    }}>
      {/* Toast notification */}
      {toast && (
        <div style={{
          padding: '0.75rem 1.25rem',
          backgroundColor: toast.type === 'success' ? '#065F46' : '#991B1B',
          color: '#FFFFFF',
          fontSize: '0.85rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          transition: 'all 0.3s ease'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header bar / Summary */}
      <div style={{
        padding: '1.25rem 1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        backgroundColor: isRestricted ? '#F5F3FF' : '#F8FAFC',
        borderBottom: isOpen ? '1px solid #E2E8F0' : 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: isRestricted ? '#EDE9FE' : '#EFF6FF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isRestricted ? '#6D28D9' : '#2563EB',
            flexShrink: 0
          }}>
            {isRestricted ? <Lock size={22} /> : <Globe size={22} />}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Control de Acceso por Correo (Invitación)
              </h3>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '0.2rem 0.65rem',
                borderRadius: '20px',
                backgroundColor: isRestricted ? '#DDD6FE' : '#DCFCE7',
                color: isRestricted ? '#5B21B6' : '#15803D',
                border: `1px solid ${isRestricted ? '#C4B5FD' : '#BBF7D0'}`
              }}>
                {isRestricted ? `🔒 Restringido (${emails.length} correos)` : '🌐 Formulario Público (Abierto a todos)'}
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.2rem 0 0' }}>
              {isRestricted 
                ? 'Solo las personas con los correos autorizados podrán abrir y diligenciar el formulario de pre-registro.' 
                : 'El formulario está abierto al público general. Puedes activar la restricción por lista de correos en cualquier momento.'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="btn btn-outline"
            style={{
              padding: '0.45rem 0.9rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              backgroundColor: '#FFFFFF'
            }}
          >
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{isOpen ? 'Ocultar Opciones' : 'Gestionar Correos'}</span>
          </button>
        </div>
      </div>

      {/* Expandable Configuration Body */}
      {isOpen && (
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Toggle Switch */}
          <div style={{
            padding: '1rem 1.25rem',
            backgroundColor: isRestricted ? '#EEF2FF' : '#F1F5F9',
            borderRadius: '12px',
            border: isRestricted ? '1.5px solid #A5B4FC' : '1px solid #CBD5E1',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <strong style={{ display: 'block', fontSize: '0.95rem', color: '#0F172A', marginBottom: '0.2rem' }}>
                Restringir acceso al formulario solo a correos autorizados
              </strong>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Si se activa, el formulario pedirá primero el correo. Solo quienes estén en la lista podrán continuar.
              </span>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
              <input 
                type="checkbox"
                checked={isRestricted}
                onChange={e => setIsRestricted(e.target.checked)}
                style={{ width: '1.3rem', height: '1.3rem', accentColor: '#4F46E5', cursor: 'pointer' }}
              />
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: isRestricted ? '#4338CA' : '#475569' }}>
                {isRestricted ? 'Activado' : 'Desactivado'}
              </span>
            </label>
          </div>

          {/* Paste & Add Box */}
          <div style={{
            padding: '1.25rem',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC'
          }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
              Pegar o escribir correos electrónicos para autorizar:
            </label>
            <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 0.65rem 0' }}>
              Puedes copiar y pegar listas completas desde Excel, correos separados por comas, espacios o saltos de línea (Ej: <code>juan@gmail.com, maria@gobernacion.gov.co</code>).
            </p>

            <textarea
              rows={3}
              value={pasteInput}
              onChange={e => setPasteInput(e.target.value)}
              placeholder="juan.perez@gmail.com&#10;maria.rodriguez@nortedesantander.gov.co&#10;carlos@empresa.com..."
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.85rem',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                color: '#0F172A',
                fontFamily: 'monospace'
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                {pasteInput.trim() ? `${pasteInput.split(/[\n,; \t]+/).filter(e => e.includes('@')).length} correos detectados en el texto` : 'Ingresa los correos y pulsa agregar'}
              </span>

              <button
                type="button"
                onClick={handleAddEmails}
                disabled={!pasteInput.trim()}
                className="btn btn-primary"
                style={{
                  padding: '0.45rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: '#4F46E5',
                  borderRadius: '8px'
                }}
              >
                <Plus size={16} />
                Agregar a la Lista de Autorizados
              </button>
            </div>
          </div>

          {/* Current Whitelist Section */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '0.92rem', color: '#1E293B' }}>
                  Lista de Correos Autorizados ({emails.length})
                </strong>
                {emails.length > 0 && (
                  <span style={{ fontSize: '0.72rem', backgroundColor: '#EDE9FE', color: '#6D28D9', padding: '0.15rem 0.5rem', borderRadius: '12px', fontWeight: 700 }}>
                    Activos
                  </span>
                )}
              </div>

              {emails.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#DC2626',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Trash2 size={13} /> Vaciar lista completa
                </button>
              )}
            </div>

            {/* Search within allowed emails */}
            {emails.length > 5 && (
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <Search size={14} color="#94A3B8" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar correo en la lista..."
                  style={{
                    width: '100%',
                    padding: '0.45rem 0.75rem 0.45rem 2.25rem',
                    fontSize: '0.82rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF'
                  }}
                />
              </div>
            )}

            {/* Emails List / Tags */}
            {emails.length === 0 ? (
              <div style={{ padding: '1.75rem', textAlign: 'center', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px dashed #CBD5E1', color: '#64748B', fontSize: '0.85rem' }}>
                <Mail size={32} color="#94A3B8" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ margin: 0 }}>No hay correos autorizados en la lista.</p>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Pega o escribe los correos en la caja de arriba para cargarlos.</span>
              </div>
            ) : (
              <div style={{
                maxHeight: '260px',
                overflowY: 'auto',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                padding: '0.85rem',
                backgroundColor: '#F8FAFC',
                borderRadius: '10px',
                border: '1px solid #E2E8F0'
              }}>
                {filteredEmails.map(email => (
                  <div
                    key={email}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      padding: '0.3rem 0.65rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      color: '#1E293B',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
                    }}
                  >
                    <Mail size={13} color="#6366F1" />
                    <span>{email}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(email)}
                      title={`Quitar ${email}`}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#94A3B8',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 2px',
                        marginLeft: '2px'
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = '#EF4444'}
                      onMouseLeave={e => e.currentTarget.style.color = '#94A3B8'}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #E2E8F0',
            paddingTop: '1.25rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
              {isRestricted ? (
                emails.length === 0 ? (
                  <span style={{ color: '#DC2626', fontWeight: 600 }}>⚠️ La restricción está activa pero no has agregado ningún correo.</span>
                ) : (
                  <span>✅ Se autorizarán <strong>{emails.length} personas</strong> para este evento.</span>
                )
              ) : (
                <span>El evento permanecerá con acceso público y abierto.</span>
              )}
            </span>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="btn btn-outline"
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
              >
                Cerrar
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary"
                style={{
                  padding: '0.5rem 1.25rem',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  backgroundColor: '#4F46E5',
                  borderRadius: '8px'
                }}
              >
                <Save size={16} />
                {saving ? 'Guardando...' : 'Guardar Configuración'}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
