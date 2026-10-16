"use client"

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Info, User, ShieldCheck, Map, Users, Activity, FileText, Camera, CheckCircle2, Trash2, RefreshCw, UploadCloud, Printer, RotateCcw, Lock, Mail, ArrowRight, Calendar, MapPin } from 'lucide-react'

const MUNICIPIOS_NDS = [
  'Ábrego', 'Arboledas', 'Bochalema', 'Bucarasica', 'Cáchira', 'Cácota', 'Chinácota', 'Chitagá', 'Convención', 'Cúcuta',
  'Cucutilla', 'Durania', 'El Carmen', 'El Tarra', 'El Zulia', 'Gramalote', 'Hacarí', 'Herrán', 'La Esperanza', 'La Playa de Belén',
  'Labateca', 'Los Patios', 'Lourdes', 'Mutiscua', 'Ocaña', 'Pamplona', 'Pamplonita', 'Puerto Santander', 'Ragonvalia', 'Salazar de Las Palmas',
  'San Calixto', 'San Cayetano', 'Santiago', 'Sardinata', 'Silos', 'Teorama', 'Tibú', 'Toledo', 'Villa Caro', 'Villa del Rosario'
]

const INITIAL_FORM_DATA = {
  dataTreatment: '',
  municipality: '',
  firstName: '',
  middleName: '',
  lastName: '',
  secondLastName: '',
  birthDate: '',
  sex: '',
  gender: '',
  specialCondition: '',
  discapacidad: '',
  grupoEtnico: '',
  victima: '',
  liderSocial: '',
  grupoJuvenil: '',
  locationType: '',
  educationLevel: '',
  alergiasMedicas: '',
  eps: '',
  contactoEmergencia: '',
  dynamicAnswers: {} as Record<string, string>
}

