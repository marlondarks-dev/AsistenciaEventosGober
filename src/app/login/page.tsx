"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, ArrowLeft, ShieldCheck } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

      // Check if redirect query param exists
      const searchParams = new URLSearchParams(window.location.search)
      const redirectUrl = searchParams.get('redirect') || '/admin'
      
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
        maxWidth: '440px',
        width: '100%',
        padding: '2.5rem 2rem',
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.4)',
        textAlign: 'center'
      }}>
        {/* Back Link */}
        <div style={{ textAlign: 'left', marginBottom: '1rem' }}>
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
          width: '140px',
          height: '110px',
          margin: '0 auto 1.25rem',
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
          padding: '0.3rem 0.8rem', 
          borderRadius: '20px', 
          fontSize: '0.75rem', 
          fontWeight: 800, 
          border: '1px solid #BFDBFE', 
          marginBottom: '0.85rem' 
        }}>
          <ShieldCheck size={14} /> ACCESO PRIVADO ADMINISTRATIVO
        </div>

        <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.35rem', letterSpacing: '-0.02em' }}>
          Portal Administrativo PILI
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.85rem', marginBottom: '1.75rem' }}>
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

        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
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
                  padding: '0.7rem 0.85rem 0.7rem 2.5rem',
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
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
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
                  padding: '0.7rem 2.5rem 0.7rem 2.5rem',
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

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderRadius: '10px',
              marginTop: '0.5rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1
            }}
          >
            <LogIn size={18} />
            <span>{loading ? 'Verificando...' : 'Iniciar Sesión'}</span>
          </button>
        </form>

        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid #F1F5F9', fontSize: '0.75rem', color: '#94A3B8' }}>
          Sistema de Inscripciones y Control de Asistencia PILI<br />
          © 2026 Gobernación de Norte de Santander
        </div>
      </div>
    </div>
  )
}
