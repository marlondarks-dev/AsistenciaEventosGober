import prisma from '@/lib/prisma'
import { redirect } from 'next/navigation'
import PrintButton from './PrintButton'
import QRCode from 'qrcode'

export const instant = false

export default async function StickerPage({ params }: { params: Promise<{ id: string, registrationId: string }> }) {
  const { id, registrationId } = await params
  
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { event: true, person: true }
  })

  if (!registration || registration.eventId !== id) {
    redirect('/')
  }

  // QR Code options optimized for thermal label print (80mm x 40mm)
  const qrDataUrl = await QRCode.toDataURL(registration.qrToken, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 250, // higher resolution for crisp 203/300 DPI thermal print
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })

  // Format event name
  const eventName = registration.event.name.length > 36 
    ? registration.event.name.substring(0, 33) + '...'
    : registration.event.name

  // Format participant name (First Name + Last Name)
  const fullName = [
    registration.person.firstName,
    registration.person.lastName
  ].filter(Boolean).join(' ')
  
  const participantName = fullName.length > 28 
    ? `${registration.person.firstName.split(' ')[0]} ${registration.person.lastName.split(' ')[0]}`
    : fullName

  // Format document: e.g. "CC 1090426187"
  const docText = `${registration.person.documentType || 'DOC'} ${registration.person.documentNumber || ''}`
  const municipality = registration.person.municipality || ''
  const shortId = registration.id.slice(-6).toUpperCase()

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @page {
            size: 80mm 40mm;
            margin: 0;
          }
          html, body {
            margin: 0;
            padding: 0;
            background-color: white;
            color: black;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            width: 80mm;
            height: 40mm;
            overflow: hidden;
            box-sizing: border-box;
          }
          .sticker-container {
            width: 80mm;
            height: 40mm;
            padding: 2.5mm 3.5mm;
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-sizing: border-box;
            background-color: white;
          }
          .left-pane {
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding-right: 3mm;
            overflow: hidden;
            box-sizing: border-box;
          }
          .right-pane {
            width: 32mm;
            height: 32mm;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .event-name {
            font-size: 7.5pt;
            font-weight: 700;
            text-transform: uppercase;
            line-height: 1.15;
            color: #1E293B;
            border-bottom: 0.5px solid #CBD5E1;
            padding-bottom: 0.8mm;
            margin-bottom: 1mm;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .participant-name {
            font-size: 11pt;
            font-weight: 800;
            line-height: 1.15;
            text-transform: uppercase;
            color: #000000;
            word-wrap: break-word;
            margin-bottom: 0.5mm;
          }
          .doc-number {
            font-size: 9pt;
            font-weight: 700;
            line-height: 1.1;
            color: #1E293B;
          }
          .municipality-tag {
            font-size: 7.5pt;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            line-height: 1.1;
            margin-top: 0.5mm;
          }
          .short-id {
            font-size: 6.5pt;
            font-family: monospace;
            font-weight: 600;
            color: #64748B;
            border-top: 0.5px solid #CBD5E1;
            padding-top: 0.8mm;
          }
          .qr-image {
            width: 32mm;
            height: 32mm;
            display: block;
          }
          /* Screen preview */
          @media screen {
            body {
              background-color: #F1F5F9;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              width: 100vw;
              height: 100vh;
            }
            .sticker-container {
              background: white;
              box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1);
              width: 80mm;
              height: 40mm;
              border: 1px solid #E2E8F0;
              border-radius: 6px;
              position: relative;
            }
          }
          /* Print styles */
          @media print {
            body {
              width: 80mm !important;
              height: 40mm !important;
              overflow: hidden !important;
            }
            .sticker-container {
              width: 80mm !important;
              height: 40mm !important;
              box-shadow: none !important;
              border: none !important;
              page-break-inside: avoid !important;
              page-break-after: avoid !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `
      }} />

      <div className="sticker-container">
        <div className="left-pane">
          <div>
            <div className="event-name">{eventName}</div>
            <div className="participant-name">{participantName}</div>
            <div className="doc-number">{docText}</div>
            {municipality && <div className="municipality-tag">📍 {municipality}</div>}
          </div>
          <div className="short-id">ID: {shortId} • GOBERNACIÓN NDS</div>
        </div>
        <div className="right-pane">
          <img src={qrDataUrl} alt="QR" className="qr-image" />
        </div>
      </div>
      
      {/* On-screen controls that are hidden during print */}
      <div className="no-print" style={{ 
        marginTop: '2rem', 
        display: 'flex', 
        gap: '1rem', 
        justifyContent: 'center',
        position: 'absolute',
        bottom: '2rem',
        left: '0',
        right: '0'
      }}>
        <PrintButton />
        <a href={`/event/${id}/register?mode=onsite`} style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#2563EB',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 600,
          cursor: 'pointer',
          textDecoration: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          Siguiente Registro
        </a>
      </div>
    </>
  )
}
