"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ArrowLeft, ShieldCheck, Key, X, CheckCircle2, Sparkles, HelpCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estados para recuperación de contraseña
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetPin, setResetPin] = useState('')
  const [newResetPassword, setNewResetPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [forgotError, setForgotError] = useState<string | null>(null)
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null)

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError(null)
    setForgotSuccess(null)
    setResetLoading(true)

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: resetEmail,
          masterPin: resetPin,
          newPassword: newResetPassword
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al restablecer la contraseña.')
      }

      setForgotSuccess(data.message || '¡Contraseña restablecida exitosamente!')
      setEmail(resetEmail)
      setPassword(newResetPassword)
    } catch (err: any) {
      setForgotError(err.message || 'Error al conectar con el servidor')
    } finally {
      setResetLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Credenciales inválidas.')
      }

      // If redirect query param exists, use it; otherwise, if user has an assigned event, go straight to its scanner
      const searchParams = new URLSearchParams(window.location.search)
      const explicitRedirect = searchParams.get('redirect')
      const redirectUrl = explicitRedirect || (data.user?.assignedEventId ? `/admin/events/${data.user.assignedEventId}/scanner` : '/admin')
      
      router.push(redirectUrl)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'Error al conectar con el servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundImage: 'url(/bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
      position: 'relative',
      padding: '1.5rem'
    }}>
      {/* Background Overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 1
      }} />

      <div className="card animate-fade-in" style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: '520px',
        width: '100%',
        padding: '2rem 2.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        textAlign: 'center'
      }}>
        {/* Back Link */}
        <div style={{ textAlign: 'left', marginBottom: '0.75rem' }}>
          <Link 
            href="/" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              fontSize: '0.82rem', 
              color: '#64748B', 
              fontWeight: 600,
              textDecoration: 'none'
            }}
          >
            <ArrowLeft size={16} /> Volver al inicio
          </Link>
        </div>

        {/* Logo */}
        <div style={{
          width: '120px',
          height: '85px',
          margin: '0 auto 0.75rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img src="/logo.png" alt="Logo Gobernación" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        {/* Badge */}
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '0.4rem', 
          backgroundColor: '#EFF6FF', 
          color: '#1D4ED8', 
          padding: '0.25rem 0.75rem', 
          borderRadius: '20px', 
          fontSize: '0.72rem', 
          fontWeight: 800, 
          border: '1px solid #BFDBFE', 
          marginBottom: '0.6rem' 
        }}>
          <ShieldCheck size={14} /> ACCESO PRIVADO ADMINISTRATIVO
        </div>

        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.25rem', letterSpacing: '-0.02em' }}>
          Portal Administrativo PILI
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '1.25rem', lineHeight: '1.4' }}>
          Ingresa tus credenciales autorizadas para gestionar eventos, inscripciones y reportes.
        </p>

        {error && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: '#FEF2F2',
            borderLeft: '4px solid #EF4444',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            textAlign: 'left'
          }}>
            <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.82rem', color: '#B91C1C', fontWeight: 500 }}>
              {error}
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Correo Electrónico *
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@gobernacion.gov.co"
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.5rem',
                  fontSize: '0.9rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                  backgroundColor: '#FFFFFF'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.35rem' }}>
              Contraseña *
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#94A3B8" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '0.65rem 2.5rem 0.65rem 2.5rem',
                  fontSize: '0.9rem',
                  borderRadius: '10px',
                  border: '1px solid #CBD5E1',
                  outline: 'none',
                  backgroundColor: '#FFFFFF'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.85rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Olvidaste tu contraseña */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.45rem' }}>
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(true)
                setForgotError(null)
                setForgotSuccess(null)
                setResetEmail(email || '')
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#2563EB',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
                textDecoration: 'underline'
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.8rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderRadius: '10px',
              marginTop: '0.25rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1
            }}
          >
            <LogIn size={18} />
            <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', fontSize: '0.75rem', color: '#94A3B8' }}>
          Sistema de Inscripciones y Control de Asistencia PILI<br />
          © 2026 Gobernación de Norte de Santander
        </div>
      </div>

      {/* MODAL RECUPERACIÓN DE CONTRASEÑA */}
      {showForgotModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.25rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            maxWidth: '480px',
            width: '100%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
            border: '1px solid #E2E8F0',
            overflow: 'hidden',
            textAlign: 'left'
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Key size={20} color="#2563EB" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                    Recuperación de Contraseña
                  </h3>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748B' }}>
                    Opciones de restablecimiento para el equipo
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '1.5rem', maxHeight: '80vh', overflowY: 'auto' }}>
              
              {/* Opción 1: Validadores / Operadores en campo */}
              <div style={{
                backgroundColor: '#F0FDF4',
                border: '1px solid #BBF7D0',
                borderRadius: '12px',
                padding: '1rem',
                marginBottom: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#166534', marginBottom: '0.35rem' }}>
                  <HelpCircle size={17} color="#16A34A" />
                  <span>¿Eres Operador de Escáner o Validador?</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#14532D', lineHeight: 1.45 }}>
                  Por seguridad, si olvidaste tu clave en el lugar del evento, <strong>contacta a tu Coordinador o Administrador</strong>. Él puede restablecer tu contraseña inmediatamente desde el panel y enviártela por WhatsApp.
                </p>
              </div>

              {/* Opción 2: Formulario de Restablecimiento con PIN Maestro */}
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '1.1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.85rem', color: '#1E293B', marginBottom: '0.75rem' }}>
                  <ShieldCheck size={17} color="#2563EB" />
                  <span>Restablecimiento con PIN Maestro (Administradores)</span>
                </div>

                <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      Correo Registrado *
                    </label>
                    <input
                      type="email"
                      required
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="admin@gobernacion.gov.co"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        fontSize: '0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      PIN Maestro de Seguridad *
                    </label>
                    <input
                      type="password"
                      required
                      value={resetPin}
                      onChange={e => setResetPin(e.target.value)}
                      placeholder="PIN Maestro (ej. Gober2026*)"
                      style={{
                        width: '100%',
                        padding: '0.55rem 0.75rem',
                        fontSize: '0.85rem',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                      Nueva Contraseña *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        required
                        value={newResetPassword}
                        onChange={e => setNewResetPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres..."
                        style={{
                          width: '100%',
                          padding: '0.55rem 2.25rem 0.55rem 0.75rem',
                          fontSize: '0.85rem',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        style={{
                          position: 'absolute',
                          right: '0.6rem',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94A3B8'
                        }}
                      >
                        {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {forgotError && (
                    <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.6rem 0.75rem', color: '#DC2626', fontSize: '0.78rem' }}>
                      {forgotError}
                    </div>
                  )}

                  {forgotSuccess && (
                    <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px', padding: '0.6rem 0.75rem', color: '#166534', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <CheckCircle2 size={16} color="#16A34A" />
                      <span>{forgotSuccess}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <button
                      type="submit"
                      disabled={resetLoading}
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        backgroundColor: '#2563EB',
                        borderRadius: '8px',
                        justifyContent: 'center'
                      }}
                    >
                      {resetLoading ? 'Verificando...' : 'Restablecer mi Contraseña'}
                    </button>
                  </div>
                </form>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{ padding: '0.85rem 1.5rem', backgroundColor: '#F8FAFC', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="btn btn-outline"
                style={{ fontSize: '0.82rem', padding: '0.45rem 1rem' }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
