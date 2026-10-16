import Link from 'next/link'
import prisma from '@/lib/prisma'
import { 
  Users, 
  Calendar, 
  CheckCircle2, 
  QrCode, 
  Printer, 
  Clock, 
  Plus, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  MapPin,
  Upload,
  Settings,
  Sparkles,
  BarChart3,
  Award,
  ChevronRight,
  FileSpreadsheet
} from 'lucide-react'

export const instant = false

export default async function AdminDashboard() {
  const [
    peopleCount, 
    eventsCount, 
    registrationsCount, 
    attendedCount,
    menCount,
    womenCount,
    activeEventsCount
  ] = await Promise.all([
    prisma.person.count(),
    prisma.event.count(),
    prisma.registration.count(),
    prisma.registration.count({ where: { status: 'ASISTIO' } }),
    prisma.person.count({ where: { sex: 'HOMBRE' } }),
    prisma.person.count({ where: { sex: 'MUJER' } }),
    prisma.event.count({ where: { status: 'ABIERTO' } })
  ])

  // Get active events with registration counts
  const recentEvents = await prisma.event.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      registrations: {
        select: { id: true, status: true }
      }
    }
  })

  // Get recent activity / check-ins
  const recentRegistrations = await prisma.registration.findMany({
    orderBy: { registeredAt: 'desc' },
    take: 6,
    include: {
      event: { select: { id: true, name: true } },
      person: { select: { firstName: true, lastName: true, documentType: true, documentNumber: true, additionalData: true, municipality: true } }
    }
  })

  // Group by municipality for territorial coverage widget
  let topMunicipalities: { municipality: string; count: number }[] = []
  try {
    const rawMun = await prisma.person.groupBy({
      by: ['municipality'],
      _count: { id: true },
      where: { municipality: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: 5
    })
    topMunicipalities = rawMun
      .filter(m => m.municipality)
      .map(m => ({ municipality: m.municipality as string, count: m._count.id }))
  } catch (e) {
    topMunicipalities = []
  }

  const attendanceRate = registrationsCount > 0 
    ? Math.round((attendedCount / registrationsCount) * 100) 
    : 0

  const todayStr = new Intl.DateTimeFormat('es-CO', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }).format(new Date())

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1400px', margin: '0 auto', width: '100%' }}>
      
      {/* HERO BANNER INSTITUCIONAL */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 55%, #172554 100%)',
        borderRadius: '20px',
        padding: '2rem 2.25rem',
        color: '#FFFFFF',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.25)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow decoration */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '260px',
          height: '260px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.3) 0%, rgba(37, 99, 235, 0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', position: 'relative', zIndex: 2 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              flexShrink: 0
            }}>
              <img src="/logo.png" alt="Gobernación" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                <span style={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 800, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38BDF8',
                  padding: '0.2rem 0.65rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(56, 189, 248, 0.3)'
                }}>
                  Gobernación de Norte de Santander
                </span>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>•</span>
                <span style={{ fontSize: '0.75rem', color: '#CBD5E1', textTransform: 'capitalize' }}>
                  {todayStr}
                </span>
              </div>

              <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#FFFFFF', margin: 0, letterSpacing: '-0.025em' }}>
                Panel de Control PILI
              </h1>
              <p style={{ color: '#94A3B8', fontSize: '0.9rem', margin: '0.25rem 0 0', maxWidth: '650px', lineHeight: 1.4 }}>
                Monitoreo centralizado de inscripciones, control de cupos por municipio y acreditación de asistencia con código QR y fotografía.
              </p>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <Link 
              href="/admin/events/new" 
              className="btn btn-primary" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                fontWeight: 700, 
                fontSize: '0.9rem',
                padding: '0.75rem 1.25rem',
                backgroundColor: '#2563EB',
                borderRadius: '12px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
              }}
            >
              <Plus size={18} />
              Nuevo Evento
            </Link>

            <Link 
              href="/admin/users" 
              className="btn btn-outline" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.45rem', 
                fontSize: '0.85rem', 
                color: '#FFFFFF', 
                borderColor: 'rgba(255,255,255,0.25)', 
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: '12px'
              }}
            >
              <ShieldCheck size={16} color="#38BDF8" />
              Lectores QR
            </Link>

            <Link 
              href="/admin/import" 
              className="btn btn-outline" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.45rem', 
                fontSize: '0.85rem', 
                color: '#FFFFFF', 
                borderColor: 'rgba(255,255,255,0.25)', 
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: '12px'
              }}
            >
              <Upload size={16} color="#10B981" />
              Importar PILI
            </Link>

            <Link 
              href="/admin/settings" 
              className="btn btn-outline" 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.45rem', 
                fontSize: '0.85rem', 
                color: '#FFFFFF', 
                borderColor: 'rgba(255,255,255,0.25)', 
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: '12px'
              }}
            >
              <Settings size={16} color="#F59E0B" />
              Configuración
            </Link>
          </div>

        </div>
      </div>

      {/* 4 TOP KPI METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        
        {/* Metric 1: Personas PILI */}
        <div className="card" style={{ 
          padding: '1.5rem', 
          borderRadius: '16px', 
          border: '1px solid #E2E8F0', 
          borderTop: '4px solid #6366F1',
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 15px rgba(99, 102, 241, 0.06)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Población PILI
              </span>
              <div style={{ backgroundColor: '#EEF2FF', padding: '0.5rem', borderRadius: '10px' }}>
                <Users size={20} color="#6366F1" />
              </div>
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>
              {peopleCount.toLocaleString()}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', marginTop: '0.35rem' }}>
              Personas caracterizadas en la base de datos
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', fontSize: '0.75rem', fontWeight: 600 }}>
            <span style={{ color: '#2563EB' }}>👨 {menCount} Hombres</span>
            <span style={{ color: '#E11D48' }}>👩 {womenCount} Mujeres</span>
          </div>
        </div>

        {/* Metric 2: Eventos Creados */}
        <div className="card" style={{ 
          padding: '1.5rem', 
          borderRadius: '16px', 
          border: '1px solid #E2E8F0', 
          borderTop: '4px solid #0284C7',
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 15px rgba(2, 132, 199, 0.06)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Eventos Creados
              </span>
              <div style={{ backgroundColor: '#E0F2FE', padding: '0.5rem', borderRadius: '10px' }}>
                <Calendar size={20} color="#0284C7" />
              </div>
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>
              {eventsCount}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', marginTop: '0.35rem' }}>
              Eventos departamentales e institucionales
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', fontSize: '0.75rem', fontWeight: 700, color: '#0284C7' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0284C7', display: 'inline-block' }} />
            {activeEventsCount} Evento(s) en curso y abiertos
          </div>
        </div>

        {/* Metric 3: Total Inscripciones */}
        <div className="card" style={{ 
          padding: '1.5rem', 
          borderRadius: '16px', 
          border: '1px solid #E2E8F0', 
          borderTop: '4px solid #2563EB',
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 15px rgba(37, 99, 235, 0.06)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Total Inscripciones
              </span>
              <div style={{ backgroundColor: '#EFF6FF', padding: '0.5rem', borderRadius: '10px' }}>
                <Clock size={20} color="#2563EB" />
              </div>
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>
              {registrationsCount.toLocaleString()}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', marginTop: '0.35rem' }}>
              Registros en pre-registro y sitio
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
            <Sparkles size={14} color="#2563EB" />
            Códigos QR únicos generados
          </div>
        </div>

        {/* Metric 4: Asistencias y Efectividad */}
        <div className="card" style={{ 
          padding: '1.5rem', 
          borderRadius: '16px', 
          border: '1px solid #E2E8F0', 
          borderTop: '4px solid #10B981',
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 4px 15px rgba(16, 185, 129, 0.06)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Asistencias en Puerta
              </span>
              <div style={{ backgroundColor: '#ECFDF5', padding: '0.5rem', borderRadius: '10px' }}>
                <CheckCircle2 size={20} color="#10B981" />
              </div>
            </div>
            <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#047857', lineHeight: 1 }}>
              {attendedCount.toLocaleString()}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block', marginTop: '0.35rem' }}>
              Asistencias validadas por QR
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9', fontSize: '0.78rem', fontWeight: 700, color: '#059669' }}>
            <TrendingUp size={15} />
            <span>{attendanceRate}% de efectividad general</span>
          </div>
        </div>

      </div>

      {/* QUICK LAUNCH OPERATIVO PARA EL DÍA DEL EVENTO */}
      {recentEvents[0] && (
        <div style={{
          backgroundColor: '#F8FAFC',
          borderRadius: '16px',
          padding: '1.25rem 1.5rem',
          border: '1.5px solid #CBD5E1',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ backgroundColor: '#DBEAFE', padding: '0.65rem', borderRadius: '12px' }}>
              <QrCode size={24} color="#1D4ED8" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong style={{ fontSize: '1rem', color: '#0F172A' }}>Operación en Vivo: {recentEvents[0].name}</strong>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>Activo</span>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Accesos directos rápidos para el personal de acreditación y control de puerta de este evento.
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <Link 
              href={`/admin/events/${recentEvents[0].id}/scanner`} 
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 700, padding: '0.5rem 1rem' }}
            >
              <QrCode size={16} /> Abrir Escáner de Puerta
            </Link>
            <Link 
              href={`/event/${recentEvents[0].id}/register?mode=onsite`} 
              target="_blank"
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 600, padding: '0.5rem 1rem', borderColor: '#2563EB', color: '#2563EB' }}
            >
              <Printer size={16} /> Registro en Sitio (Sticker)
            </Link>
            <Link 
              href={`/admin/events/${recentEvents[0].id}`} 
              className="btn btn-outline"
              style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', fontWeight: 600, padding: '0.5rem 1rem' }}
            >
              <Users size={16} /> Ver Participantes
            </Link>
          </div>
        </div>
      )}

      {/* MAIN TWO-COLUMN SECTION: ACTIVE EVENTS vs TERRITORY & ACTIVITY */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: EVENTS LIST (Takes 2 fractions on desktop) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={22} color="#2563EB" />
                Eventos Institucionales
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Gestión de acreditaciones y asistencia en tiempo real</span>
            </div>
            
            <Link href="/admin/events" style={{ fontSize: '0.85rem', color: '#2563EB', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              Ver todos ({eventsCount}) <ChevronRight size={16} />
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentEvents.length === 0 ? (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748B', borderRadius: '16px' }}>
                <Calendar size={48} color="#CBD5E1" style={{ margin: '0 auto 1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>No hay eventos creados</h3>
                <p style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>Comienza creando el primer evento institucional para abrir inscripciones.</p>
                <Link href="/admin/events/new" className="btn btn-primary" style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}>
                  + Crear Evento
                </Link>
              </div>
            ) : (
              recentEvents.map(event => {
                const regTotal = event.registrations.length
                const regAttended = event.registrations.filter(r => r.status === 'ASISTIO').length
                const pct = regTotal > 0 ? Math.round((regAttended / regTotal) * 100) : 0
                const isOpen = event.status === 'ABIERTO'

                return (
                  <div 
                    key={event.id} 
                    className="card" 
                    style={{ 
                      padding: '1.4rem', 
                      borderRadius: '16px', 
                      border: '1px solid #E2E8F0', 
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.03)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                      <div style={{ flex: 1, minWidth: '220px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span className={`badge ${isOpen ? 'badge-success' : 'badge-neutral'}`} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.7rem' }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isOpen ? '#10B981' : '#64748B' }} />
                            {event.status}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                            Fecha: {new Date(event.startDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </div>

                        <Link 
                          href={`/admin/events/${event.id}`} 
                          style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', textDecoration: 'none', lineHeight: 1.3, display: 'block' }}
                        >
                          {event.name}
                        </Link>

                        {event.location && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.3rem', color: '#64748B', fontSize: '0.8rem' }}>
                            <MapPin size={13} color="#2563EB" /> 
                            <span>{event.location}</span>
                          </div>
                        )}
                      </div>

                      {/* Attendee counter badge */}
                      <div style={{ 
                        backgroundColor: '#F8FAFC', 
                        padding: '0.5rem 0.85rem', 
                        borderRadius: '12px', 
                        border: '1px solid #E2E8F0',
                        textAlign: 'right'
                      }}>
                        <span style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                          {regTotal}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>Inscritos</span>
                      </div>
                    </div>

                    {/* Progress Bar Asistencia */}
                    <div style={{ marginBottom: '1.1rem', backgroundColor: '#F8FAFC', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.35rem', color: '#334155' }}>
                        <span>
                          Asistencias: <strong>{regAttended}</strong> de <strong>{regTotal}</strong> verificados
                        </span>
                        <strong style={{ color: pct >= 50 ? '#059669' : '#2563EB', fontSize: '0.85rem' }}>
                          {pct}%
                        </strong>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: '#E2E8F0', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: pct >= 50 ? '#10B981' : '#3B82F6', borderRadius: '10px', transition: 'width 0.4s ease' }} />
                      </div>
                    </div>

                    {/* Action Shortcuts */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem' }}>
                      <Link 
                        href={`/admin/events/${event.id}`} 
                        className="btn btn-primary" 
                        style={{ padding: '0.5rem 0.95rem', fontSize: '0.82rem', fontWeight: 700, borderRadius: '8px' }}
                      >
                        Gestionar Participantes
                      </Link>

                      <Link 
                        href={`/admin/events/${event.id}/scanner`} 
                        className="btn btn-outline" 
                        style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px' }}
                      >
                        <QrCode size={14} color="#059669" /> Escáner QR
                      </Link>

                      <Link 
                        href={`/event/${event.id}/register?mode=onsite`} 
                        target="_blank" 
                        className="btn btn-outline" 
                        style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px' }}
                      >
                        <Printer size={14} color="#2563EB" /> Modo en Sitio
                      </Link>

                      <Link 
                        href={`/admin/events/${event.id}/report`} 
                        className="btn btn-outline" 
                        style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '8px' }}
                      >
                        <BarChart3 size={14} color="#6366F1" /> Reporte
                      </Link>
                    </div>

                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TERRITORY & RECENT CHECK-INS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Top Municipalities Widget */}
          <div className="card" style={{ padding: '1.4rem', borderRadius: '16px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <MapPin size={18} color="#2563EB" /> Top Municipios
              </h3>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', backgroundColor: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                Norte de Santander
              </span>
            </div>

            {topMunicipalities.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: '#64748B', margin: 0 }}>No hay datos geográficos aún.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {topMunicipalities.map((item, idx) => {
                  const maxCount = topMunicipalities[0]?.count || 1
                  const munPct = Math.round((item.count / maxCount) * 100)

                  return (
                    <div key={item.municipality}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 700, color: '#334155' }}>
                          {idx + 1}. {item.municipality}
                        </span>
                        <strong style={{ color: '#2563EB' }}>{item.count} personas</strong>
                      </div>
                      <div style={{ width: '100%', height: '6px', backgroundColor: '#F1F5F9', borderRadius: '6px', overflow: 'hidden' }}>
                        <div style={{ width: `${munPct}%`, height: '100%', backgroundColor: '#3B82F6', borderRadius: '6px' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Live Activity Feed */}
          <div className="card" style={{ padding: '1.4rem', borderRadius: '16px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1E293B', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} color="#10B981" /> Actividad Reciente
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                ● En vivo
              </span>
            </div>

            {recentRegistrations.length === 0 ? (
              <p style={{ color: '#64748B', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
                No hay actividad registrada aún.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {recentRegistrations.map(reg => {
                  let photoUrl: string | null = null
                  try {
                    const add = JSON.parse(reg.person.additionalData || '{}')
                    photoUrl = add.fotoIngreso || add.foto || null
                  } catch (e) {}

                  const isAttended = reg.status === 'ASISTIO'

                  return (
                    <div 
                      key={reg.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        paddingBottom: '0.75rem', 
                        borderBottom: '1px solid #F1F5F9' 
                      }}
                    >
                      {/* Photo or Initials Avatar */}
                      {photoUrl ? (
                        <img 
                          src={photoUrl} 
                          alt="Foto Asistente" 
                          style={{ 
                            width: '40px', 
                            height: '40px', 
                            borderRadius: '10px', 
                            objectFit: 'cover', 
                            border: '1.5px solid #CBD5E1', 
                            flexShrink: 0 
                          }} 
                        />
                      ) : (
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '10px', 
                          backgroundColor: isAttended ? '#DCFCE7' : '#EFF6FF', 
                          color: isAttended ? '#15803D' : '#1D4ED8',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 800, 
                          fontSize: '0.9rem', 
                          flexShrink: 0 
                        }}>
                          {reg.person.firstName?.[0] || 'A'}
                        </div>
                      )}

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {reg.person.firstName} {reg.person.lastName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {reg.person.documentType} {reg.person.documentNumber} • {reg.person.municipality || 'NdS'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {reg.event.name}
                        </div>
                      </div>

                      <span style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        backgroundColor: isAttended ? '#DCFCE7' : '#DBEAFE',
                        color: isAttended ? '#15803D' : '#1E40AF',
                        border: `1px solid ${isAttended ? '#BBF7D0' : '#BFDBFE'}`,
                        flexShrink: 0
                      }}>
                        {reg.status}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  )
}
