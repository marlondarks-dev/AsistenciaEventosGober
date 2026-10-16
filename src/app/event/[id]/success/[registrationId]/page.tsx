import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { CheckCircle2, Calendar as CalendarIcon, MapPin, User, FileText, Info, Printer, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export const instant = false

export default async function SuccessPage({ params }: { params: Promise<{ id: string, registrationId: string }> }) {
  const { id, registrationId } = await params
  
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true, person: true }
  })

  if (!registration || registration.eventId !== id) {
    redirect('/')
  }

  const shortCode = registration.id.slice(-8).toUpperCase()
  const fullName = [
    registration.person.firstName,
    registration.person.middleName,
    registration.person.lastName,
    registration.person.secondLastName
  ].filter(Boolean).join(' ')

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Banner */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)', 
        color: 'white', 
        padding: '3rem 1.5rem 4rem', 
        textAlign: 'center',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          margin: '0 auto 1.25rem',
          backgroundColor: '#FFFFFF',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}>
          <CheckCircle2 size={46} color="#16A34A" />
        </div>
        
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 0.5rem 0', letterSpacing: '-0.02em' }}>
          ¡Pre-Registro Exitoso!
        </h1>
        <p style={{ fontSize: '1.05rem', opacity: 0.9, maxWidth: '550px', margin: '0 auto', lineHeight: 1.4 }}>
          Tus datos han sido registrados en la plataforma institucional de la Gobernación de Norte de Santander.
        </p>
      </div>

      {/* Main Confirmation Ticket */}
      <div className="container" style={{ flex: 1, padding: '0 1rem 3rem' }}>
        <div className="card animate-fade-in" style={{ 
          maxWidth: '560px', 
          margin: '-2.5rem auto 0', 
          borderRadius: '18px',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.12)',
          border: '1px solid #E2E8F0',
          padding: '2rem 1.75rem'
        }}>

          {/* Event Header */}
          <div style={{ textAlign: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
            <span style={{ 
              fontSize: '0.75rem', 
              fontWeight: 800, 
              color: '#2563EB', 
              backgroundColor: '#EFF6FF', 
              padding: '0.25rem 0.75rem', 
              borderRadius: '20px', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
              display: 'inline-block',
              marginBottom: '0.5rem'
            }}>
              Evento Oficial
            </span>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.5rem 0' }}>
              {registration.event.name}
            </h2>
            
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', color: '#64748B', fontSize: '0.85rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <CalendarIcon size={15} color="#2563EB" />
                {new Date(registration.event.startDate).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              {registration.event.location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MapPin size={15} color="#2563EB" />
                  {registration.event.location}
                </span>
              )}
            </div>
          </div>

          {/* Institutional Instruction Box (Explaining Onsite Validation) */}
          <div style={{
            backgroundColor: '#EFF6FF',
            border: '1.5px solid #BFDBFE',
            borderRadius: '14px',
            padding: '1.25rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.85rem'
          }}>
            <div style={{ backgroundColor: '#DBEAFE', padding: '0.4rem', borderRadius: '8px', flexShrink: 0 }}>
              <Info size={22} color="#1D4ED8" />
            </div>
            <div>
              <strong style={{ display: 'block', color: '#1E40AF', fontSize: '0.95rem', marginBottom: '0.35rem' }}>
                Instrucciones para el ingreso al evento:
              </strong>
              <p style={{ color: '#1E3A8A', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                El día del evento, preséntate en las mesas de registro en la entrada presentando tu documento de identidad (<strong>{registration.person.documentType} {registration.person.documentNumber}</strong>). 
                Allí el personal de logística te tomará la fotografía oficial y te entregará tu <strong>escarapela con código QR</strong> para el acceso a las actividades y entrega de beneficios.
              </p>
            </div>
          </div>

          {/* Participant Summary Sheet */}
          <div style={{
            backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.75rem'
          }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 1rem 0' }}>
              Datos del Pre-Registro
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748B' }}>Participante:</span>
                <strong style={{ color: '#0F172A', textAlign: 'right' }}>{fullName}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748B' }}>Documento:</span>
                <strong style={{ color: '#0F172A' }}>{registration.person.documentType} {registration.person.documentNumber}</strong>
              </div>

              {registration.person.municipality && (
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem' }}>
                  <span style={{ color: '#64748B' }}>Municipio:</span>
                  <span style={{ fontWeight: 600, color: '#0F172A' }}>{registration.person.municipality}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '0.5rem' }}>
                <span style={{ color: '#64748B' }}>Fecha de Registro:</span>
                <span style={{ color: '#0F172A' }}>{new Date(registration.registeredAt).toLocaleDateString('es-CO')}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748B' }}>Radicado Pre-Registro:</span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.85rem' }}>
                  #{shortCode}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <a 
              href={`/event/${id}/register`}
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                padding: '0.9rem', 
                fontSize: '1rem', 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem',
                backgroundColor: '#2563EB',
                borderRadius: '10px',
                textDecoration: 'none'
              }}
            >
              <span>Registrar a Otra Persona</span>
              <ArrowRight size={18} />
            </a>
          </div>

        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748B', fontSize: '0.8rem', borderTop: '1px solid #E2E8F0', backgroundColor: '#FFFFFF' }}>
        © {new Date().getFullYear()} Gobernación de Norte de Santander • Todos los derechos reservados.
      </div>
    </div>
  )
}