export default function ClientForm({ 
  eventId, 
  eventData,
  mode = 'public', 
  formConfig = {},
  municipalityCounts = {}
}: { 
  eventId: string, 
  eventData?: {
    name: string
    description?: string
    startDate?: string | null
    endDate?: string | null
    location?: string | null
    organizer?: string | null
    capacity?: number | null
    imageUrl?: string | null
  },
  mode?: string, 
  formConfig?: any,
  municipalityCounts?: Record<string, number>
}) {
  const isOnsite = mode === 'onsite'
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [person, setPerson] = useState<any>(null)
  const [docType, setDocType] = useState('')
  const [docNumber, setDocNumber] = useState('')
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, boolean>>({})

  // Onsite entrance photo state
  const [fotoIngreso, setFotoIngreso] = useState<string | null>(null)
  const [uploadingFoto, setUploadingFoto] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputFotoRef = useRef<HTMLInputElement>(null)
  
  const [formData, setFormData] = useState({ ...INITIAL_FORM_DATA })

  // Optional email access restriction state
  const isRestrictedByEmail = !isOnsite && Boolean(formConfig?.restrictedByEmail && Array.isArray(formConfig?.allowedEmails) && formConfig.allowedEmails.length > 0)
  const [accessEmail, setAccessEmail] = useState('')
  const [accessGranted, setAccessGranted] = useState(false)
  const [accessError, setAccessError] = useState<string | null>(null)
  const [validatedEmail, setValidatedEmail] = useState<string>('')

  const handleVerifyEmail = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setAccessError(null)

    const inputEmail = accessEmail.trim().toLowerCase()
    if (!inputEmail || !inputEmail.includes('@') || !inputEmail.includes('.')) {
      setAccessError('Por favor ingresa un correo electrónico válido.')
      return
    }

    const allowedList = (formConfig.allowedEmails || []).map((em: string) => em.trim().toLowerCase())
    if (allowedList.includes(inputEmail)) {
      setValidatedEmail(inputEmail)
      setAccessGranted(true)
      setAccessError(null)
    } else {
      setAccessError('El correo ingresado no se encuentra autorizado en la lista de invitados para este evento institucional. Comunícate con los organizadores si crees que es un error.')
    }
  }

  // Function to completely reset form for a clean new registration
  const resetForm = (clearDoc = true) => {
    setPerson(null)
    if (clearDoc) {
      setDocType('')
      setDocNumber('')
    }
    setFotoIngreso(null)
    setUploadingFoto(false)
    stopCamera()
    setUploadingFiles({})
    setError(null)
    setFormData({ ...INITIAL_FORM_DATA })
  }

  // Ensure form starts completely blank on mount
  useEffect(() => {
    resetForm(true)
  }, [])

  // When changing document type or number, unlink previous person
  const handleDocTypeChange = (val: string) => {
    setDocType(val)
    if (person) {
      setPerson(null)
      setFotoIngreso(null)
      setFormData(prev => ({
        ...INITIAL_FORM_DATA,
        dataTreatment: prev.dataTreatment
      }))
    }
  }

  const handleDocNumberChange = (val: string) => {
    setDocNumber(val.toUpperCase())
    if (person) {
      setPerson(null)
      setFotoIngreso(null)
      setFormData(prev => ({
        ...INITIAL_FORM_DATA,
        dataTreatment: prev.dataTreatment
      }))
    }
  }

  // Start live webcam stream
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      })
      streamRef.current = stream
      setCameraActive(true)
    } catch (err) {
      console.error('Error accessing camera:', err)
      alert('No se pudo acceder a la cámara del dispositivo. Puede usar el botón de seleccionar archivo o verificar permisos del navegador.')
    }
  }

  // Stop live stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setCameraActive(false)
  }

  // Capture frame from video and upload
  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    stopCamera()
    setUploadingFoto(true)

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setUploadingFoto(false)
        return
      }
      try {
        const data = new FormData()
        data.append('file', blob, `foto_${docNumber || Date.now()}.jpg`)
        const res = await fetch('/api/upload', { method: 'POST', body: data })
        const json = await res.json()
        if (json.url) {
          setFotoIngreso(json.url)
        }
      } catch (err) {
        console.error('Upload error:', err)
        alert('Error al guardar la fotografía')
      } finally {
        setUploadingFoto(false)
      }
    }, 'image/jpeg', 0.88)
  }

  // Attach stream to video tag when active
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(console.error)
    }
  }, [cameraActive])

  // Clean up media tracks on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const edad = useMemo(() => {
    if (!formData.birthDate) return ''
    const birth = new Date(formData.birthDate)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age >= 0 ? age : ''
  }, [formData.birthDate])

  const handleDocBlur = async () => {
    if (!docNumber || docNumber.length < 4 || !docType) return
    
    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/person/lookup?type=${docType}&number=${docNumber}&eventId=${eventId}`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al consultar')
      }

      if (data.person) {
        setPerson(data.person)
        if (data.alreadyRegistered) {
          setError(`Esta persona (${docType} ${docNumber} - ${data.person.firstName} ${data.person.lastName}) ya se encuentra registrada en este evento.`)
        }

        const addData = data.person.additionalData ? JSON.parse(data.person.additionalData) : {}
        
        // Extract known non-standard fields
        const {
          dataTreatment, discapacidad, grupoEtnico, victima, liderSocial, grupoJuvenil,
          alergiasMedicas, eps, contactoEmergencia, foto, fotoIngreso: savedFotoIngreso, ...restDynamic
        } = addData

        if (savedFotoIngreso || foto) {
          setFotoIngreso(savedFotoIngreso || foto)
        } else {
          setFotoIngreso(null)
        }

        setFormData({
          ...formData,
          firstName: data.person.firstName || '',
          middleName: data.person.middleName || '',
          lastName: data.person.lastName || '',
          secondLastName: data.person.secondLastName || '',
          municipality: data.person.municipality || '',
          birthDate: data.person.birthDate ? new Date(data.person.birthDate).toISOString().split('T')[0] : '',
          gender: data.person.gender || '',
          sex: data.person.sex || '',
          specialCondition: data.person.specialCondition === 'INDIGENTE' ? 'HABITANTE_DE_CALLE' : (data.person.specialCondition || ''),
          locationType: data.person.locationType || '',
          educationLevel: data.person.educationLevel || '',
          
          dataTreatment: dataTreatment || formData.dataTreatment || '',
          discapacidad: discapacidad || '',
          grupoEtnico: grupoEtnico || '',
          victima: victima || '',
          liderSocial: liderSocial || '',
          grupoJuvenil: grupoJuvenil || '',
          alergiasMedicas: alergiasMedicas || '',
          eps: eps || '',
          contactoEmergencia: contactoEmergencia || '',
          dynamicAnswers: restDynamic || {}
        })
      } else {
        // PERSONA NUEVA: Asegurar que todos los campos queden en blanco
        setPerson(null)
        setFotoIngreso(null)
        setFormData(prev => ({
          ...INITIAL_FORM_DATA,
          dataTreatment: prev.dataTreatment
        }))
      }
    } catch (err: any) {
      setPerson(null)
      setFotoIngreso(null)
      setFormData(prev => ({
        ...INITIAL_FORM_DATA,
        dataTreatment: prev.dataTreatment
      }))
      if (!err.message?.includes('No encontrado')) {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.dataTreatment !== 'SI') {
      setError('Debe aceptar la política de tratamiento de datos para continuar.')
      return
    }
    if (!docType) {
      setError('Debe seleccionar el tipo de documento.')
      return
    }

    // Check municipality quota on client submit
    const munQuotas: Record<string, number> = formConfig?.municipalityQuotas || {}
    const quotaForMun = formData.municipality ? munQuotas[formData.municipality] : undefined
    const countForMun = formData.municipality ? (municipalityCounts[formData.municipality] || 0) : 0
    if (!isOnsite && quotaForMun && quotaForMun > 0 && countForMun >= quotaForMun) {
      setError(`Cupo lleno para el municipio ${formData.municipality} (${countForMun}/${quotaForMun} registrados). No es posible completar más inscripciones.`)
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      // Sanitize custom answers to uppercase if text
      const cleanCustomAnswers: Record<string, any> = {}
      Object.entries(formData.dynamicAnswers || {}).forEach(([k, v]) => {
        if (typeof v === 'string') {
          cleanCustomAnswers[k] = v.startsWith('http') || v.startsWith('/') ? v : v.trim().toUpperCase()
        } else {
          cleanCustomAnswers[k] = v
        }
      })

      // Pack everything into customAnswers so the API just strings it
      const payload = {
        eventId,
        docType,
        docNumber: docNumber.trim().toUpperCase(),
        personId: person?.id,
        isOnsite, // Add this line so backend knows to auto-verify
        fotoIngreso,
        authorizedEmail: validatedEmail || undefined,
        firstName: formData.firstName.trim().toUpperCase(),
        middleName: formData.middleName ? formData.middleName.trim().toUpperCase() : '',
        lastName: formData.lastName.trim().toUpperCase(),
        secondLastName: formData.secondLastName ? formData.secondLastName.trim().toUpperCase() : '',
        municipality: formData.municipality,
        birthDate: formData.birthDate,
        sex: formData.sex,
        gender: formData.gender,
        specialCondition: formData.specialCondition,
        locationType: formData.locationType,
        educationLevel: formData.educationLevel,
        customAnswers: {
          dataTreatment: formData.dataTreatment,
          discapacidad: formData.discapacidad,
          grupoEtnico: formData.grupoEtnico,
          victima: formData.victima,
          liderSocial: formData.liderSocial,
          grupoJuvenil: formData.grupoJuvenil,
          alergiasMedicas: formData.alergiasMedicas ? formData.alergiasMedicas.trim().toUpperCase() : '',
          eps: formData.eps ? formData.eps.trim().toUpperCase() : '',
          contactoEmergencia: formData.contactoEmergencia ? formData.contactoEmergencia.trim().toUpperCase() : '',
          fotoIngreso: fotoIngreso || undefined,
          foto: fotoIngreso || undefined,
          authorizedEmail: validatedEmail || undefined,
          ...cleanCustomAnswers
        }
      }
      
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al registrar')
      }
      
      if (isOnsite) {
        router.push(`/event/${eventId}/sticker/${data.registrationId}`)
      } else {
        router.push(`/event/${eventId}/success/${data.registrationId}`)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Determine which sections to show (default true to maintain compatibility with existing events)
  const showDemographics = formConfig?.showDemographics !== false
  const showMedical = formConfig?.showMedical !== false
  const customQuestions = formConfig?.customQuestions || []

  // If email restriction is active and access hasn't been granted yet, show gate screen
  if (isRestrictedByEmail && !accessGranted) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        position: 'relative',
        overflowX: 'hidden'
      }}>
        <div className="safe-bg" />
        <div className="safe-overlay" />

        <div className="container" style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '2rem 1rem',
          position: 'relative',
          zIndex: 1
        }}>
          <div className="glass-panel animate-fade-in" style={{ 
            maxWidth: '500px', 
            width: '100%',
            padding: '2.5rem 2rem',
            borderRadius: '20px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 20px 40px rgba(0,0,0,0.08)',
            border: '1px solid rgba(226, 232, 240, 0.9)',
            textAlign: 'center'
          }}>
            {/* Logo */}
            <div style={{
              width: '100%',
              maxWidth: '300px',
              height: 'auto',
              maxHeight: '110px',
              margin: '0 auto 1.5rem',
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
              padding: '0.35rem 0.85rem', 
              borderRadius: '20px', 
              fontSize: '0.78rem', 
              fontWeight: 800, 
              border: '1px solid #BFDBFE', 
              marginBottom: '1rem', 
              letterSpacing: '0.02em' 
            }}>
              <Lock size={14} /> ACCESO PRIVADO POR INVITACIÓN
            </div>

            <h2 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0F172A', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
              {eventData?.name || 'Validación de Acceso al Formulario'}
            </h2>
            <p style={{ color: '#64748B', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.75rem' }}>
              {eventData?.name 
                ? `Este evento cuenta con control de acceso institucional. Para continuar con tu inscripción en "${eventData.name}", por favor digita tu correo electrónico registrado en la lista de invitados.`
                : 'Este evento cuenta con control de acceso institucional. Para continuar con tu inscripción, por favor digita tu correo electrónico registrado en la lista de invitados.'}
            </p>

            <form onSubmit={handleVerifyEmail} style={{ textAlign: 'left' }}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.4rem' }}>
                  Correo Electrónico Autorizado *
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={18} color="#94A3B8" style={{ position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="email"
                    required
                    autoFocus
                    value={accessEmail}
                    onChange={e => {
                      setAccessEmail(e.target.value)
                      if (accessError) setAccessError(null)
                    }}
                    placeholder="tu.correo@ejemplo.com"
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem 0.75rem 2.6rem',
                      fontSize: '0.95rem',
                      borderRadius: '10px',
                      border: accessError ? '2px solid #EF4444' : '1px solid #CBD5E1',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)'
                    }}
                  />
                </div>
              </div>

              {accessError && (
                <div style={{ 
                  marginBottom: '1.25rem', 
                  padding: '0.85rem 1rem', 
                  backgroundColor: '#FEF2F2', 
                  borderLeft: '4px solid #EF4444', 
                  borderRadius: '8px', 
                  display: 'flex', 
                  alignItems: 'flex-start', 
                  gap: '0.6rem' 
                }}>
                  <AlertTriangle size={18} color="#DC2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '0.82rem', color: '#B91C1C', lineHeight: 1.4, fontWeight: 500 }}>
                    {accessError}
                  </span>
                </div>
              )}

              <button 
                type="submit" 
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
                  borderRadius: '10px'
                }}
              >
                <span>Verificar y Continuar</span>
                <ArrowRight size={18} />
              </button>
            </form>

            <div style={{ marginTop: '1.75rem', paddingTop: '1.25rem', borderTop: '1px solid #E2E8F0', fontSize: '0.78rem', color: '#94A3B8', lineHeight: 1.4 }}>
              Si eres un líder o representante autorizado, puedes utilizar tu correo para inscribir a los miembros de tu delegación.
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      
      {/* Safe fixed background for iOS (uses CSS classes that don't resize on scroll) */}
      <div className="safe-bg" />
      <div className="safe-overlay" />

      {/* Header */}
      <div style={{ 
        position: 'relative',
        zIndex: 1,
        background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.7) 100%)',
        padding: 'clamp(1.5rem, 4vw, 2.5rem) 1rem clamp(2rem, 5vw, 3rem)', 
        textAlign: 'center', 
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '380px',
          height: 'auto',
          maxHeight: '140px',
          margin: '0 auto 1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img src="/logo.png" alt="Logo Gobernación de Norte de Santander" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>

        {/* Institutional & Mode Badges */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', flexWrap: 'wrap' }}>
          <span style={{ 
            backgroundColor: '#F0FDF4', 
            color: '#15803D', 
            padding: '0.3rem 0.85rem', 
            borderRadius: '20px', 
            fontSize: '0.75rem', 
            fontWeight: 800, 
            border: '1px solid #BBF7D0', 
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            Gobernación de Norte de Santander
          </span>
          <span style={{ 
            backgroundColor: isOnsite ? '#EFF6FF' : '#FEF3C7', 
            color: isOnsite ? '#1D4ED8' : '#B45309', 
            padding: '0.3rem 0.85rem', 
            borderRadius: '20px', 
            fontSize: '0.75rem', 
            fontWeight: 800, 
            border: `1px solid ${isOnsite ? '#BFDBFE' : '#FDE68A'}`, 
            letterSpacing: '0.04em',
            textTransform: 'uppercase'
          }}>
            {isOnsite ? 'Control y Registro en Sitio' : 'Pre-Registro Oficial'}
          </span>
        </div>

        {/* Event Name */}
        <h1 style={{ 
          fontSize: 'clamp(1.35rem, 4.5vw, 2.15rem)', 
          fontWeight: 900, 
          color: '#0F172A', 
          letterSpacing: '-0.025em', 
          marginBottom: '0.75rem', 
          lineHeight: 1.25,
          maxWidth: '850px',
          margin: '0 auto 0.75rem'
        }}>
          {eventData?.name || (isOnsite ? 'Validación y Registro en Sitio' : 'Registro de Participantes')}
        </h1>

        <p style={{ color: '#64748B', fontSize: 'clamp(0.88rem, 2.5vw, 1rem)', fontWeight: 500, maxWidth: '650px', margin: '0 auto', lineHeight: 1.5 }}>
          {isOnsite 
            ? 'Digite la cédula para cargar datos, capture la fotografía del asistente y confirme el ingreso con código QR.'
            : 'Por favor lea atentamente y diligencie todos los campos requeridos en el siguiente formulario para asegurar su pre-registro oficial.'}
        </p>
      </div>

      <div className="container" style={{ flex: 1, padding: '0 1rem 4rem', position: 'relative', zIndex: 1 }}>
        <div className="glass-panel form-panel-padding animate-fade-in" style={{ 
          maxWidth: '850px', 
          margin: '-2rem auto 0', 
        }}>
          
          {/* Email Access Verification Badge */}
          {isRestrictedByEmail && validatedEmail && (
            <div style={{ 
              marginBottom: '1.5rem', 
              padding: '0.85rem 1.25rem', 
              backgroundColor: '#F0FDF4', 
              border: '1px solid #BBF7D0', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              boxShadow: '0 2px 4px rgba(22, 101, 52, 0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <CheckCircle2 size={20} color="#16A34A" />
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Acceso Autorizado al Formulario
                  </div>
                  <div style={{ fontSize: '0.88rem', color: '#166534', fontWeight: 700, fontFamily: 'monospace' }}>
                    {validatedEmail}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAccessGranted(false)
                  setValidatedEmail('')
                  setAccessEmail('')
                }}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#475569',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
              >
                Cambiar correo
              </button>
            </div>
          )}

          {error && (
            <div style={{ marginBottom: '2rem', padding: '1.25rem', backgroundColor: '#FEF2F2', borderLeft: '4px solid #EF4444', color: '#B91C1C', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', boxShadow: '0 2px 5px rgba(239,68,68,0.1)' }}>
              <AlertTriangle size={24} />
              <span style={{ fontWeight: 500 }}>{error}</span>
            </div>
          )}

          <form onSubmit={handleRegister} autoComplete="off" style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            {/* Tratamiento de datos - Prominent Card */}
            <div style={{ 
              padding: 'clamp(1rem, 3vw, 1.75rem)', 
              background: 'linear-gradient(to right, #F0FDF4, #ffffff)', 
              border: '1px solid #BBF7D0', 
              borderRadius: '12px',
              boxShadow: '0 4px 6px rgba(22, 101, 52, 0.05)'
            }}>
              <h3 style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: '1.2rem', marginBottom: '0.75rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={22} /> Política de Tratamiento de Datos
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#15803D', marginBottom: '1.5rem', lineHeight: 1.6, textAlign: 'justify' }}>
                En cumplimiento a lo dispuesto en la Ley 1581 de 2012, "Por el cual se dictan disposiciones generales para la protección de datos personales", de conformidad con lo señalado en el capítulo 25 del Decreto 1074 de 2015, se informa al usuario que la información solicitada para el diligenciamiento de los formularios tiene como finalidad llevar el registro de personas , así mismo se informa que la información suministrada será tratada por la Gobernación de Norte de Santander como responsables y encargados del tratamiento.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', backgroundColor: '#DCFCE7', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#166534' }}>¿Acepta la política de tratamiento de datos? *</span>
                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: '#15803D', touchAction: 'manipulation' }}>
                    <input type="radio" name="dataTreatment" value="SI" checked={formData.dataTreatment === 'SI'} onChange={e => setFormData({...formData, dataTreatment: e.target.value})} required style={{ width: '1.2rem', height: '1.2rem', accentColor: '#10B981' }} />
                    Sí Acepto
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: 500, color: '#15803D', touchAction: 'manipulation' }}>
                    <input type="radio" name="dataTreatment" value="NO" checked={formData.dataTreatment === 'NO'} onChange={e => setFormData({...formData, dataTreatment: e.target.value})} required style={{ width: '1.2rem', height: '1.2rem', accentColor: '#EF4444' }} />
                    No Acepto
                  </label>
                </div>
              </div>
            </div>

            {/* Identificación */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div className="section-title" style={{ margin: 0, border: 'none', padding: 0 }}>
                  <ShieldCheck size={20} color="var(--secondary)" /> 1. Identificación y Residencia
                </div>
                <button
                  type="button"
                  onClick={() => resetForm(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#475569',
                    backgroundColor: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title="Limpiar todos los campos para registrar a otra persona desde cero"
                >
                  <RotateCcw size={15} color="#2563EB" />
                  <span>Limpiar Formulario / Nueva Persona</span>
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-5">
                <div className="form-group">
                  <label className="form-label" htmlFor="docType">Tipo de Documento *</label>
                  <select id="docType" value={docType} onChange={e => handleDocTypeChange(e.target.value)} required>
                    <option value="">Seleccione...</option>
                    <option value="NUI">NUI - Número Único de Identificación</option>
                    <option value="RC">RC - Registro Civil</option>
                    <option value="TI">TI - Tarjeta de Identidad</option>
                    <option value="CC">CC - Cédula de Ciudadanía</option>
                    <option value="CE">CE - Cédula de Extranjería</option>
                    <option value="PA">PA - Pasaporte</option>
                    <option value="PPT">PPT - Permiso por Protección Temporal</option>
                    <option value="SP">SP - Salvoconducto</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="docNumber">Número de Documento *</label>
                  <input 
                    type="text" 
                    id="docNumber" 
                    value={docNumber} 
                    onChange={e => handleDocNumberChange(e.target.value)} 
                    onBlur={handleDocBlur}
                    autoComplete="off"
                    required 
                    placeholder="Ej. 1090123456"
                    style={{ fontWeight: 600, letterSpacing: '1px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Info size={14}/> Digita el documento para validar o inscribir una persona.
                  </span>
                </div>
                
                <div className="form-group md:col-span-2">
                  {(() => {
                    const munQuotas: Record<string, number> = formConfig?.municipalityQuotas || {}
                    const selectedQuota = formData.municipality ? munQuotas[formData.municipality] : undefined
                    const selectedCount = formData.municipality ? (municipalityCounts[formData.municipality] || 0) : 0
                    const isSelectedFull = Boolean(selectedQuota && selectedQuota > 0 && selectedCount >= selectedQuota)

                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                          <label className="form-label" htmlFor="municipality" style={{ marginBottom: 0 }}>
                            Municipio de Residencia (Norte de Santander) *
                          </label>
                          {selectedQuota && selectedQuota > 0 && (
                            <span style={{ 
                              fontSize: '0.75rem', 
                              fontWeight: 700, 
                              padding: '0.2rem 0.6rem', 
                              borderRadius: '12px',
                              backgroundColor: isSelectedFull ? '#FEE2E2' : '#EFF6FF',
                              color: isSelectedFull ? '#B91C1C' : '#1D4ED8',
                              border: `1px solid ${isSelectedFull ? '#FCA5A5' : '#BFDBFE'}`,
                              display: 'inline-flex',
                              alignItems: 'center'
                            }}>
                              {isSelectedFull ? `🚫 Cupo Lleno (${selectedCount}/${selectedQuota})` : `Cupos: ${selectedQuota - selectedCount} de ${selectedQuota} disponibles`}
                            </span>
                          )}
                        </div>
                        
                        <select 
                          id="municipality" 
                          value={formData.municipality} 
                          onChange={e => {
                            setFormData({...formData, municipality: e.target.value})
                            setError(null)
                          }} 
                          required
                          style={{
                            marginTop: '0.35rem',
                            borderColor: isSelectedFull ? '#EF4444' : undefined,
                            backgroundColor: isSelectedFull ? '#FEF2F2' : undefined
                          }}
                        >
                          <option value="">Seleccione un municipio...</option>
                          {MUNICIPIOS_NDS.map(m => {
                            const quota = munQuotas[m]
                            const count = municipalityCounts[m] || 0
                            const isFull = Boolean(quota && quota > 0 && count >= quota)
                            return (
                              <option 
                                key={m} 
                                value={m}
                                disabled={isFull && !isOnsite}
                                style={{ 
                                  color: isFull ? '#EF4444' : undefined, 
                                  fontWeight: isFull ? 700 : undefined 
                                }}
                              >
                                {m} {quota && quota > 0 ? (isFull ? `— 🚫 CUPO LLENO (${count}/${quota})` : `(${quota - count} cupos disponibles)`) : ''}
                              </option>
                            )
                          })}
                        </select>

                        {/* Banner de alerta prominente si está lleno */}
                        {isSelectedFull && (
                          <div style={{
                            marginTop: '0.75rem',
                            padding: '1rem 1.25rem',
                            backgroundColor: '#FEF2F2',
                            border: '2px solid #EF4444',
                            borderRadius: '10px',
                            color: '#991B1B',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                          }}>
                            <AlertTriangle size={24} color="#EF4444" style={{ flexShrink: 0 }} />
                            <div>
                              <strong style={{ display: 'block', fontSize: '1rem', marginBottom: '0.2rem' }}>
                                ¡Cupo lleno para {formData.municipality}!
                              </strong>
                              <span style={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                                Se ha alcanzado la cantidad máxima configurada de <strong>{selectedQuota} personas</strong> aceptadas para este municipio en este evento. Por favor selecciona otro municipio si aplica o contacta a los coordinadores del evento.
                              </span>
                            </div>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>

            {/* Nombres */}
            <div>
              <div className="section-title">
                <User size={20} color="var(--secondary)" /> 2. Información Personal
              </div>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="form-group">
                  <label className="form-label">Primer Nombre *</label>
                  <input type="text" required value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value.toUpperCase()})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Segundo Nombre</label>
                  <input type="text" value={formData.middleName} onChange={e => setFormData({...formData, middleName: e.target.value.toUpperCase()})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Primer Apellido *</label>
                  <input type="text" required value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value.toUpperCase()})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Segundo Apellido</label>
                  <input type="text" value={formData.secondLastName} onChange={e => setFormData({...formData, secondLastName: e.target.value.toUpperCase()})} />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Fecha de Nacimiento *</label>
                  <input type="date" required value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Edad Calculada</label>
                  <input type="text" value={edad ? `${edad} años` : ''} readOnly disabled style={{ backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 600, cursor: 'not-allowed' }} placeholder="--" />
                </div>
              </div>
            </div>

            {/* FOTOGRAFÍA DEL ASISTENTE EN SITIO */}
            {isOnsite && (
              <div style={{
                backgroundColor: '#F8FAFC',
                border: '2px solid #3B82F6',
                borderRadius: '16px',
                padding: '1.5rem',
                boxShadow: '0 4px 15px rgba(59, 130, 246, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ backgroundColor: '#EFF6FF', padding: '0.5rem', borderRadius: '10px' }}>
                      <Camera size={24} color="#2563EB" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1E293B', margin: 0 }}>
                        Fotografía del Asistente (Ingreso al Evento)
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#64748B', margin: 0 }}>
                        Tome la foto con la cámara del dispositivo o adjúntela como evidencia de asistencia.
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#EFF6FF', color: '#2563EB', padding: '0.25rem 0.65rem', borderRadius: '20px', border: '1px solid #BFDBFE' }}>
                    Control de Puerta
                  </span>
                </div>

                {/* If photo is already captured/uploaded */}
                {fotoIngreso ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', backgroundColor: '#FFFFFF', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #CBD5E1' }}>
                    <div style={{ position: 'relative', width: '100px', height: '100px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #10B981', flexShrink: 0 }}>
                      <img src={fotoIngreso} alt="Foto Ingreso" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                        <CheckCircle2 size={18} color="#16a34a" /> Fotografía registrada con éxito
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 0.75rem 0' }}>
                        Esta fotografía quedará archivada en la ficha de asistencia y asociada al código QR.
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={() => { setFotoIngreso(null); startCamera(); }}
                          className="btn btn-outline"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <RefreshCw size={14} /> Tomar otra foto
                        </button>
                        <button
                          type="button"
                          onClick={() => setFotoIngreso(null)}
                          className="btn btn-outline"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#DC2626', borderColor: '#FCA5A5', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Trash2 size={14} /> Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : cameraActive ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', backgroundColor: '#0F172A', padding: '1.25rem', borderRadius: '14px' }}>
                    <div style={{ position: 'relative', width: '100%', maxWidth: '400px', height: '300px', borderRadius: '10px', overflow: 'hidden', backgroundColor: '#000' }}>
                      <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                      />
                      <div style={{ position: 'absolute', top: '15px', left: '50%', transform: 'translateX(-50%)', border: '2px dashed rgba(255,255,255,0.7)', borderRadius: '50%', width: '160px', height: '220px', pointerEvents: 'none' }} />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1rem', width: '100%', maxWidth: '400px' }}>
                      <button
                        type="button"
                        onClick={capturePhoto}
                        disabled={uploadingFoto}
                        className="btn btn-primary"
                        style={{ flex: 1, padding: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', backgroundColor: '#2563EB' }}
                      >
                        <Camera size={20} /> {uploadingFoto ? 'Guardando...' : 'Capturar Foto Ahora'}
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="btn btn-outline"
                        style={{ padding: '0.75rem 1rem', color: '#CBD5E1', borderColor: '#475569' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                    {/* Option 1: Live Webcam */}
                    <button
                      type="button"
                      onClick={startCamera}
                      disabled={uploadingFoto}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem 1rem',
                        borderRadius: '12px',
                        border: '2px dashed #3B82F6',
                        backgroundColor: '#EFF6FF',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                        <Camera size={24} color="#2563EB" />
                      </div>
                      <strong style={{ fontSize: '0.95rem', color: '#1E40AF', marginBottom: '0.25rem' }}>
                        Tomar Foto con Cámara Web
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#3B82F6' }}>
                        Activar lente frontal del equipo en vivo
                      </span>
                    </button>

                    {/* Option 2: Upload or Mobile File Camera */}
                    <div
                      onClick={() => fileInputFotoRef.current?.click()}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5rem 1rem',
                        borderRadius: '12px',
                        border: '2px dashed #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        textAlign: 'center'
                      }}
                    >
                      <input
                        type="file"
                        ref={fileInputFotoRef}
                        accept="image/*"
                        capture="user"
                        style={{ display: 'none' }}
                        onChange={async (e) => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setUploadingFoto(true)
                          try {
                            const fd = new FormData()
                            fd.append('file', file)
                            const res = await fetch('/api/upload', { method: 'POST', body: fd })
                            const data = await res.json()
                            if (data.url) {
                              setFotoIngreso(data.url)
                            }
                          } catch (err) {
                            console.error(err)
                            alert('Error al subir la fotografía')
                          } finally {
                            setUploadingFoto(false)
                          }
                        }}
                      />
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                        <UploadCloud size={24} color="#64748B" />
                      </div>
                      <strong style={{ fontSize: '0.95rem', color: '#334155', marginBottom: '0.25rem' }}>
                        Subir Archivo o Dispositivo
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                        {uploadingFoto ? '⏳ Subiendo foto...' : 'Seleccionar desde galería o explorador'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Demographics */}
            {showDemographics && (
              <div>
                <div className="section-title">
                  <Users size={20} color="var(--secondary)" /> 3. Caracterización y Perfil
                </div>
                
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="form-group">
                    <label className="form-label">Sexo *</label>
                    <select required value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value})}>
                      <option value="">Seleccione...</option>
                      <option value="HOMBRE">Hombre</option>
                      <option value="MUJER">Mujer</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tipo de Género</label>
                    <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                      <option value="">Seleccione...</option>
                      <option value="MASCULINO">Masculino</option>
                      <option value="FEMENINO">Femenino</option>
                      <option value="NO_BINARIO">No Binario</option>
                      <option value="TRANSGENERO">Transgénero</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                
                  <div className="form-group">
                    <label className="form-label">Condición Especial</label>
                    <select value={formData.specialCondition} onChange={e => setFormData({...formData, specialCondition: e.target.value})}>
                      <option value="">Ninguna / No Aplica</option>
                      <option value="HABITANTE_DE_CALLE">Habitante de calle</option>
                      <option value="INDIGENTE" style={{ display: 'none' }}>Habitante de calle</option>
                      <option value="REINTEGRADO">Reintegrado</option>
                      <option value="DESMOVILIZADO">Desmovilizado</option>
                      <option value="ADOLESCENTE_EMBARAZADA">Adolescente Embarazada</option>
                      <option value="DESPLAZADO">Desplazado</option>
                      <option value="PRIVADO_LIBERTAD">Privado de la libertad</option>
                      <option value="LIBERTAD_ASISTIDA">Libertad Asistida</option>
                      <option value="LGBTIQI">LGBTIQI+ / OSIGD</option>
                      <option value="MIGRANTE">Migrante</option>
                      <option value="REFUGIADO">Refugiado</option>
                      <option value="RETORNADO">Retornado</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Discapacidad</label>
                    <select value={formData.discapacidad} onChange={e => setFormData({...formData, discapacidad: e.target.value})}>
                      <option value="">Ninguna / No Aplica</option>
                      <option value="DA">DA = Discapacidad Auditiva</option>
                      <option value="DV">DV = Discapacidad Visual</option>
                      <option value="DS">DS = Discapacidad Sordoceguera</option>
                      <option value="DF">DF = Discapacidad Física</option>
                      <option value="DI">DI = Discapacidad Intelectual o Cognitiva</option>
                      <option value="DP">DP = Discapacidad Psicosocial o Mental</option>
                      <option value="DM">DM = Discapacidad Múltiple</option>
                      <option value="DTB">DTB = Discapacidad Talla Baja</option>
                    </select>
                  </div>
                
                  <div className="form-group">
                    <label className="form-label">Grupo Étnico</label>
                    <select value={formData.grupoEtnico} onChange={e => setFormData({...formData, grupoEtnico: e.target.value})}>
                      <option value="">Seleccione...</option>
                      <option value="I-MB">I-MB = Indíg. Motilón Barí</option>
                      <option value="I-U">I-U = Indíg. U'WA</option>
                      <option value="I-I">I-I = Indíg. Inga</option>
                      <option value="I-K">I-K = Indíg. Kichwa</option>
                      <option value="I-FD">I-FD = Indíg. fuera de NdS</option>
                      <option value="NARP">NARP = Negro, Afrodescendiente, Raizal o Palenquero</option>
                      <option value="R">R = Rrom</option>
                      <option value="N/A">N/A = No Aplica</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Víctima del Conflicto</label>
                    <select value={formData.victima} onChange={e => setFormData({...formData, victima: e.target.value})}>
                      <option value="">Ninguna / No Aplica</option>
                      <option value="1">1 = Acto terrorista/Atentados/Combates/Enfrentamientos</option>
                      <option value="2">2 = Amenaza</option>
                      <option value="3">3 = Delitos contra la libertad e integridad sexual</option>
                      <option value="4">4 = Desaparición forzada</option>
                      <option value="5">5 = Desplazamiento</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Líder Social</label>
                    <select value={formData.liderSocial} onChange={e => setFormData({...formData, liderSocial: e.target.value})}>
                      <option value="">Ninguno / No Aplica</option>
                      <option value="JAC">JAC = Junta de Acción Comunal</option>
                      <option value="JAL">JAL = Junta Administradora Local</option>
                      <option value="AMB">AMB = Ambiental</option>
                      <option value="DH">DH = Defensor DDHH</option>
                      <option value="SIND">SIND = Sindical</option>
                      <option value="REL">REL = Religioso</option>
                      <option value="OTR">OTR = Otro</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ubicación / Procedencia</label>
                    <select value={formData.locationType} onChange={e => setFormData({...formData, locationType: e.target.value})}>
                      <option value="">Seleccione...</option>
                      <option value="URBANA">Urbana</option>
                      <option value="RURAL">Rural</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">¿A qué grupo pertenece?</label>
                    <select value={formData.grupoJuvenil} onChange={e => setFormData({...formData, grupoJuvenil: e.target.value})}>
                      <option value="">Ninguno / No Aplica</option>
                      <option value="CMJ">CMJ (Consejo Municipal de Juventudes)</option>
                      <option value="PMJ">PMJ (Plataforma Municipal de Juventudes)</option>
                      <option value="BASE_JUVENIL">Base Juvenil</option>
                      <option value="ENLACE_MUNICIPAL">Enlace Municipal</option>
                    </select>
                  </div>

                  <div className="form-group md:col-span-2">
                    <label className="form-label">Nivel de Escolaridad</label>
                    <select value={formData.educationLevel} onChange={e => setFormData({...formData, educationLevel: e.target.value})}>
                      <option value="">Seleccione...</option>
                      <option value="1">1 = Sin Estudio</option>
                      <option value="2">2 = Primaria</option>
                      <option value="3">3 = Bachillerato</option>
                      <option value="4">4 = Técnico/Tecnólogo</option>
                      <option value="5">5 = Profesional</option>
                      <option value="6">6 = Especialista</option>
                      <option value="7">7 = Magíster</option>
                      <option value="8">8 = Doctor</option>
                      <option value="9">9 = Analfabeta</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Health & Emergency */}
            {showMedical && (
              <div>
                <div className="section-title">
                  <Activity size={20} color="var(--secondary)" /> 4. Información Médica y de Emergencia
                </div>
                
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="form-group">
                    <label className="form-label">¿A qué EPS pertenece? *</label>
                    <input type="text" required value={formData.eps} onChange={e => setFormData({...formData, eps: e.target.value.toUpperCase()})} placeholder="Ej. NUEVA EPS, SANITAS, ETC." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contacto de Emergencia *</label>
                    <input type="text" required value={formData.contactoEmergencia} onChange={e => setFormData({...formData, contactoEmergencia: e.target.value.toUpperCase()})} placeholder="Nombre y Teléfono" />
                  </div>
                  <div className="form-group md:col-span-2">
                    <label className="form-label">¿Tiene alguna alergia, condición médica o especial que debamos conocer?</label>
                    <textarea rows={2} value={formData.alergiasMedicas} onChange={e => setFormData({...formData, alergiasMedicas: e.target.value.toUpperCase()})} placeholder="Especifique si aplica, de lo contrario deje en blanco" />
                  </div>
                </div>
              </div>
            )}

            {/* Custom Questions */}
            {customQuestions.length > 0 && (
              <div>
                <div className="section-title">
                  <Info size={20} color="var(--secondary)" /> Documentación e Información Adicional
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {customQuestions.map((q: any) => (
                    <div 
                      key={q.id} 
                      style={{ 
                        backgroundColor: '#FFFFFF', 
                        padding: '1.25rem 1.5rem', 
                        borderRadius: '12px', 
                        border: '1px solid #E2E8F0',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                        <label className="form-label" style={{ marginBottom: 0, fontWeight: 600, color: '#0F172A', fontSize: '1rem' }}>
                          {q.label} {q.required ? <span style={{ color: '#EF4444' }}>*</span> : null}
                        </label>
                        {!q.required && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', backgroundColor: '#F1F5F9', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                            Opcional
                          </span>
                        )}
                      </div>
                      
                      {q.type === 'textarea' ? (
                        <textarea 
                          rows={3}
                          required={q.required} 
                          value={formData.dynamicAnswers[q.id] || ''} 
                          onChange={e => setFormData({...formData, dynamicAnswers: {...formData.dynamicAnswers, [q.id]: e.target.value.toUpperCase()}})} 
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                        />
                      ) : q.type === 'select' ? (
                        <select 
                          required={q.required} 
                          value={formData.dynamicAnswers[q.id] || ''} 
                          onChange={e => setFormData({...formData, dynamicAnswers: {...formData.dynamicAnswers, [q.id]: e.target.value}})}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                        >
                          <option value="">Seleccione una opción...</option>
                          {q.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (q.type === 'file' || q.type === 'pdf') ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <div style={{ 
                            border: '2px dashed #CBD5E1', 
                            borderRadius: '10px', 
                            padding: '1.25rem', 
                            textAlign: 'center', 
                            backgroundColor: '#F8FAFC'
                          }}>
                            <FileText size={32} color="#64748B" style={{ margin: '0 auto 0.5rem' }} />
                            <p style={{ fontSize: '0.85rem', color: '#475569', marginBottom: '0.75rem' }}>
                              Adjuntar archivo ({q.type === 'pdf' || q.label?.toLowerCase().includes('pdf') ? 'Formato PDF' : 'PDF o Documento'})
                            </p>
                            <input 
                              type="file" 
                              accept={q.type === 'pdf' || q.label?.toLowerCase().includes('pdf') ? '.pdf' : '.pdf,.png,.jpg,.jpeg,.doc,.docx'}
                              required={q.required && !formData.dynamicAnswers[q.id]} 
                              onChange={async (e) => {
                                 const file = e.target.files?.[0]
                                 if (!file) return
                                 const data = new FormData()
                                 data.append('file', file)
                                 try {
                                   setUploadingFiles(prev => ({ ...prev, [q.id]: true }))
                                   const res = await fetch('/api/upload', { method: 'POST', body: data })
                                   const result = await res.json()
                                   if (result.url) {
                                     setFormData({...formData, dynamicAnswers: {...formData.dynamicAnswers, [q.id]: result.url}})
                                   }
                                 } catch (err) {
                                   console.error("Upload failed", err)
                                 } finally {
                                   setUploadingFiles(prev => ({ ...prev, [q.id]: false }))
                                 }
                              }} 
                              style={{ display: 'inline-block', fontSize: '0.85rem', maxWidth: '100%' }}
                            />
                          </div>

                          {uploadingFiles[q.id] && (
                            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 500, textAlign: 'center' }}>
                              ⏳ Subiendo documento, por favor espere...
                            </span>
                          )}

                          {formData.dynamicAnswers[q.id] && !uploadingFiles[q.id] && (
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', backgroundColor: '#F0FDF4', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #BBF7D0' }}>
                              <FileText size={20} color="#166534" />
                              <span style={{ fontSize: '0.9rem', color: '#166534', fontWeight: 600 }}>Archivo adjuntado correctamente</span>
                              <a href={formData.dynamicAnswers[q.id]} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#2563EB', fontWeight: 600, textDecoration: 'underline', wordBreak: 'break-all' }}>
                                Ver documento cargado
                              </a>
                            </div>
                          )}
                        </div>
                      ) : q.type === 'image' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <input 
                            type="file" 
                            accept="image/*"
                            required={q.required && !formData.dynamicAnswers[q.id]} 
                            onChange={async (e) => {
                               const file = e.target.files?.[0]
                               if (!file) return
                               const data = new FormData()
                               data.append('file', file)
                               try {
                                 const res = await fetch('/api/upload', { method: 'POST', body: data })
                                 const result = await res.json()
                                 if (result.url) {
                                   setFormData({...formData, dynamicAnswers: {...formData.dynamicAnswers, [q.id]: result.url}})
                                 }
                               } catch (err) {
                                 console.error("Upload failed", err)
                               }
                            }} 
                            style={{ padding: '0.5rem', border: '1px solid #E2E8F0', borderRadius: '4px', background: '#fff' }}
                          />
                          {formData.dynamicAnswers[q.id] && (
                            <img src={formData.dynamicAnswers[q.id]} alt="Preview" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #E2E8F0' }} />
                          )}
                        </div>
                      ) : (
                        <input 
                          type={q.type || 'text'} 
                          required={q.required} 
                          value={formData.dynamicAnswers[q.id] || ''} 
                          onChange={e => setFormData({...formData, dynamicAnswers: {...formData.dynamicAnswers, [q.id]: e.target.value.toUpperCase()}})} 
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1' }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem' }}>
              {(() => {
                const munQuotas: Record<string, number> = formConfig?.municipalityQuotas || {}
                const selectedQuota = formData.municipality ? munQuotas[formData.municipality] : undefined
                const selectedCount = formData.municipality ? (municipalityCounts[formData.municipality] || 0) : 0
                const isSelectedFull = Boolean(selectedQuota && selectedQuota > 0 && selectedCount >= selectedQuota)
                const isBlocked = !isOnsite && isSelectedFull

                return (
                  <button 
                    type="submit" 
                    className="btn w-full" 
                    disabled={loading || isBlocked} 
                    style={{ 
                      fontSize: 'clamp(1rem, 3.8vw, 1.2rem)', 
                      padding: '1rem 1.25rem', 
                      textTransform: 'uppercase', 
                      letterSpacing: '0.5px',
                      borderRadius: '12px',
                      backgroundColor: isBlocked ? '#94A3B8' : '#16A34A',
                      color: '#FFFFFF',
                      cursor: isBlocked ? 'not-allowed' : 'pointer',
                      border: 'none',
                      boxShadow: isBlocked ? 'none' : '0 4px 14px rgba(22, 163, 74, 0.4)',
                      touchAction: 'manipulation'
                    }}
                  >
                    {loading 
                      ? 'Procesando...' 
                      : isBlocked 
                        ? `Cupo Lleno para ${formData.municipality}` 
                        : (isOnsite ? 'Confirmar Registro e Imprimir QR' : 'Confirmar Pre-Registro')}
                  </button>
                )
              })()}
            </div>
          </form>
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '3rem', color: '#64748B', fontSize: '0.85rem' }}>
          &copy; {new Date().getFullYear()} Gobernación de Norte de Santander. Todos los derechos reservados.
        </div>
      </div>
    </div>
  )
}
