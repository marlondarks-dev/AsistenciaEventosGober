"use client"

import Link from 'next/link'
import { Building2, KeyRound } from 'lucide-react'

export default function LandingPage() {
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
      position: 'relative'
    }}>
      {/* Overlay to ensure contrast */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.4)',
        zIndex: 1
      }} />

      <div className="card animate-fade-in" style={{
        position: 'relative',
        zIndex: 2,
        maxWidth: '520px',
        width: '92%',
        padding: '2.25rem 2.5rem',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        color: 'white'
      }}>
        
        {/* Logo Real */}
        <div style={{
          width: '130px',
          height: '130px',
          margin: '0 auto 1.25rem',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          padding: '10px'
        }}>
          <img src="/logo.png" alt="Logo Gobernación" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, marginBottom: '0.35rem', letterSpacing: '-0.025em' }}>
          Gobernación de Norte de Santander
        </h1>
        <h2 style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.85)', marginBottom: '1.25rem', fontWeight: 400 }}>
          Portal Administrativo PILI
        </h2>

        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
          Gestión inteligente de eventos institucionales, caracterización de población e ingreso por código QR.
        </p>

        <Link href="/admin" className="btn btn-primary w-full" style={{
          padding: '0.9rem',
          fontSize: '1.05rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          backgroundColor: 'rgba(59, 130, 246, 0.9)',
          border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <KeyRound size={20} />
          Acceso Funcionarios
        </Link>
        
        <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
          © 2026 Gobernación de Norte de Santander. Todos los derechos reservados.
        </div>
      </div>
    </div>
  )
}
