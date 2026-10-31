"use client"

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, AlertTriangle, Scan, Camera, User, RefreshCw, Volume2, Shield, QrCode, UploadCloud, CheckCircle2, ArrowRight } from 'lucide-react'

export default function ClientScanner({ 
  eventId, 
  eventName,
  checkpoints = ['Ingreso'],
  sessionUser
}: { 
  eventId: string
  eventName?: string
  checkpoints?: string[]
  sessionUser?: { id: string; email: string; name: string; role: string; assignedEventId?: string | null } | null
}) {
  
  // Parse checkpoints into day and meal components
  const parsedCheckpoints = checkpoints.map(cp => {
    if (cp.includes(' - ')) {
      const [dayPart, ...rest] = cp.split(' - ')
      return {
        fullName: cp,
        day: dayPart.trim(),
        mealLabel: rest.join(' - ').trim()
      }
    }
    return {
      fullName: cp,
      day: 'General',
      mealLabel: cp
    }
  })

  // Extract distinct days preserving original order
  const distinctDays: string[] = []
  parsedCheckpoints.forEach(item => {
    if (!distinctDays.includes(item.day)) {
      distinctDays.push(item.day)
    }
  })

  const hasDays = distinctDays.some(d => d !== 'General')

  // Find initial day (auto-match with today's date if possible)
  const getInitialDay = () => {
    if (!hasDays) return 'Todos'
    if (typeof window !== 'undefined') {
      const todayNum = new Date().getDate().toString()
      const match = distinctDays.find(d => d !== 'General' && d.includes(todayNum))
      if (match) return match
    }
    const firstMealDay = distinctDays.find(d => d !== 'General')
    return firstMealDay || distinctDays[0] || 'Todos'
  }

  const [selectedDay, setSelectedDay] = useState<string>(getInitialDay)

  // Find initial checkpoint
  const getInitialCheckpoint = () => {
    if (!hasDays) return checkpoints[0] || 'Ingreso'
    const initialDay = getInitialDay()
    const matching = parsedCheckpoints.find(cp => cp.day === initialDay)
    return matching?.fullName || checkpoints[0] || 'Ingreso'
  }

  const [activeCheckpoint, setActiveCheckpoint] = useState(getInitialCheckpoint)
  const [operatorName, setOperatorName] = useState(sessionUser?.name || 'Lector de QR y Control')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  
  // Camera scanner state (html5-qrcode)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [html5QrCodeInstance, setHtml5QrCodeInstance] = useState<any>(null)
  const isScanningRef = useRef(false)
  const [wasCameraActiveOnScan, setWasCameraActiveOnScan] = useState(false)

  // Mutable refs to prevent stale closure when camera is actively running
  const activeCheckpointRef = useRef(activeCheckpoint)
  const operatorNameRef = useRef(operatorName)
  const executeScanRef = useRef<(val: string) => Promise<void>>(async () => {})

  // Custom retroactive datetime state
  const [useCustomTime, setUseCustomTime] = useState(false)
  const [customDateTime, setCustomDateTime] = useState('')
  const customDateTimeRef = useRef(customDateTime)
  const useCustomTimeRef = useRef(useCustomTime)

  useEffect(() => {
    customDateTimeRef.current = customDateTime
  }, [customDateTime])

  useEffect(() => {
    useCustomTimeRef.current = useCustomTime
  }, [useCustomTime])

  useEffect(() => {
    activeCheckpointRef.current = activeCheckpoint
  }, [activeCheckpoint])

  useEffect(() => {
    operatorNameRef.current = operatorName
  }, [operatorName])

  // Evidence upload state
  const [uploadingEvidence, setUploadingEvidence] = useState(false)
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const qrFileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Chime sounds
  const playSound = (type: 'success' | 'warning' | 'error') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = audioCtx.createOscillator()
      const gain = audioCtx.createGain()
      
      if (type === 'success') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1) // A5
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.start()
        osc.stop(audioCtx.currentTime + 0.3)
      } else {
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(350, audioCtx.currentTime)
        osc.frequency.setValueAtTime(220, audioCtx.currentTime + 0.15)
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35)
        osc.connect(gain)
        gain.connect(audioCtx.destination)
        osc.start()
        osc.stop(audioCtx.currentTime + 0.35)
      }
    } catch (e) {}

    // Vibration on mobile
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      if (type === 'success') {
        navigator.vibrate([80, 40, 80])
      } else {
        navigator.vibrate([200, 100, 200])
      }
    }
  }

  // Start mobile camera scanner with html5-qrcode
  const startCamera = async () => {
    setCameraError(null)
    setResult(null)
    setCameraActive(true)

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      
      // Stop previous instance if exists
      if (html5QrCodeInstance) {
        try { await html5QrCodeInstance.stop() } catch (e) {}
      }

      const qrScanner = new Html5Qrcode("pwa-qr-reader")
      setHtml5QrCodeInstance(qrScanner)

      const config = { 
        fps: 15, 
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0
      }

      await qrScanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          if (!isScanningRef.current) {
            isScanningRef.current = true
            executeScanRef.current(decodedText)
            // Pause slightly so it doesn't multi-scan the same QR
            setTimeout(() => {
              isScanningRef.current = false
            }, 2500)
          }
        },
        () => {} // scan errors per frame ignored
      )
    } catch (err: any) {
      console.error('Camera Scanner Error:', err)
      setCameraError('No se pudo acceder a la cámara. Asegúrese de otorgar permisos o conectar mediante HTTPS.')
      setCameraActive(false)
    }
  }

  const stopCamera = async () => {
    if (html5QrCodeInstance) {
      try {
        await html5QrCodeInstance.stop()
        html5QrCodeInstance.clear()
      } catch (e) {}
      setHtml5QrCodeInstance(null)
    }
    setCameraActive(false)
  }

  // Scan QR code from photo capture (Works on mobile even without HTTPS!)
  const handleQrFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    setCameraError(null)
    setResult(null)

    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const qrScanner = html5QrCodeInstance || new Html5Qrcode("pwa-qr-reader")
      if (!html5QrCodeInstance) {
        setHtml5QrCodeInstance(qrScanner)
      }
      const decodedText = await qrScanner.scanFile(file, false)
      executeScan(decodedText)
    } catch (err: any) {
      console.error('File scan error:', err)
      playSound('error')
      setCameraError('No se detectó un código QR nítido en la fotografía. Intente tomarla más cerca o con mejor iluminación.')
    } finally {
      setLoading(false)
      if (qrFileInputRef.current) qrFileInputRef.current.value = ''
    }
  }

  useEffect(() => {
    return () => {
      if (html5QrCodeInstance) {
        try { html5QrCodeInstance.stop() } catch (e) {}
      }
    }
  }, [html5QrCodeInstance])

  // Auto-focus input when camera is off
  useEffect(() => {
    if (!cameraActive) {
      inputRef.current?.focus()
    }
  }, [result, activeCheckpoint, cameraActive])

  const executeScan = async (valueToScan: string) => {
    const cleanToken = valueToScan.trim()
    if (!cleanToken) return
    
    setLoading(true)
    setResult(null)
    setEvidenceUrl(null)
    
    const targetCheckpoint = activeCheckpointRef.current
    const targetOperator = operatorNameRef.current

    const customTimestamp = useCustomTimeRef.current && customDateTimeRef.current
      ? new Date(customDateTimeRef.current).toISOString()
      : undefined

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          qrToken: cleanToken, 
          eventId, 
          checkpoint: targetCheckpoint,
          attendedBy: targetOperator,
          customTimestamp
        })
      })
      
      const data = await res.json()
      
      if (res.ok) {
        playSound('success')
        const wasCam = cameraActive
        if (wasCam) {
          stopCamera()
        }
        setWasCameraActiveOnScan(wasCam)
        setResult({ type: 'success', data })
      } else if (res.status === 409) {
        playSound('warning')
        const wasCam = cameraActive
        if (wasCam) {
          stopCamera()
        }
        setWasCameraActiveOnScan(wasCam)
        setResult({ type: 'warning', data })
      } else {
        playSound('error')
        setResult({ type: 'error', message: data.error })
      }
    } catch (err: any) {
      playSound('error')
      setResult({ type: 'error', message: 'Error de conexión con el servidor' })
    } finally {
      setLoading(false)
      setToken('')
      setTimeout(() => {
        if (!fileInputRef.current?.matches(':focus') && !cameraActive) {
          inputRef.current?.focus()
        }
      }, 100)
    }
  }

  // Keep executeScanRef always fresh with current render
  useEffect(() => {
    executeScanRef.current = executeScan
  })

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    executeScan(token)
  }

  const handleEvidenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !result?.data?.registrationId) return
    
    setUploadingEvidence(true)
    
    try {
      const uploadData = new FormData()
      uploadData.append('file', file)
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadData })
      const uploadJson = await uploadRes.json()
      
      if (!uploadJson.url) throw new Error("Upload failed")
      
      await fetch('/api/scan/evidence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: result.data.registrationId,
          checkpoint: activeCheckpointRef.current,
          evidenceUrl: uploadJson.url
        })
      })
      
      setEvidenceUrl(uploadJson.url)
    } catch (err) {
      alert("Error al subir la evidencia fotográfica")
    } finally {
      setUploadingEvidence(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (galleryInputRef.current) galleryInputRef.current.value = ''
    }
  }

  const handleNextAttendee = () => {
    setResult(null)
    setEvidenceUrl(null)
    if (wasCameraActiveOnScan) {
      startCamera()
    } else {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // Get icon for checkpoint
  const getCheckpointIcon = (cp: string) => {
    const lower = cp.toLowerCase()
    if (lower.includes('ingreso') || lower.includes('entrada')) return '🚪'
    if (lower.includes('kit') || lower.includes('bienvenida')) return '🎒'
    if (lower.includes('desayuno') || lower.includes('cafe')) return '☕'
    if (lower.includes('almuerzo')) return '🍱'
    if (lower.includes('refrigerio') || lower.includes('merienda')) return '🍪'
    if (lower.includes('cena')) return '🍲'
    return '📍'
  }

  return (
    <div style={{ backgroundColor: '#0F172A', minHeight: '100vh', display: 'flex', flexDirection: 'column', color: '#F8FAFC' }}>
      
      {/* Top Mobile Bar */}
      <div style={{ 
        backgroundColor: '#1E293B', 
        padding: '0.85rem 1rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        borderBottom: '1px solid #334155',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <Link href={`/admin/events/${eventId}`} style={{ color: '#94A3B8', display: 'flex', alignItems: 'center', flexShrink: 0 }} title="Volver al evento">
            <ArrowLeft size={22} />
          </Link>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ 
              fontSize: '0.95rem', 
              fontWeight: 800, 
              margin: 0, 
              color: '#FFFFFF', 
              letterSpacing: '-0.02em',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '260px'
            }}>
              {eventName || 'Escáner QR'}
            </h1>
            <p style={{ fontSize: '0.7rem', color: '#38BDF8', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>🎪</span>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '240px' }}>
                {eventName ? `Evento: ${eventName}` : 'Control de Asistencia y Refrigerios'}
              </span>
            </p>
          </div>
        </div>

        {/* Operator Badge */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.4rem', 
          backgroundColor: '#0F172A', 
          padding: '0.4rem 0.75rem', 
          borderRadius: '20px', 
          border: '1px solid #334155',
          flexShrink: 0
        }}>
          <User size={14} color="#38BDF8" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ color: '#F8FAFC', fontSize: '0.75rem', fontWeight: 700, maxWidth: '130px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {operatorName}
            </span>
            {sessionUser?.role && (
              <span style={{ fontSize: '0.62rem', color: '#38BDF8', fontWeight: 600 }}>
                {sessionUser.role}
              </span>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, padding: '1rem', maxWidth: '640px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {/* CHECKPOINT / DAY SELECTOR BAR */}
        <div style={{ backgroundColor: '#1E293B', borderRadius: '16px', padding: '0.9rem', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              🎯 Entrega / Punto a Registrar:
            </label>
            <span style={{ 
              fontSize: '0.82rem', 
              fontWeight: 800, 
              color: '#38BDF8', 
              backgroundColor: '#0F172A', 
              border: '1px solid #0284C7',
              padding: '0.25rem 0.75rem', 
              borderRadius: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(2, 132, 199, 0.25)'
            }}>
              <span style={{ fontSize: '1rem' }}>{getCheckpointIcon(activeCheckpoint)}</span>
              <span>{activeCheckpoint}</span>
            </span>
          </div>

          {/* DAY TABS BAR (When multi-day checkpoints are present) */}
          {hasDays && (
            <div style={{ marginBottom: '0.75rem', borderBottom: '1px solid #334155', paddingBottom: '0.65rem' }}>
              <div style={{ 
                display: 'flex', 
                gap: '0.4rem', 
                overflowX: 'auto', 
                scrollbarWidth: 'none',
                alignItems: 'center'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', marginRight: '0.2rem', whiteSpace: 'nowrap' }}>
                  📅 DÍA:
                </span>
                {distinctDays.map(dayName => {
                  const isDaySelected = selectedDay === dayName
                  const dayCheckpoints = parsedCheckpoints.filter(cp => cp.day === dayName)
                  return (
                    <button
                      key={dayName}
                      type="button"
                      onClick={() => {
                        setSelectedDay(dayName)
                        const firstInDay = dayCheckpoints[0]
                        if (firstInDay && activeCheckpointRef.current.indexOf(dayName) === -1) {
                          setActiveCheckpoint(firstInDay.fullName)
                          activeCheckpointRef.current = firstInDay.fullName
                          setResult(null)
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.8rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: isDaySelected ? '2px solid #38BDF8' : '1px solid #334155',
                        backgroundColor: isDaySelected ? '#0284C7' : '#0F172A',
                        color: isDaySelected ? '#FFFFFF' : '#94A3B8',
                        boxShadow: isDaySelected ? '0 2px 8px rgba(2, 132, 199, 0.4)' : 'none'
                      }}
                    >
                      <span>{dayName}</span>
                      <span style={{ 
                        fontSize: '0.7rem', 
                        padding: '0.1rem 0.35rem', 
                        borderRadius: '10px', 
                        backgroundColor: isDaySelected ? 'rgba(255,255,255,0.25)' : '#1E293B',
                        color: isDaySelected ? '#FFFFFF' : '#64748B'
                      }}>
                        {dayCheckpoints.length}
                      </span>
                    </button>
                  )
                })}

                <button
                  type="button"
                  onClick={() => setSelectedDay('Todos')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.45rem 0.8rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    border: selectedDay === 'Todos' ? '2px solid #38BDF8' : '1px solid #334155',
                    backgroundColor: selectedDay === 'Todos' ? '#0284C7' : '#0F172A',
                    color: selectedDay === 'Todos' ? '#FFFFFF' : '#94A3B8'
                  }}
                >
                  Ver Todos
                </button>
              </div>
            </div>
          )}

          {/* MEAL / CHECKPOINT BUTTONS */}
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            overflowX: 'auto', 
            paddingBottom: '0.25rem',
            scrollbarWidth: 'none'
          }}>
            {(selectedDay === 'Todos' ? parsedCheckpoints : parsedCheckpoints.filter(cp => cp.day === selectedDay)).map(cp => {
              const isSelected = activeCheckpoint === cp.fullName
              return (
                <button
                  key={cp.fullName}
                  type="button"
                  onClick={() => { 
                    setActiveCheckpoint(cp.fullName); 
                    activeCheckpointRef.current = cp.fullName;
                    setResult(null); 
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.65rem 1rem',
                    borderRadius: '12px',
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isSelected ? '2px solid #34D399' : '1px solid #334155',
                    backgroundColor: isSelected ? '#059669' : '#0F172A',
                    color: isSelected ? '#FFFFFF' : '#CBD5E1',
                    boxShadow: isSelected ? '0 4px 14px rgba(5, 150, 105, 0.4)' : 'none'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{getCheckpointIcon(cp.mealLabel)}</span>
                  <span>{selectedDay === 'Todos' ? cp.fullName : cp.mealLabel}</span>
                  {isSelected && <span style={{ fontSize: '0.8rem', marginLeft: '0.2rem' }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* RETROACTIVE / CUSTOM DATE & TIME CONTROL */}
        <div style={{
          backgroundColor: '#1E293B',
          borderRadius: '14px',
          padding: '0.75rem 1rem',
          border: '1px solid #334155',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>⏱️</span>
              <span>Ajustar fecha y hora de marcado:</span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (!useCustomTime && !customDateTime) {
                  const nowLocal = new Date().toISOString().slice(0, 16)
                  setCustomDateTime(nowLocal)
                }
                setUseCustomTime(!useCustomTime)
              }}
              style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.25rem 0.65rem',
                borderRadius: '20px',
                border: 'none',
                cursor: 'pointer',
                backgroundColor: useCustomTime ? '#0284C7' : '#334155',
                color: '#FFFFFF'
              }}
            >
              {useCustomTime ? 'Modo Retroactivo ACTIVO' : 'Usar Fecha Actual'}
            </button>
          </div>

          {useCustomTime && (
            <div style={{ paddingTop: '0.4rem', borderTop: '1px dashed #334155', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8' }}>
                Todos los escaneos o ingresos se guardarán con esta fecha y hora:
              </div>
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={e => setCustomDateTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  border: '1.5px solid #0284C7',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  outline: 'none'
                }}
              />
            </div>
          )}
        </div>

        {/* CAMERA SCANNER AREA */}
        <div style={{ 
          backgroundColor: '#1E293B', 
          borderRadius: '16px', 
          padding: '1rem', 
          border: '1px solid #334155',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
          textAlign: 'center'
        }}>
          {!cameraActive ? (
            <div style={{ padding: '1.5rem 1rem' }}>
              <div style={{ 
                width: '70px', 
                height: '70px', 
                backgroundColor: '#0F172A', 
                borderRadius: '50%', 
                margin: '0 auto 1rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: '2px solid #38BDF8'
              }}>
                <Camera size={34} color="#38BDF8" />
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: '#FFFFFF' }}>
                Lector de Cámara en Celular
              </h2>
              <p style={{ fontSize: '0.85rem', color: '#94A3B8', maxWidth: '380px', margin: '0 auto 1.25rem', lineHeight: 1.4 }}>
                Apunta la cámara de tu celular al código QR del carnet o sticker del asistente para registrar <strong>{activeCheckpoint}</strong> al instante.
              </p>

              <button
                type="button"
                onClick={startCamera}
                className="btn btn-primary"
                style={{ 
                  width: '100%', 
                  padding: '1rem', 
                  fontSize: '1.1rem', 
                  fontWeight: 800,
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.75rem',
                  backgroundColor: '#2563EB',
                  borderRadius: '12px',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)'
                }}
              >
                <Camera size={22} />
                Activar Escáner en Vivo (Video)
              </button>

              {/* Botón de foto directa para cuando no hay HTTPS */}
              <input 
                type="file"
                ref={qrFileInputRef}
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={handleQrFileScan}
              />
              <button
                type="button"
                onClick={() => qrFileInputRef.current?.click()}
                disabled={loading}
                style={{
                  width: '100%',
                  marginTop: '0.75rem',
                  padding: '0.85rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  backgroundColor: '#0F172A',
                  color: '#38BDF8',
                  border: '1px solid #0284C7',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                <QrCode size={20} />
                📸 Tomar Foto al QR (Funciona Sin HTTPS)
              </button>

              {cameraError && (
                <div style={{ marginTop: '0.85rem', padding: '0.85rem', backgroundColor: '#450A0A', border: '1px solid #991B1B', borderRadius: '10px', color: '#FCA5A5', fontSize: '0.82rem', textAlign: 'left' }}>
                  <p style={{ margin: '0 0 0.35rem 0', fontWeight: 700 }}>⚠️ {cameraError}</p>
                  <p style={{ margin: 0, fontSize: '0.78rem', color: '#CBD5E1', lineHeight: 1.4 }}>
                    <strong>Solución rápida:</strong> En celulares por red local (HTTP), los navegadores bloquean el video en vivo. Pulsa el botón celeste <strong>"📸 Tomar Foto al QR"</strong> para escanear directamente con la cámara del celular sin requerir HTTPS, o accede mediante <strong>HTTPS</strong>.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.8rem', color: '#4ADE80', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  ● Cámara Activa - Escaneando QR
                </span>
                <button
                  type="button"
                  onClick={stopCamera}
                  style={{
                    backgroundColor: '#EF4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.35rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Detener Cámara
                </button>
              </div>

              <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '0.5rem' }}>
                Enfoca el código QR en el cuadro central. Sonará y vibrará al validar.
              </p>
            </div>
          )}

          {/* Viewport for html5-qrcode (Always mounted for file or stream scanning) */}
          <div 
            id="pwa-qr-reader" 
            style={{ 
              width: '100%', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              border: cameraActive ? '2px solid #38BDF8' : 'none',
              backgroundColor: '#000',
              display: cameraActive ? 'block' : 'none',
              marginTop: cameraActive ? '0.5rem' : 0
            }} 
          />
        </div>

        {/* MANUAL INPUT FALLBACK (Pistola USB o Cédula) */}
        <div style={{ backgroundColor: '#1E293B', borderRadius: '14px', padding: '1rem', border: '1px solid #334155' }}>
          <form onSubmit={handleScan} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="tokenInput" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Scan size={14} color="#38BDF8" /> Digitar Cédula Manual o Pistola USB:
              </label>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                ref={inputRef}
                type="text" 
                id="tokenInput"
                value={token}
                onChange={e => setToken(e.target.value.toUpperCase())}
                placeholder="Número de cédula o ID..."
                autoComplete="off"
                disabled={loading}
                style={{ 
                  flex: 1, 
                  padding: '0.75rem 1rem', 
                  fontSize: '1rem',
                  borderRadius: '10px',
                  border: '1px solid #475569',
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF'
                }}
              />
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading || !token}
                style={{ borderRadius: '10px', padding: '0 1.25rem', fontWeight: 700 }}
              >
                {loading ? '...' : 'Validar'}
              </button>
            </div>
          </form>
        </div>

        {/* SCAN RESULT FEEDBACK MODAL (OPTIMIZADO PARA MÓVILES Y EVIDENCIA) */}
        {result && (
          <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{
              width: '100%',
              maxWidth: '480px',
              maxHeight: '92vh',
              overflowY: 'auto',
              borderRadius: '20px',
              padding: '1.5rem',
              textAlign: 'center',
              backgroundColor: result.type === 'success' ? '#064E3B' : result.type === 'warning' ? '#713F12' : '#7F1D1D',
              border: `2px solid ${result.type === 'success' ? '#10B981' : result.type === 'warning' ? '#F59E0B' : '#EF4444'}`,
              boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
              color: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              {/* SUCCESS */}
              {result.type === 'success' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <CheckCircle size={46} color="#34D399" />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34D399', margin: '0 0 0.35rem 0' }}>
                      ¡ENTREGA CONFIRMADA!
                    </h2>
                    <div style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      backgroundColor: '#047857', 
                      padding: '0.4rem 1.1rem', 
                      borderRadius: '20px', 
                      fontSize: '0.95rem', 
                      fontWeight: 800, 
                      border: '1.5px solid #34D399'
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>{getCheckpointIcon(result.data.checkpoint)}</span>
                      <span>{result.data.checkpoint}</span>
                    </div>
                  </div>

                  <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#FFFFFF' }}>
                      {result.data.person.firstName} {result.data.person.lastName}
                    </h3>
                    <p style={{ color: '#D1FAE5', margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                      {result.data.person.documentType} {result.data.person.documentNumber}
                      {result.data.person.municipality && ` • ${result.data.person.municipality}`}
                    </p>
                    {typeof result.data.hasKit === 'boolean' && (
                      <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.65rem',
                          borderRadius: '20px',
                          backgroundColor: result.data.hasKit ? '#065F46' : '#78350F',
                          color: result.data.hasKit ? '#6EE7B7' : '#FDE68A',
                          border: result.data.hasKit ? '1px solid #059669' : '1px solid #D97706'
                        }}>
                          {result.data.hasKit ? '🎒 Kit: Ya Entregado' : '🎒 Kit: Pendiente por reclamar'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ADJUNTAR EVIDENCIA FOTOGRÁFICA (OPCIONAL) */}
                  <div style={{ 
                    backgroundColor: 'rgba(0,0,0,0.25)', 
                    padding: '1rem', 
                    borderRadius: '14px', 
                    border: '1px dashed rgba(255,255,255,0.3)' 
                  }}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      ref={fileInputRef}
                      style={{ display: 'none' }} 
                      onChange={handleEvidenceUpload}
                    />
                    <input 
                      type="file" 
                      accept="image/*" 
                      ref={galleryInputRef}
                      style={{ display: 'none' }} 
                      onChange={handleEvidenceUpload}
                    />

                    {!evidenceUrl ? (
                      <div>
                        <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#D1FAE5', margin: '0 0 0.35rem 0' }}>
                          📸 Foto / Evidencia de Entrega (Opcional):
                        </p>
                        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', margin: '0 0 0.85rem 0', lineHeight: 1.3 }}>
                          Si deseas dejar soporte visual de la entrega de {result.data.checkpoint}, toma una foto o elígela de la galería.
                        </p>

                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button 
                            type="button" 
                            disabled={uploadingEvidence}
                            onClick={() => fileInputRef.current?.click()}
                            style={{ 
                              flex: '1',
                              minWidth: '140px',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              gap: '0.5rem', 
                              padding: '0.7rem 1rem', 
                              borderRadius: '10px', 
                              border: 'none',
                              backgroundColor: '#10B981',
                              color: '#FFFFFF',
                              fontWeight: 700,
                              fontSize: '0.88rem',
                              cursor: 'pointer',
                              boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
                            }}
                          >
                            <Camera size={18} />
                            {uploadingEvidence ? 'Subiendo...' : 'Tomar Foto'}
                          </button>

                          <button 
                            type="button" 
                            disabled={uploadingEvidence}
                            onClick={() => galleryInputRef.current?.click()}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              gap: '0.4rem', 
                              padding: '0.7rem 1rem', 
                              borderRadius: '10px', 
                              border: '1px solid rgba(255,255,255,0.3)',
                              backgroundColor: 'rgba(255,255,255,0.1)',
                              color: '#FFFFFF',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              cursor: 'pointer'
                            }}
                          >
                            <UploadCloud size={16} />
                            <span>Galería</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34D399', fontWeight: 800, fontSize: '0.9rem' }}>
                          <CheckCircle2 size={18} />
                          <span>¡Evidencia Guardada con Éxito!</span>
                        </div>
                        <img 
                          src={evidenceUrl} 
                          alt="Evidencia" 
                          style={{ 
                            width: '90px', 
                            height: '90px', 
                            objectFit: 'cover', 
                            borderRadius: '10px', 
                            border: '3px solid #34D399',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                          }} 
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            fontSize: '0.75rem',
                            color: 'rgba(255,255,255,0.8)',
                            background: 'none',
                            border: 'none',
                            textDecoration: 'underline',
                            cursor: 'pointer'
                          }}
                        >
                          Volver a tomar foto
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* DUPLICATE WARNING */}
              {result.type === 'warning' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {result.data.alreadyHasKit ? (
                      <span style={{ fontSize: '3rem', lineHeight: 1 }}>🎒🚫</span>
                    ) : (
                      <AlertTriangle size={46} color="#FBBF24" />
                    )}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: result.data.alreadyHasKit ? '#F87171' : '#FBBF24', margin: '0 0 0.35rem 0' }}>
                      {result.data.alreadyHasKit ? '¡YA RECIBIÓ SU KIT DE BIENVENIDA!' : 'ENTREGA YA REALIZADA'}
                    </h2>
                    <div style={{
                      backgroundColor: result.data.alreadyHasKit ? '#7F1D1D' : 'rgba(0,0,0,0.25)',
                      border: result.data.alreadyHasKit ? '2px solid #EF4444' : '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '0.85rem',
                      marginTop: '0.5rem'
                    }}>
                      <p style={{ fontSize: '0.95rem', color: '#FEF3C7', margin: 0, fontWeight: 700 }}>
                        {result.data.error}
                      </p>
                      {result.data.alreadyHasKit && (
                        <p style={{ margin: '0.45rem 0 0', fontSize: '0.82rem', color: '#FCA5A5', fontWeight: 800 }}>
                          🛑 ADVERTENCIA: NO ENTREGAR OTRO KIT. El kit se entrega únicamente 1 vez por persona en todo el evento.
                        </p>
                      )}
                    </div>
                  </div>
                  <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.25rem 0' }}>
                      {result.data.person.firstName} {result.data.person.lastName}
                    </h3>
                    <p style={{ color: '#FDE68A', margin: 0, fontSize: '0.85rem' }}>
                      {result.data.person.documentType} {result.data.person.documentNumber}
                      {result.data.person.municipality && ` • ${result.data.person.municipality}`}
                    </p>
                  </div>
                </>
              )}

              {/* ERROR */}
              {result.type === 'error' && (
                <>
                  <AlertTriangle size={46} color="#F87171" style={{ margin: '0 auto' }} />
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F87171', margin: 0 }}>
                    {result.message?.includes('pertenece al evento') ? '⚠️ ASISTENTE DE OTRO EVENTO' : 'CÓDIGO NO VÁLIDO'}
                  </h2>
                  <p style={{ fontSize: '0.95rem', color: '#FECACA', margin: 0, lineHeight: 1.4 }}>
                    {result.message}
                  </p>
                  {result.message?.includes('pertenece al evento') && (
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '10px', fontSize: '0.82rem', color: '#FCA5A5', marginTop: '0.25rem' }}>
                      💡 Este asistente debe reclamar su refrigerio en la estación del otro evento.
                    </div>
                  )}
                </>
              )}

              {/* BIG BUTTON: SIGUIENTE ASISTENTE */}
              <button
                type="button"
                onClick={handleNextAttendee}
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  padding: '0.95rem',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.3)'
                }}
              >
                <span>Siguiente Asistente</span>
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
