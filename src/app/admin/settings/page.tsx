import prisma from '@/lib/prisma'
import { 
  Settings, 
  Database, 
  Smartphone, 
  ShieldCheck, 
  Server, 
  MapPin, 
  HardDrive,
  Users,
  Calendar,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'

export const instant = false

export default async function SettingsPage() {
  const [personCount, eventCount, registrationCount] = await Promise.all([
    prisma.person.count(),
    prisma.event.count(),
    prisma.registration.count(),
  ])

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0F172A', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Settings size={28} color="#2563EB" />
          Configuración del Sistema PILI
        </h1>
        <p style={{ color: '#64748B', fontSize: '0.9rem', margin: '0.35rem 0 0' }}>
          Parámetros globales, estado de la plataforma, conexión PWA y base de datos institucional.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Card 1: PWA Status */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: '#EFF6FF', padding: '0.5rem', borderRadius: '10px' }}>
              <Smartphone size={22} color="#2563EB" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>Aplicación Móvil (PWA)</h3>
              <span style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 700 }}>● Habilitada e Instalable</span>
            </div>
          </div>
          
          <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, marginBottom: '1rem' }}>
            La plataforma funciona como una Progressive Web App. Puede instalarse en teléfonos celulares (Android e iOS) y computadores para operar en pantalla completa sin barras de navegador.
          </p>

          <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '10px', fontSize: '0.8rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <div><strong>Modo:</strong> Standalone (Pantalla Completa)</div>
            <div><strong>Service Worker:</strong> Activo (/sw.js)</div>
            <div><strong>Iconos:</strong> 192x192 y 512x512 adaptables</div>
          </div>
        </div>

        {/* Card 2: Database and Storage */}
        <div className="card" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <div style={{ backgroundColor: '#F0FDF4', padding: '0.5rem', borderRadius: '10px' }}>
              <Database size={22} color="#16A34A" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#1E293B' }}>Base de Datos SQLite</h3>
              <span style={{ fontSize: '0.75rem', color: '#16A34A', fontWeight: 700 }}>● Conectada (Prisma ORM)</span>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem', textAlign: 'center' }}>
            <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 0.5rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>{personCount}</span>
              <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Personas</span>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 0.5rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>{eventCount}</span>
              <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Eventos</span>
            </div>
            <div style={{ backgroundColor: '#F8FAFC', padding: '0.75rem 0.5rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A' }}>{registrationCount}</span>
              <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Inscripciones</span>
            </div>
          </div>

          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
            Ubicación: <code>prisma/dev.db</code> con almacenamiento local para fotos en <code>/public/uploads</code>.
          </p>
        </div>

      </div>

      {/* Institutional Info & Shortcuts */}
      <div className="card" style={{ padding: '1.5rem', borderRadius: '14px', border: '1px solid #E2E8F0' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={20} color="#2563EB" /> Parámetros Institucionales
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.85rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <span style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>Entidad Territorial:</span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Gobernación de Norte de Santander</span>
          </div>
          <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <span style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>Municipio Sede:</span>
            <span style={{ color: '#0F172A', fontWeight: 600 }}>Cúcuta, Norte de Santander</span>
          </div>
          <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
            <span style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>Versión del Software:</span>
            <span style={{ color: '#2563EB', fontWeight: 700 }}>PILI v2.4 (Next.js 16 + PWA)</span>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link href="/admin/users" className="btn btn-outline" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Users size={16} /> Administrar Lectores y Usuarios
          </Link>
          <Link href="/admin/events" className="btn btn-primary" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={16} /> Ver Listado de Eventos
          </Link>
        </div>
      </div>

    </div>
  )
}
