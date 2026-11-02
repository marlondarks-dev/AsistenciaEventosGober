"use client"

import { useState, useMemo, useEffect } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { 
  Printer, 
  ArrowLeft, 
  Search, 
  X, 
  CheckCircle2, 
  Clock, 
  Camera, 
  User, 
  FileText, 
  ShieldCheck, 
  AlertTriangle,
  PackageCheck,
  Package,
  ExternalLink,
  Copy,
  Check,
  Download,
  Loader2
} from 'lucide-react'

interface ReportViewerProps {
  event: any
  registrations: any[]
}

function formatColombiaDateTime(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return ''
  try {
    const d = new Date(dateInput)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
  } catch {
    return ''
  }
}

export default function ReportViewerClient({ event, registrations }: ReportViewerProps) {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') || ''
  const initialStatus = searchParams.get('status') || 'ALL'

  const [search, setSearch] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ASISTIO' | 'REGISTRADO'>(
    initialStatus === 'ASISTIO' ? 'ASISTIO' : initialStatus === 'REGISTRADO' ? 'REGISTRADO' : 'ALL'
  )
  const [kitFilter, setKitFilter] = useState<'ALL' | 'WITH_KIT' | 'WITHOUT_KIT'>('ALL')
  const [onePerPage, setOnePerPage] = useState(false)
  const [isPrinting, setIsPrinting] = useState(false)

  // Filter registrations
  const filteredRegistrations = useMemo(() => {
    return registrations.filter(reg => {
      // 1. Status Filter
      if (statusFilter !== 'ALL' && reg.status !== statusFilter) {
        return false
      }

      // Checkpoints & Kit parsing
      let hasKit = false
      if (reg.checkpoints) {
        try {
          const cps = JSON.parse(reg.checkpoints)
          if (Array.isArray(cps)) {
            hasKit = cps.some((c: any) => {
              const n = (c?.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              return n.includes('kit') || n.includes('bienvenida')
            })
          }
        } catch (e) {}
      }

      // 2. Kit Filter
      if (kitFilter === 'WITH_KIT' && !hasKit) return false
      if (kitFilter === 'WITHOUT_KIT' && hasKit) return false

      // 3. Search Filter
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const p = reg.person || {}
        const fullName = [p.firstName, p.middleName, p.lastName, p.secondLastName].filter(Boolean).join(' ').toLowerCase()
        const doc = (p.documentNumber || '').toLowerCase()
        const mun = (p.municipality || '').toLowerCase()
        const id = (reg.id || '').toLowerCase()

        return fullName.includes(q) || doc.includes(q) || mun.includes(q) || id.includes(q)
      }

      return true
    })
  }, [registrations, statusFilter, kitFilter, search])

  const [isStandalone, setIsStandalone] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Detect if running inside installed PWA (Standalone window)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
                    (window.navigator as any).standalone === true
      setIsStandalone(isPWA)
    }
  }, [])

  // Keyboard shortcut Ctrl+P / Cmd+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        handlePrint()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handlePrint = () => {
    try {
      window.print()
    } catch (e) {
      console.error('Error al abrir diálogo de impresión:', e)
    }
  }

  const handleOpenInBrowser = () => {
    if (typeof window !== 'undefined') {
      window.open(window.location.href, '_blank', 'noopener,noreferrer')
    }
  }

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2500)
    }
  }

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [pdfProgressText, setPdfProgressText] = useState('')

  // Cargar únicamente jsPDF local
  const ensureJsPdf = async (): Promise<any> => {
    if (typeof window === 'undefined') throw new Error('Solo disponible en navegador')

    if ((window as any).jspdf?.jsPDF || (window as any).jsPDF) {
      return (window as any).jspdf?.jsPDF || (window as any).jsPDF
    }

    return new Promise((resolve, reject) => {
      const s = document.createElement('script')
      s.id = 'jspdf-script'
      s.src = '/js/jspdf.umd.min.js'
      s.onload = () => resolve((window as any).jspdf?.jsPDF || (window as any).jsPDF)
      s.onerror = () => reject(new Error('No se pudo cargar jsPDF'))
      document.head.appendChild(s)
    })
  }

  // Pre-cargar logo institucional si está disponible
  const loadLogoBase64 = async (): Promise<string | null> => {
    try {
      const res = await fetch('/logo.png')
      if (!res.ok) return null
      const blob = await res.blob()
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
    } catch {
      return null
    }
  }

  // Dibujado vectorial ultra-rápido de cada ficha (toma menos de 1 milisegundo por página)
  const drawFichaVector = (pdf: any, reg: any, currentEvent: any, pageNum: number, totalPages: number, logoData: string | null) => {
    const p = reg.person || {}
    const fullName = [p.firstName, p.middleName, p.lastName, p.secondLastName].filter(Boolean).join(' ').toUpperCase()
    const docText = `${p.documentType || 'DOC'} ${p.documentNumber || 'Sin documento'}`
    const regId = (reg.id || '').slice(-8).toUpperCase()

    // Parse checkpoints
    const cps: any[] = []
    if (reg.checkpoints) {
      try {
        const parsed = JSON.parse(reg.checkpoints)
        if (Array.isArray(parsed)) cps.push(...parsed)
      } catch {}
    }

    // Parse additionalData
    let addData: Record<string, any> = {}
    if (p.additionalData) {
      try {
        const parsed = JSON.parse(p.additionalData)
        if (parsed && typeof parsed === 'object') addData = parsed
      } catch {}
    }

    // Kit check
    const kitScan = cps.find((c: any) => {
      const n = (c?.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      return n.includes('kit') || n.includes('bienvenida')
    })

    const hasConsent = addData.q_auth_menores || addData.consentimiento || addData.autorizacion

    // Page dimensions: 215.9 x 279.4 mm (Letter)
    const marginX = 14
    const contentW = 187.9

    // 1. TOP HEADER BANNER (y: 12 to 34 mm)
    pdf.setFillColor(248, 250, 252)
    pdf.setDrawColor(226, 232, 240)
    pdf.setLineWidth(0.3)
    pdf.roundedRect(marginX, 12, contentW, 22, 2, 2, 'FD')

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(11)
    pdf.setTextColor(15, 23, 42)
    pdf.text('GOBERNACIÓN DE NORTE DE SANTANDER', marginX + 6, 18)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8.5)
    pdf.setTextColor(100, 116, 139)
    pdf.text('Ficha Individual de Control de Asistencia y Entregas', marginX + 6, 23.5)

    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(37, 99, 235)
    const eventTitle = (currentEvent.name || 'Evento Institucional').substring(0, 65)
    pdf.text(eventTitle, marginX + 6, 29.5)

    // Draw Logo if loaded
    if (logoData) {
      try {
        pdf.addImage(logoData, 'PNG', marginX + contentW - 25, 13.5, 20, 19, undefined, 'FAST')
      } catch {}
    }

    // 2. PARTICIPANT IDENTITY CARD (y: 38 to 74 mm)
    pdf.setFillColor(255, 255, 255)
    pdf.setDrawColor(203, 213, 225)
    pdf.roundedRect(marginX, 38, contentW, 36, 3, 3, 'FD')

    // Avatar Box
    pdf.setFillColor(241, 245, 249)
    pdf.setDrawColor(203, 213, 225)
    pdf.roundedRect(marginX + 5, 43, 26, 26, 2, 2, 'FD')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(15)
    pdf.setTextColor(148, 163, 184)
    const initials = `${(p.firstName || 'P')[0] || ''}${(p.lastName || '')[0] || ''}`.toUpperCase() || 'P'
    pdf.text(initials, marginX + 18, 60, { align: 'center' })

    // Participant Name & Doc
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.setTextColor(15, 23, 42)
    const safeName = fullName.length > 38 ? fullName.substring(0, 36) + '...' : fullName
    pdf.text(safeName || 'SIN NOMBRE REGISTRADO', marginX + 36, 49)

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(10)
    pdf.setTextColor(51, 65, 85)
    pdf.text(docText, marginX + 36, 55.5)

    // Status Badge
    const isAsistio = reg.status === 'ASISTIO'
    pdf.setFillColor(isAsistio ? 220 : 239, isAsistio ? 252 : 246, isAsistio ? 231 : 255)
    pdf.setDrawColor(isAsistio ? 134 : 191, isAsistio ? 239 : 219, isAsistio ? 172 : 254)
    pdf.roundedRect(marginX + 36, 61, 28, 7, 1.5, 1.5, 'FD')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7.5)
    pdf.setTextColor(isAsistio ? 21 : 29, isAsistio ? 128 : 78, isAsistio ? 61 : 216)
    pdf.text(isAsistio ? '✓ ASISTIÓ' : '⏳ REGISTRADO', marginX + 50, 65.8, { align: 'center' })

    // Kit Badge
    pdf.setFillColor(kitScan ? 236 : 255, kitScan ? 253 : 251, kitScan ? 245 : 235)
    pdf.setDrawColor(kitScan ? 167 : 253, kitScan ? 243 : 230, kitScan ? 208 : 138)
    pdf.roundedRect(marginX + 68, 61, 34, 7, 1.5, 1.5, 'FD')
    pdf.setTextColor(kitScan ? 4 : 180, kitScan ? 120 : 83, kitScan ? 87 : 9)
    pdf.text(kitScan ? '🎒 KIT ENTREGADO' : '🎒 KIT PENDIENTE', marginX + 85, 65.8, { align: 'center' })

    // ID on right
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(7)
    pdf.setTextColor(100, 116, 139)
    pdf.text('ID REGISTRO', marginX + contentW - 5, 48, { align: 'right' })
    pdf.setFont('courier', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor(30, 41, 59)
    pdf.text(regId, marginX + contentW - 5, 54, { align: 'right' })

    // 3. INFORMATION GRID (y: 78 to 120 mm)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(30, 41, 59)
    pdf.text('DATOS PERSONALES Y DE CONTACTO', marginX, 80)

    const colW = (contentW - 6) / 3 // ~60.6 mm
    const infoFields = [
      { label: 'MUNICIPIO', val: p.municipality || 'No registrado' },
      { label: 'TELÉFONO / EMERGENCIA', val: addData.contactoEmergencia || 'No registrado' },
      { label: 'EPS', val: addData.eps || 'No registrada' },
      { label: 'GRUPO POBLACIONAL', val: addData.grupoJuvenil || 'Ninguno' },
      { label: 'ALERGIAS / MÉDICA', val: addData.alergiasMedicas || 'Ninguna reportada', alert: Boolean(addData.alergiasMedicas) },
      { label: 'CONSENTIMIENTO', val: hasConsent ? '✓ Adjuntado (Digital)' : 'No adjuntado', success: Boolean(hasConsent) }
    ]

    for (let j = 0; j < 6; j++) {
      const col = j % 3
      const row = Math.floor(j / 3)
      const boxX = marginX + col * (colW + 3)
      const boxY = 84 + row * 18

      pdf.setFillColor(248, 250, 252)
      pdf.setDrawColor(226, 232, 240)
      pdf.roundedRect(boxX, boxY, colW, 15, 1.5, 1.5, 'FD')

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(6.5)
      pdf.setTextColor(100, 116, 139)
      pdf.text(infoFields[j].label, boxX + 3.5, boxY + 4.5)

      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(8.5)
      if (infoFields[j].alert) {
        pdf.setTextColor(185, 28, 28)
      } else if (infoFields[j].success) {
        pdf.setTextColor(21, 128, 61)
      } else {
        pdf.setTextColor(30, 41, 59)
      }
      const safeVal = String(infoFields[j].val).substring(0, 32)
      pdf.text(safeVal, boxX + 3.5, boxY + 10.5)
    }

    // 4. CHECKPOINTS / REFRIGERIOS (y: 126 mm+)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(30, 41, 59)
    pdf.text(`REGISTRO DE ENTREGAS Y PUNTOS DE CONTROL (${cps.length})`, marginX, 127)

    let currentY = 131
    if (cps.length === 0) {
      pdf.setFillColor(248, 250, 252)
      pdf.setDrawColor(226, 232, 240)
      pdf.roundedRect(marginX, currentY, contentW, 14, 2, 2, 'FD')
      pdf.setFont('helvetica', 'italic')
      pdf.setFontSize(8.5)
      pdf.setTextColor(148, 163, 184)
      pdf.text('No hay puntos de control o refrigerios registrados aún para este participante.', marginX + contentW / 2, currentY + 8.5, { align: 'center' })
    } else {
      const maxCps = Math.min(cps.length, 9)
      for (let k = 0; k < maxCps; k++) {
        const cp = cps[k]
        pdf.setFillColor(255, 255, 255)
        pdf.setDrawColor(203, 213, 225)
        pdf.roundedRect(marginX, currentY, contentW, 12, 1.5, 1.5, 'FD')

        // Green check circle
        pdf.setFillColor(220, 252, 231)
        pdf.circle(marginX + 5, currentY + 6, 3, 'F')
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(7)
        pdf.setTextColor(22, 163, 74)
        pdf.text('✓', marginX + 5, currentY + 7.2, { align: 'center' })

        // Checkpoint name
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(9)
        pdf.setTextColor(15, 23, 42)
        pdf.text(String(cp.name || 'Punto de Control'), marginX + 11, currentY + 5)

        // Time & attendant
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(7.5)
        pdf.setTextColor(100, 116, 139)
        let timeText = `Fecha/Hora: ${formatColombiaDateTime(cp.timestamp)}`
        if (cp.attendedBy) {
          timeText += `   •   Entregado por: ${cp.attendedBy}`
        }
        pdf.text(timeText, marginX + 11, currentY + 9.5)

        currentY += 13.5
      }

      if (cps.length > 9) {
        pdf.setFont('helvetica', 'italic')
        pdf.setFontSize(8)
        pdf.setTextColor(100, 116, 139)
        pdf.text(`... y ${cps.length - 9} entregas adicionales registradas en el sistema`, marginX + 5, currentY + 4)
      }
    }

    // 5. FOOTER
    pdf.setDrawColor(226, 232, 240)
    pdf.line(marginX, 266, marginX + contentW, 266)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(148, 163, 184)
    pdf.text('Sistema de Asistencia y Entregas • Gobernación de Norte de Santander', marginX, 271)
    pdf.text(`Página ${pageNum} de ${totalPages}`, marginX + contentW, 271, { align: 'right' })
  }

  // Descargar todas las fichas filtradas en un archivo PDF real (Ultra rápido: ~1 segundo para 600 fichas)
  const handleDownloadPdf = async () => {
    if (filteredRegistrations.length === 0) {
      alert('No hay fichas para descargar con los filtros actuales.')
      return
    }

    try {
      setIsGeneratingPdf(true)
      setPdfProgressText('Generando PDF instantáneo...')

      const jsPDF = await ensureJsPdf()
      const logoData = await loadLogoBase64()

      const total = filteredRegistrations.length
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
        compress: true
      })

      // Generar todas las páginas en memoria directamente
      for (let i = 0; i < total; i++) {
        if (i > 0) pdf.addPage()
        drawFichaVector(pdf, filteredRegistrations[i], event, i + 1, total, logoData)
      }

      setPdfProgressText('Descargando archivo...')
      const safeEventName = (event.name || 'Evento').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)
      pdf.save(`Fichas_Asistencia_${safeEventName}.pdf`)
    } catch (err: any) {
      console.error('Error al generar PDF:', err)
      alert('Error al descargar el PDF: ' + (err?.message || 'Inténtalo de nuevo'))
    } finally {
      setIsGeneratingPdf(false)
      setPdfProgressText('')
    }
  }

  // Descargar una ficha individual en PDF de forma instantánea
  const handleDownloadSinglePdf = async (regId: string, participantName: string) => {
    try {
      setIsGeneratingPdf(true)
      setPdfProgressText('Generando ficha...')

      const reg = registrations.find(r => r.id === regId)
      if (!reg) throw new Error('No se encontró el registro')

      const jsPDF = await ensureJsPdf()
      const logoData = await loadLogoBase64()

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter',
        compress: true
      })

      drawFichaVector(pdf, reg, event, 1, 1, logoData)

      const safeName = (participantName || 'Participante').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)
      pdf.save(`Ficha_${safeName}.pdf`)
    } catch (err: any) {
      console.error('Error al generar PDF individual:', err)
      alert('Error al descargar la ficha en PDF: ' + (err?.message || 'Inténtalo de nuevo'))
    } finally {
      setIsGeneratingPdf(false)
      setPdfProgressText('')
    }
  }

  const handlePrintSingle = (documentNumber: string) => {
    try {
      flushSync(() => {
        setSearch(documentNumber)
      })
      handlePrint()
    } catch {
      setSearch(documentNumber)
      handlePrint()
    }
  }

  return (
    <>
      {/* Print & Screen Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          body {
            background-color: #f1f5f9;
            color: #0f172a;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .ficha {
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.06);
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .ficha.one-per-page {
            page-break-after: always;
            break-after: page;
          }
          .ficha-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 0.75rem;
            margin-bottom: 1rem;
          }
          .ficha-title {
            font-size: 1.25rem;
            font-weight: 800;
            color: #1e293b;
            margin: 0;
            line-height: 1.2;
          }
          .ficha-subtitle {
            font-size: 0.85rem;
            color: #64748b;
            margin-top: 0.25rem;
            font-weight: 600;
          }
          .grid-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 0.65rem;
            margin-bottom: 1.25rem;
          }
          @media (min-width: 640px) {
            .grid-info {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          .info-block {
            background: #f8fafc;
            padding: 0.5rem 0.75rem;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
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
            font-size: 0.875rem;
            color: #1e293b;
            word-break: break-word;
          }
          .checkpoints-container {
            display: flex;
            flex-direction: column;
            gap: 0.65rem;
          }
          .checkpoint-card {
            display: flex;
            gap: 0.75rem;
            padding: 0.65rem 0.85rem;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            background: #ffffff;
            align-items: center;
          }
          .checkpoint-details {
            flex: 1;
          }
          .checkpoint-name {
            font-size: 0.95rem;
            font-weight: 700;
            color: #0f172a;
            display: flex;
            align-items: center;
            gap: 0.4rem;
          }
          .checkpoint-time {
            font-size: 0.78rem;
            color: #64748b;
            margin-top: 0.15rem;
          }
          .evidence-img {
            width: 70px;
            height: 70px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid #cbd5e1;
          }
          
          @media print {
            html, body {
              background-color: white !important;
              color: #000000 !important;
              overflow: visible !important;
            }
            .sidebar, header, nav, .no-print {
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
            .ficha {
              box-shadow: none !important;
              border: 1px solid #94a3b8 !important;
              margin-bottom: 1.25rem !important;
              padding: 1rem !important;
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            .grid-info {
              gap: 0.5rem !important;
              margin-bottom: 1rem !important;
            }
            .info-block {
              border: 1px solid #cbd5e1 !important;
              background-color: #f8fafc !important;
            }
            .checkpoint-card {
              border: 1px solid #cbd5e1 !important;
            }
            @page {
              margin: 1cm;
              size: auto;
            }
          }
        `
      }} />

      {/* TOP CONTROLS BAR (Hidden during print) */}
      <div className="no-print" style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        padding: '0.85rem 1.25rem'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem'
        }}>
          {/* Back & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <Link 
              href={`/admin/events/${event.id}`} 
              className="btn btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.5rem 0.75rem', fontSize: '0.85rem', fontWeight: 600 }}
            >
              <ArrowLeft size={16} />
              <span>Volver</span>
            </Link>
            <div>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                Fichas de Asistencia y Entregas
              </h1>
              <p style={{ color: '#64748B', fontSize: '0.8rem', margin: '0.15rem 0 0' }}>
                {event.name} • Mostrando <strong>{filteredRegistrations.length}</strong> de {registrations.length}
              </p>
            </div>
          </div>

          {/* Action Print Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer', userSelect: 'none', marginRight: '0.5rem' }}>
              <input 
                type="checkbox" 
                checked={onePerPage} 
                onChange={e => setOnePerPage(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>1 ficha por hoja</span>
            </label>

            {/* Primary Action: Direct PDF Download */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={filteredRegistrations.length === 0 || isGeneratingPdf}
              className="btn btn-primary"
              style={{
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                cursor: isGeneratingPdf ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 10px rgba(22, 163, 74, 0.3)'
              }}
            >
              {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
              <span>{isGeneratingPdf ? (pdfProgressText || 'Generando...') : `Descargar PDF (${filteredRegistrations.length})`}</span>
            </button>

            {/* Secondary Action: Print via Browser */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={filteredRegistrations.length === 0 || isGeneratingPdf}
              className="btn btn-outline"
              title="Abrir vista de impresión tradicional"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#2563EB',
                borderColor: '#BFDBFE',
                padding: '0.55rem 0.95rem',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <Printer size={16} />
              <span>Imprimir</span>
            </button>

            <button
              type="button"
              onClick={handleOpenInBrowser}
              className="btn btn-outline"
              title="Abrir en pestaña normal del navegador"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                padding: '0.55rem 0.85rem',
                backgroundColor: '#F8FAFC',
                borderColor: '#CBD5E1',
                color: '#334155',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              <ExternalLink size={15} />
              <span>Abrir en Navegador</span>
            </button>

            <button
              type="button"
              onClick={handleCopyLink}
              className="btn btn-outline"
              title="Copiar enlace para pegar en Chrome o Edge"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                fontWeight: 600,
                padding: '0.55rem 0.85rem',
                backgroundColor: copiedLink ? '#ECFDF5' : '#F8FAFC',
                borderColor: copiedLink ? '#10B981' : '#CBD5E1',
                color: copiedLink ? '#047857' : '#334155',
                borderRadius: '8px',
                cursor: 'pointer'
              }}
            >
              {copiedLink ? <Check size={15} color="#10B981" /> : <Copy size={15} />}
              <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
            </button>
          </div>
        </div>

        {/* PWA App Mode Banner */}
        {isStandalone && (
          <div style={{
            maxWidth: '1200px',
            margin: '0.6rem auto 0',
            backgroundColor: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: '8px',
            padding: '0.5rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            fontSize: '0.8rem',
            color: '#1E40AF'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} color="#2563EB" />
              <span>
                <strong>Modo Aplicación (PWA):</strong> Si el cuadro de impresión no se abre directamente en tu app instalada, haz clic en <strong>Abrir en Navegador</strong> o copia el enlace y pégalo en una pestaña de Chrome/Edge.
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              style={{
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                padding: '0.3rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {copiedLink ? '¡Copiado!' : 'Copiar Enlace'}
            </button>
          </div>
        )}

        {/* Filter Toolbar */}
        <div style={{
          maxWidth: '1200px',
          margin: '0.75rem auto 0',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          paddingTop: '0.65rem',
          borderTop: '1px solid #F1F5F9'
        }}>
          {/* Search Box */}
          <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '360px' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, cédula o municipio..."
              style={{
                width: '100%',
                padding: '0.45rem 1.8rem 0.45rem 2.1rem',
                fontSize: '0.85rem',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                outline: 'none',
                backgroundColor: '#F8FAFC'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94A3B8'
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Estado:</span>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: statusFilter === 'ALL' ? '2px solid #2563EB' : '1px solid #CBD5E1',
                backgroundColor: statusFilter === 'ALL' ? '#EFF6FF' : '#FFFFFF',
                color: statusFilter === 'ALL' ? '#1D4ED8' : '#475569'
              }}
            >
              Todos ({registrations.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ASISTIO')}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: statusFilter === 'ASISTIO' ? '2px solid #10B981' : '1px solid #CBD5E1',
                backgroundColor: statusFilter === 'ASISTIO' ? '#ECFDF5' : '#FFFFFF',
                color: statusFilter === 'ASISTIO' ? '#047857' : '#475569'
              }}
            >
              Asistieron ({registrations.filter(r => r.status === 'ASISTIO').length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('REGISTRADO')}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: statusFilter === 'REGISTRADO' ? '2px solid #3B82F6' : '1px solid #CBD5E1',
                backgroundColor: statusFilter === 'REGISTRADO' ? '#EFF6FF' : '#FFFFFF',
                color: statusFilter === 'REGISTRADO' ? '#2563EB' : '#475569'
              }}
            >
              Pendientes ({registrations.filter(r => r.status === 'REGISTRADO').length})
            </button>
          </div>

          {/* Kit Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>Kit:</span>
            <button
              type="button"
              onClick={() => setKitFilter('ALL')}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: kitFilter === 'ALL' ? '2px solid #6366F1' : '1px solid #CBD5E1',
                backgroundColor: kitFilter === 'ALL' ? '#EEF2FF' : '#FFFFFF',
                color: kitFilter === 'ALL' ? '#4F46E5' : '#475569'
              }}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setKitFilter('WITH_KIT')}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: kitFilter === 'WITH_KIT' ? '2px solid #059669' : '1px solid #CBD5E1',
                backgroundColor: kitFilter === 'WITH_KIT' ? '#ECFDF5' : '#FFFFFF',
                color: kitFilter === 'WITH_KIT' ? '#047857' : '#475569'
              }}
            >
              Con Kit
            </button>
            <button
              type="button"
              onClick={() => setKitFilter('WITHOUT_KIT')}
              style={{
                padding: '0.3rem 0.6rem',
                borderRadius: '16px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: kitFilter === 'WITHOUT_KIT' ? '2px solid #D97706' : '1px solid #CBD5E1',
                backgroundColor: kitFilter === 'WITHOUT_KIT' ? '#FFFBEB' : '#FFFFFF',
                color: kitFilter === 'WITHOUT_KIT' ? '#B45309' : '#475569'
              }}
            >
              Sin Kit
            </button>
          </div>
        </div>
      </div>

      {/* PRINTABLE REPORT DOCUMENT CONTAINER */}
      <div id="printable-report-container" style={{ maxWidth: '900px', margin: '1.5rem auto', padding: '1rem', backgroundColor: '#FFFFFF', borderRadius: '8px' }}>
        
        {/* Cover / Header Section */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '2px solid #E2E8F0' }}>
          <img 
            src="/logo.png" 
            alt="Logo Gobernación" 
            style={{ maxHeight: '65px', marginBottom: '0.75rem', objectFit: 'contain' }} 
            onError={(e: any) => { e.target.style.display = 'none' }}
          />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#0F172A' }}>
            Fichas de Control de Asistencia y Entregas
          </h2>
          <h3 style={{ fontSize: '1.05rem', color: '#334155', margin: '0 0 0.4rem 0', fontWeight: 600 }}>
            {event.name}
          </h3>
          <p style={{ color: '#64748B', margin: 0, fontSize: '0.85rem' }}>
            Total en este reporte: <strong>{filteredRegistrations.length}</strong> personas
            {statusFilter !== 'ALL' && ` • Filtro: ${statusFilter === 'ASISTIO' ? 'Asistieron' : 'Pendientes'}`}
            {kitFilter !== 'ALL' && ` • Kit: ${kitFilter === 'WITH_KIT' ? 'Con Kit' : 'Sin Kit'}`}
          </p>
        </div>

        {/* Empty State */}
        {filteredRegistrations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3.5rem 1rem', background: 'white', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
            <User size={48} color="#94A3B8" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#334155', margin: '0 0 0.5rem' }}>
              No se encontraron registros con los filtros seleccionados
            </h3>
            <p style={{ color: '#64748B', fontSize: '0.85rem', margin: 0 }}>
              Prueba cambiando los filtros de estado o la búsqueda.
            </p>
            {(search || statusFilter !== 'ALL' || kitFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => { setSearch(''); setStatusFilter('ALL'); setKitFilter('ALL') }}
                className="btn btn-outline"
                style={{ marginTop: '1rem', fontSize: '0.85rem', padding: '0.45rem 1rem' }}
              >
                Restablecer todos los filtros
              </button>
            )}
          </div>
        ) : (
          /* Cards List */
          filteredRegistrations.map((reg) => {
            const p = reg.person || {}
            const cps: any[] = []
            if (reg.checkpoints) {
              try {
                const parsed = JSON.parse(reg.checkpoints)
                if (Array.isArray(parsed)) cps.push(...parsed)
              } catch (e) {}
            }

            let addData: Record<string, any> = {}
            if (p.additionalData) {
              try {
                const parsed = JSON.parse(p.additionalData)
                if (parsed && typeof parsed === 'object') addData = parsed
              } catch (e) {}
            }

            // Photo logic
            let photoUrl = addData.fotoIngreso || addData.foto || null
            if (!photoUrl) {
              const ingresoCp = cps.find((c: any) => c.name === 'Ingreso' && c.evidenceUrl)
              if (ingresoCp) photoUrl = ingresoCp.evidenceUrl
            }

            // Kit logic
            const kitScan = cps.find((c: any) => {
              const n = (c?.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              return n.includes('kit') || n.includes('bienvenida')
            })

            const fullName = [p.firstName, p.middleName, p.lastName, p.secondLastName].filter(Boolean).join(' ')

            return (
              <div 
                key={reg.id} 
                className={`ficha ${onePerPage ? 'one-per-page' : ''}`}
                id={`ficha-${reg.id}`}
              >
                {/* Header */}
                <div className="ficha-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {photoUrl ? (
                      <img 
                        src={photoUrl} 
                        alt="Foto" 
                        className="evidence-img"
                        style={{ width: '68px', height: '68px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #CBD5E1' }} 
                        onError={(e: any) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div style={{ width: '68px', height: '68px', borderRadius: '8px', backgroundColor: '#F1F5F9', border: '1px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                        <User size={30} />
                      </div>
                    )}
                    <div>
                      <h2 className="ficha-title">{fullName || 'Sin nombre registrado'}</h2>
                      <p className="ficha-subtitle">{p.documentType || 'DOC'} {p.documentNumber || 'Sin documento'}</p>
                      <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '12px',
                          backgroundColor: reg.status === 'ASISTIO' ? '#DCFCE7' : '#EFF6FF',
                          color: reg.status === 'ASISTIO' ? '#15803D' : '#1D4ED8',
                          border: `1px solid ${reg.status === 'ASISTIO' ? '#86EFAC' : '#BFDBFE'}`
                        }}>
                          {reg.status === 'ASISTIO' ? '✅ ASISTIÓ' : '⏳ REGISTRADO'}
                        </span>

                        {kitScan ? (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            backgroundColor: '#ECFDF5',
                            color: '#047857',
                            border: '1px solid #A7F3D0'
                          }}>
                            🎒 KIT ENTREGADO
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '12px',
                            backgroundColor: '#FFFBEB',
                            color: '#B45309',
                            border: '1px solid #FDE68A'
                          }}>
                            🎒 KIT PENDIENTE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>ID Registro</div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#1E293B' }}>{reg.id.slice(-8).toUpperCase()}</div>
                    
                    {/* Quick Actions (Hidden during PDF export and print) */}
                    <div className="no-print" data-html2canvas-ignore="true" style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => handleDownloadSinglePdf(reg.id, fullName || p.documentNumber || 'Ficha')}
                        disabled={isGeneratingPdf}
                        className="btn btn-outline"
                        title="Descargar esta ficha en archivo PDF"
                        style={{
                          padding: '0.25rem 0.55rem',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: '#F0FDF4',
                          borderColor: '#86EFAC',
                          color: '#15803D',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: isGeneratingPdf ? 'wait' : 'pointer',
                          borderRadius: '6px'
                        }}
                      >
                        <Download size={13} />
                        <span>Descargar PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePrintSingle(p.documentNumber || reg.id)}
                        disabled={isGeneratingPdf}
                        className="btn btn-outline"
                        title="Imprimir solo esta ficha"
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: '#F8FAFC',
                          borderColor: '#CBD5E1',
                          color: '#2563EB',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          cursor: 'pointer',
                          borderRadius: '6px'
                        }}
                      >
                        <Printer size={13} />
                        <span>Imprimir</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Participant Info Grid */}
                <div className="grid-info">
                  <div className="info-block">
                    <div className="info-label">Municipio</div>
                    <div className="info-value">{p.municipality || 'No registrado'}</div>
                  </div>

                  <div className="info-block">
                    <div className="info-label">Teléfono / Emergencia</div>
                    <div className="info-value">{addData.contactoEmergencia || 'No registrado'}</div>
                  </div>

                  <div className="info-block">
                    <div className="info-label">EPS</div>
                    <div className="info-value">{addData.eps || 'No registrada'}</div>
                  </div>

                  <div className="info-block">
                    <div className="info-label">Grupo Poblacional / Juvenil</div>
                    <div className="info-value">
                      {addData.grupoJuvenil === 'BASE_JUVENIL' ? 'Base Juvenil' :
                       addData.grupoJuvenil === 'ENLACE_MUNICIPAL' ? 'Enlace Municipal' :
                       addData.grupoJuvenil === 'CMJ' ? 'CMJ' :
                       addData.grupoJuvenil === 'PMJ' ? 'PMJ' :
                       (addData.grupoJuvenil || 'Ninguno')}
                    </div>
                  </div>

                  <div className="info-block">
                    <div className="info-label">Alergias / Médica</div>
                    <div className="info-value" style={{ color: addData.alergiasMedicas ? '#B91C1C' : '#1E293B' }}>
                      {addData.alergiasMedicas || 'Ninguna reportada'}
                    </div>
                  </div>

                  <div className="info-block">
                    <div className="info-label">Consentimiento Informado</div>
                    <div className="info-value">
                      {(() => {
                        const hasConsent = addData.q_auth_menores || addData.consentimiento || addData.autorizacion
                        if (hasConsent) {
                          return (
                            <span style={{ color: '#15803D', fontWeight: 700 }}>
                              ✅ Adjuntado (Digital)
                            </span>
                          )
                        }
                        return <span style={{ color: '#64748B' }}>No adjuntado</span>
                      })()}
                    </div>
                  </div>
                </div>

                {/* Checkpoints / Deliveries List */}
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.65rem 0', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.35rem', color: '#334155' }}>
                  Registro de Entregas y Puntos de Control ({cps.length})
                </h4>
                
                {cps.length === 0 ? (
                  <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: '0.5rem 0 0', fontStyle: 'italic' }}>
                    No hay puntos de control registrados aún para este participante.
                  </p>
                ) : (
                  <div className="checkpoints-container">
                    {cps.map((cp: any, index: number) => (
                      <div key={index} className="checkpoint-card">
                        <div className="checkpoint-details">
                          <div className="checkpoint-name">
                            <CheckCircle2 size={16} color="#16A34A" />
                            <span>{cp.name}</span>
                          </div>
                          <div className="checkpoint-time">
                            Fecha/Hora: {formatColombiaDateTime(cp.timestamp)}
                            {cp.attendedBy && (
                              <span style={{ marginLeft: '0.4rem', color: '#2563EB', fontWeight: 600 }}>
                                • Entregado por: {cp.attendedBy}
                              </span>
                            )}
                          </div>
                        </div>
                        {cp.evidenceUrl ? (
                          <div>
                            <img 
                              src={cp.evidenceUrl} 
                              alt="Evidencia" 
                              className="evidence-img"
                              onError={(e: any) => { e.target.style.display = 'none' }}
                            />
                          </div>
                        ) : (
                          <div style={{ width: '60px', height: '60px', backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: '6px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#94A3B8' }}>
                            <Camera size={18} style={{ opacity: 0.5 }} />
                            <span style={{ fontSize: '0.55rem', marginTop: '0.2rem' }}>Sin foto</span>
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
    </>
  )
}
