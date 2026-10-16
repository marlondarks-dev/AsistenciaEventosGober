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

  // QR Code options optimized for small print
  const qrDataUrl = await QRCode.toDataURL(registration.qrToken, {
    errorCorrectionLevel: 'M',
    margin: 0,
    width: 150, // higher resolution for crisp print
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  })

  // Format short name for event
  const shortEventName = registration.event.name.length > 20 
    ? registration.event.name.substring(0, 18) + '...'
    : registration.event.name

  // Format participant name (First Name + First Last Name)
  const participantName = `${registration.person.firstName.split(' ')[0]} ${registration.person.lastName.split(' ')[0]}`

  // Format document: e.g. "CC 1090426187"
  const docText = `${registration.person.documentType || 'DOC'} ${registration.person.documentNumber || ''}`

  const shortId = registration.id.slice(-6).toUpperCase()

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @page {
            size: 50mm 30mm;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background-color: white;
            color: black;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            width: 50mm;
            height: 30mm;
            overflow: hidden;
            display: flex;
          }
          .sticker-container {
            width: 100%;
            height: 100%;
            padding: 2mm;
            display: flex;
            box-sizing: border-box;
          }
          .left-pane {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding-right: 2mm;
            overflow: hidden;
          }
          .right-pane {
            width: 22mm;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .event-name {
            font-size: 7pt;
            font-weight: 700;
            text-transform: uppercase;
            line-height: 1.1;
          }
          .participant-name {
            font-size: 9.5pt;
            font-weight: 800;
            line-height: 1.1;
            word-wrap: break-word;
          }
          .doc-number {
            font-size: 8pt;
            font-weight: 700;
            line-height: 1.1;
          }
          .short-id {
            font-size: 6pt;
            font-family: monospace;
            color: #333;
          }
          .qr-image {
            width: 21mm;
            height: 21mm;
            display: block;
          }
          /* Hide everything else if this is just a printable view */
          @media screen {
            body {
              background-color: #f0f0f0;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .sticker-container {
              background: white;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              width: 50mm;
              height: 30mm;
            }
          }
        `
      }} />

      <div className="sticker-container">
        <div className="left-pane">
          <div className="event-name">{shortEventName}</div>
          <div className="participant-name">{participantName}</div>
          <div className="doc-number">{docText}</div>
          <div className="short-id">ID: {shortId}</div>
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

      {/* CSS to hide buttons when printing */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            .no-print {
              display: none !important;
            }
          }
        `
      }} />
    </>
  )
}
