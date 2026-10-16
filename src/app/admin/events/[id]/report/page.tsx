import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { Calendar, MapPin, CheckCircle, Camera } from 'lucide-react'

export const instant = false

export default async function EventReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        include: { person: true },
        orderBy: { registeredAt: 'asc' }
      }
    }
  })

  if (!event) {
    redirect('/admin/events')
  }

  // Filter to only those who actually attended (or maybe show all?)
  // Let's show all that have at least one checkpoint, or just status ASISTIO
  const attendees = event.registrations.filter(r => r.status === 'ASISTIO')

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          body {
            background-color: #f1f5f9;
            color: #0f172a;
          }
          .ficha {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.05);
            break-inside: auto;
            page-break-inside: auto;
          }
          .ficha-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 0.75rem;
            margin-bottom: 1rem;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .ficha-title {
            font-size: 1.3rem;
            font-weight: 800;
            color: #1e293b;
            margin: 0;
          }
          .ficha-subtitle {
            font-size: 0.85rem;
            color: #64748b;
            margin-top: 0.25rem;
          }
          .grid-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
            margin-bottom: 1.5rem;
          }
          .info-block {
            background: #f8fafc;
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .info-label {
            font-size: 0.7rem;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 0.15rem;
          }
          .info-value {
            font-weight: 600;
            font-size: 0.9rem;
          }
          .checkpoints-container {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .checkpoint-card {
            display: flex;
            gap: 1rem;
            padding: 0.75rem;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #ffffff;
            align-items: center;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .checkpoint-details {
            flex: 1;
          }
          .checkpoint-name {
            font-size: 1rem;
            font-weight: 700;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }
          .checkpoint-time {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 0.15rem;
          }
          .evidence-img {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
          }
          
          @media print {
            body {
              background-color: white;
            }
            /* Hide the admin sidebar */
            .sidebar {
              display: none !important;
            }
            .main-content {
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
            }
            .layout-admin {
              display: block !important;
            }
            
            .no-print {
              display: none !important;
            }
            .ficha {
              box-shadow: none;
              border: 1px solid #94a3b8;
              margin-bottom: 1rem;
              padding: 1rem;
              break-inside: auto;
              page-break-inside: auto;
            }
            .grid-info {
              gap: 0.5rem;
              margin-bottom: 1rem;
            }
            .info-block {
              border: 1px solid #cbd5e1;
            }
            .checkpoint-card {
              border: 1px solid #cbd5e1;
            }
            @page {
              margin: 1cm;
            }
          }
        `
      }} />

      <div className="no-print" style={{ padding: '1rem', backgroundColor: 'white', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <h1 style={{ fontWeight: 700, fontSize: '1.25rem' }}>Reporte de Entregas y Asistencia</h1>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Utiliza la función de impresión del navegador para guardarlo como PDF.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <a href={`/admin/events/${id}`} className="btn btn-outline">Volver</a>
          <button id="print-report-btn" className="btn btn-primary" style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>
            Guardar como PDF / Imprimir
          </button>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
        
        {/* Cover Page / Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '2px solid #e2e8f0' }}>
          <img src="/logo.png" alt="Logo Gobernación" style={{ maxHeight: '70px', marginBottom: '1rem', objectFit: 'contain' }} />
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>Fichas de Control de Asistencia</h2>
          <h3 style={{ fontSize: '1.1rem', color: '#475569', margin: '0 0 0.5rem 0' }}>{event.name}</h3>
          <p style={{ color: '#64748b', margin: 0 }}>Total Verificados: <strong>{attendees.length}</strong> personas</p>
        </div>

        {attendees.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'white', borderRadius: '12px' }}>
            <p>No hay asistentes verificados aún.</p>
          </div>
        ) : (
          attendees.map(reg => {
            const cps = reg.checkpoints ? JSON.parse(reg.checkpoints) : []
            let photoUrl: string | null = null
            try {
              const add = JSON.parse(reg.person.additionalData || '{}')
              photoUrl = add.fotoIngreso || add.foto || null
              if (!photoUrl) {
                const ingresoCp = cps.find((c: any) => c.name === 'Ingreso' && c.evidenceUrl)
                if (ingresoCp) photoUrl = ingresoCp.evidenceUrl
              }
            } catch (e) {}
            
            return (
              <div key={reg.id} className="ficha">
                <div className="ficha-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {photoUrl && (
                      <img 
                        src={photoUrl} 
                        alt="Foto" 
                        style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #cbd5e1', flexShrink: 0 }} 
                      />
                    )}
                    <div>
                      <h2 className="ficha-title">
                        {[reg.person.firstName, reg.person.middleName, reg.person.lastName, reg.person.secondLastName]
                          .filter(Boolean)
                          .join(' ')}
                      </h2>
                      <p className="ficha-subtitle">{reg.person.documentType} {reg.person.documentNumber}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>ID Registro</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 600 }}>{reg.id.slice(-8).toUpperCase()}</div>
                  </div>
                </div>

                <div className="grid-info">
                  <div className="info-block">
                    <div className="info-label">Municipio</div>
                    <div className="info-value">{reg.person.municipality || 'No registrado'}</div>
                  </div>
                  <div className="info-block">
                    <div className="info-label">Teléfono / Emergencia</div>
                    <div className="info-value">
                      {(() => {
                         try {
                           const add = JSON.parse(reg.person.additionalData || "{}")
                           return add.contactoEmergencia || 'No registrado'
                         } catch(e) { return 'No registrado' }
                      })()}
                    </div>
                  </div>
                  <div className="info-block">
                    <div className="info-label">Grupo</div>
                    <div className="info-value">
                      {(() => {
                         try {
                           const add = JSON.parse(reg.person.additionalData || "{}")
                           if (add.grupoJuvenil === 'BASE_JUVENIL') return 'Base Juvenil'
                           if (add.grupoJuvenil === 'ENLACE_MUNICIPAL') return 'Enlace Municipal'
                           return add.grupoJuvenil || 'Ninguno'
                         } catch(e) { return 'Ninguno' }
                      })()}
                    </div>
                  </div>
                  <div className="info-block">
                    <div className="info-label">Alergias / Médica</div>
                    <div className="info-value" style={{ color: '#b91c1c' }}>
                      {(() => {
                         try {
                           const add = JSON.parse(reg.person.additionalData || "{}")
                           return add.alergiasMedicas || 'Ninguna reportada'
                         } catch(e) { return 'Ninguna reportada' }
                      })()}
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Registro de Entregas (Puntos de Control)</h3>
                
                {cps.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.9rem' }}>No hay registros de puntos de control.</p>
                ) : (
                  <div className="checkpoints-container">
                    {cps.map((cp: any, index: number) => (
                      <div key={index} className="checkpoint-card">
                        <div className="checkpoint-details">
                          <div className="checkpoint-name">
                            <CheckCircle size={18} color="#16a34a" />
                            {cp.name}
                          </div>
                          <div className="checkpoint-time">
                            Fecha/Hora: {new Date(cp.timestamp).toLocaleString('es-CO')}
                          </div>
                        </div>
                        {cp.evidenceUrl ? (
                          <div>
                            <img src={cp.evidenceUrl} alt="Evidencia" className="evidence-img" />
                          </div>
                        ) : (
                          <div style={{ width: '100px', height: '100px', backgroundColor: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94a3b8' }}>
                            <Camera size={24} style={{ opacity: 0.5 }} />
                            <span style={{ fontSize: '0.6rem', marginTop: '0.25rem' }}>Sin foto</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      
      <script dangerouslySetInnerHTML={{
        __html: `
          document.getElementById('print-report-btn').addEventListener('click', function() {
            window.print();
          });
        `
      }} />
    </>
  )
}
