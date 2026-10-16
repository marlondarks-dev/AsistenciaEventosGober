"use client"
import { useState } from 'react'
import { MapPin, Search, Users, Trash2, ArrowUp, ArrowDown, Mail, Lock, Unlock, ShieldCheck } from 'lucide-react'

const MUNICIPIOS_NDS = [
  'Ábrego', 'Arboledas', 'Bochalema', 'Bucarasica', 'Cáchira', 'Cácota', 'Chinácota', 'Chitagá', 'Convención', 'Cúcuta',
  'Cucutilla', 'Durania', 'El Carmen', 'El Tarra', 'El Zulia', 'Gramalote', 'Hacarí', 'Herrán', 'La Esperanza', 'La Playa de Belén',
  'Labateca', 'Los Patios', 'Lourdes', 'Mutiscua', 'Ocaña', 'Pamplona', 'Pamplonita', 'Puerto Santander', 'Ragonvalia', 'Salazar de Las Palmas',
  'San Calixto', 'San Cayetano', 'Santiago', 'Sardinata', 'Silos', 'Teorama', 'Tibú', 'Toledo', 'Villa Caro', 'Villa del Rosario'
]

export default function FormConfigBuilder({ initialConfig }: { initialConfig?: any }) {
  const [showDemographics, setShowDemographics] = useState(initialConfig?.showDemographics ?? true)
  const [showMedical, setShowMedical] = useState(initialConfig?.showMedical ?? true)
  const [customQuestions, setCustomQuestions] = useState<{id: string, label: string, type: string, required: boolean, optionsString?: string}[]>(initialConfig?.customQuestions || [])
  const [checkpointsConfig, setCheckpointsConfig] = useState(initialConfig?.checkpoints?.join(', ') || "Ingreso")
  
  // Municipality quotas state
  const [municipalityQuotas, setMunicipalityQuotas] = useState<Record<string, number>>(initialConfig?.municipalityQuotas || {})
  const [munSearch, setMunSearch] = useState('')
  const [bulkValue, setBulkValue] = useState('')

  // Email access restriction state
  const [restrictedByEmail, setRestrictedByEmail] = useState<boolean>(initialConfig?.restrictedByEmail ?? false)
  const [emailsText, setEmailsText] = useState<string>(
    Array.isArray(initialConfig?.allowedEmails) ? initialConfig.allowedEmails.join('\n') : ''
  )

  const addQuestion = () => {
    setCustomQuestions([...customQuestions, { id: `q_${Date.now()}`, label: '', type: 'text', required: false, optionsString: '' }])
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...customQuestions]
    updated[index] = { ...updated[index], [field]: value }
    setCustomQuestions(updated)
  }

  const removeQuestion = (index: number) => {
    setCustomQuestions(customQuestions.filter((_, i) => i !== index))
  }

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= customQuestions.length) return
    const updated = [...customQuestions]
    const temp = updated[index]
    updated[index] = updated[targetIndex]
    updated[targetIndex] = temp
    setCustomQuestions(updated)
  }

  const updateMunicipalityQuota = (mun: string, val: string) => {
    const num = parseInt(val)
    if (isNaN(num) || num <= 0) {
      const copy = { ...municipalityQuotas }
      delete copy[mun]
      setMunicipalityQuotas(copy)
    } else {
      setMunicipalityQuotas({ ...municipalityQuotas, [mun]: num })
    }
  }

  const handleApplyBulk = () => {
    const num = parseInt(bulkValue)
    if (isNaN(num) || num <= 0) return
    const all: Record<string, number> = {}
    MUNICIPIOS_NDS.forEach(m => { all[m] = num })
    setMunicipalityQuotas(all)
    setBulkValue('')
  }

  const clearAllQuotas = () => {
    setMunicipalityQuotas({})
  }

  const formattedQuestions = customQuestions.map(q => ({
    id: q.id,
    label: q.label,
    type: q.type,
    required: q.required,
    options: q.type === 'select' && q.optionsString ? q.optionsString.split(',').map((s: string) => s.trim()).filter((s: string) => Boolean(s)) : []
  }))

  const parsedAllowedEmails = emailsText
    .split(/[\n,; \t]+/)
    .map(e => e.trim().toLowerCase())
    .filter(e => e.includes('@') && e.includes('.'))
  const uniqueAllowedEmails = Array.from(new Set(parsedAllowedEmails))

  const configJson = JSON.stringify({
    showDemographics,
    showMedical,
    customQuestions: formattedQuestions,
    checkpoints: checkpointsConfig.split(',').map((s: string) => s.trim()).filter((s: string) => Boolean(s)),
    municipalityQuotas,
    restrictedByEmail,
    allowedEmails: uniqueAllowedEmails
  })

  // Filter municipalities for quick quota editing
  const filteredMunicipios = MUNICIPIOS_NDS.filter(m => 
    m.toLowerCase().includes(munSearch.toLowerCase().trim())
  )

  const activeQuotasCount = Object.keys(municipalityQuotas).length

  return (
    <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', backgroundColor: '#F8FAFC', padding: '1.5rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.25rem', color: '#0F172A' }}>
        Configuración del Formulario y Cupos
      </h3>
      <p style={{ fontSize: '0.85rem', color: '#64748B', marginBottom: '1.5rem' }}>
        Personaliza los cupos por municipio, bloques de preguntas y puntos de entrega para este evento.
      </p>
      
      <input type="hidden" name="requiredFields" value={configJson} />

      {/* SECCIÓN 1: CUPOS POR MUNICIPIO */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #CBD5E1', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ backgroundColor: '#EFF6FF', padding: '0.4rem', borderRadius: '8px' }}>
              <MapPin size={20} color="#2563EB" />
            </div>
            <div>
              <h4 style={{ fontWeight: 800, color: '#0F172A', margin: 0, fontSize: '1rem' }}>
                Límites de Cupos por Municipio
              </h4>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.15rem 0 0' }}>
                Si un municipio alcanza su límite configurado, el pre-registro mostrará <strong>"Cupo lleno"</strong> y se bloquearán nuevas inscripciones. Puedes aumentar o modificar los cupos en cualquier momento.
              </p>
            </div>
          </div>
          
          {activeQuotasCount > 0 && (
            <span style={{ fontSize: '0.75rem', fontWeight: 700, backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '0.25rem 0.65rem', borderRadius: '20px', border: '1px solid #BFDBFE' }}>
              {activeQuotasCount} municipios con límite activo
            </span>
          )}
        </div>

        {/* Quick Tools: Bulk Assign & Search */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem', marginBottom: '1rem', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
          
          {/* Search box */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '0.65rem', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              value={munSearch}
              onChange={e => setMunSearch(e.target.value)}
              placeholder="Filtrar municipio (ej. Ábrego, Cúcuta...)"
              style={{ width: '100%', padding: '0.4rem 0.6rem 0.4rem 2rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff' }}
            />
          </div>

          {/* Bulk set controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="number"
              min="1"
              value={bulkValue}
              onChange={e => setBulkValue(e.target.value)}
              placeholder="Cant. a todos"
              style={{ width: '110px', padding: '0.4rem 0.5rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1', backgroundColor: '#fff' }}
            />
            <button
              type="button"
              onClick={handleApplyBulk}
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 600, backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              Aplicar a todos
            </button>
            {activeQuotasCount > 0 && (
              <button
                type="button"
                onClick={clearAllQuotas}
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 600, backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer' }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>

        {/* Municipalities Quota Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.6rem', maxHeight: '340px', overflowY: 'auto', paddingRight: '0.25rem' }}>
          {filteredMunicipios.map(m => {
            const currentLimit = municipalityQuotas[m] || ''
            const hasLimit = Boolean(currentLimit)

            return (
              <div 
                key={m}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  border: hasLimit ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
                  backgroundColor: hasLimit ? '#EFF6FF' : '#FFFFFF',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                  <span style={{ fontSize: '0.83rem', fontWeight: hasLimit ? 700 : 500, color: hasLimit ? '#1D4ED8' : '#334155', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {m}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: hasLimit ? '#2563EB' : '#94A3B8' }}>
                    {hasLimit ? `Máx: ${currentLimit} personas` : 'Sin límite (Ilimitado)'}
                  </span>
                </div>

                <input 
                  type="number"
                  min="0"
                  value={currentLimit}
                  onChange={e => updateMunicipalityQuota(m, e.target.value)}
                  placeholder="--"
                  title={`Límite de personas para ${m}`}
                  style={{
                    width: '65px',
                    padding: '0.35rem 0.4rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    textAlign: 'center',
                    borderRadius: '6px',
                    border: hasLimit ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#0F172A'
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* SECCIÓN 2: CONTROL DE ACCESO POR CORREO ELECTRÓNICO (OPCIONAL) */}
      <div style={{ backgroundColor: '#FFFFFF', padding: '1.25rem', borderRadius: '10px', border: '1px solid #CBD5E1', marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ backgroundColor: restrictedByEmail ? '#EFF6FF' : '#F1F5F9', padding: '0.45rem', borderRadius: '8px' }}>
              {restrictedByEmail ? <Lock size={20} color="#2563EB" /> : <Unlock size={20} color="#64748B" />}
            </div>
            <div>
              <h4 style={{ fontWeight: 800, color: '#0F172A', margin: 0, fontSize: '1rem' }}>
                Acceso al Formulario por Correo Electrónico (Opcional)
              </h4>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0.15rem 0 0' }}>
                Define si el formulario es público para todos o privado solo para personas con correo autorizado.
              </p>
            </div>
          </div>

          <label style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.4rem 0.85rem',
            borderRadius: '20px',
            cursor: 'pointer',
            backgroundColor: restrictedByEmail ? '#EFF6FF' : '#F8FAFC',
            border: restrictedByEmail ? '1.5px solid #3B82F6' : '1px solid #CBD5E1',
            transition: 'all 0.2s'
          }}>
            <input 
              type="checkbox" 
              checked={restrictedByEmail} 
              onChange={e => setRestrictedByEmail(e.target.checked)} 
              style={{ width: '1.1rem', height: '1.1rem', accentColor: '#2563EB', cursor: 'pointer' }} 
            />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: restrictedByEmail ? '#1D4ED8' : '#475569' }}>
              {restrictedByEmail ? 'Restricción Activa (Solo autorizados)' : 'Abierto a Todo Público'}
            </span>
          </label>
        </div>

        {restrictedByEmail ? (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.83rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={16} color="#2563EB" /> Lista de correos autorizados:
              </label>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: uniqueAllowedEmails.length > 0 ? '#16A34A' : '#DC2626', backgroundColor: '#FFFFFF', padding: '0.2rem 0.6rem', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                {uniqueAllowedEmails.length} correo(s) válido(s) detectado(s)
              </span>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '0.75rem', lineHeight: 1.4 }}>
              Pega aquí los correos electrónicos de los invitados. Puedes separarlos por saltos de línea, comas o punto y coma. Los correos se normalizan automáticamente a minúsculas.
            </p>

            <textarea 
              rows={4}
              value={emailsText}
              onChange={e => setEmailsText(e.target.value)}
              placeholder="juan.perez@ejemplo.com&#10;maria.gomez@gobernacion.gov.co&#10;carlos.lopez@gmail.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '0.82rem',
                fontFamily: 'monospace',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                backgroundColor: '#FFFFFF',
                resize: 'vertical'
              }}
            />

            {uniqueAllowedEmails.length === 0 && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.76rem', color: '#B45309', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>⚠️ No has ingresado correos. Si dejas la lista vacía mientras la restricción esté activa, nadie podrá ingresar.</span>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: '0.75rem 1rem', backgroundColor: '#F0FDF4', borderRadius: '8px', border: '1px solid #BBF7D0', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#15803D' }}>
              ✓ <strong>Modo público:</strong> Cualquier persona con el enlace del evento podrá acceder y diligenciar el formulario sin pedir correo previo.
            </span>
          </div>
        )}
      </div>

      {/* SECCIÓN 3: CARACTERIZACIÓN Y SALUD */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 500 }}>
          <input type="checkbox" checked={showDemographics} onChange={e => setShowDemographics(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem', accentColor: '#2563EB' }} />
          Habilitar sección "Caracterización y Perfil" (Discapacidad, Etnia, Género, Liderazgo, etc.)
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontWeight: 500 }}>
          <input type="checkbox" checked={showMedical} onChange={e => setShowMedical(e.target.checked)} style={{ width: '1.2rem', height: '1.2rem', accentColor: '#2563EB' }} />
          Habilitar sección "Información Médica y de Emergencia" (EPS, Alergias, Contacto)
        </label>
      </div>

      {/* SECCIÓN 3: PUNTOS DE CONTROL */}
      <div style={{ borderTop: '2px dashed #E2E8F0', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
        <h4 style={{ fontWeight: 700, color: '#0F172A', marginBottom: '0.5rem' }}>Puntos de Control (Scanners / Almuerzos)</h4>
        <p style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '1rem' }}>Define los puntos de control para este evento separados por comas. (Ej. Ingreso, Almuerzo, Kit de Bienvenida). Estos aparecerán en el escáner de QR.</p>
        <input 
          type="text" 
          value={checkpointsConfig} 
          onChange={e => setCheckpointsConfig(e.target.value)} 
          placeholder="Ej. Ingreso, Almuerzo, Kit de Bienvenida" 
          style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1' }} 
        />
      </div>

      {/* SECCIÓN 4: PREGUNTAS PERSONALIZADAS */}
      <div style={{ borderTop: '2px dashed #E2E8F0', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h4 style={{ fontWeight: 700, color: '#0F172A' }}>Preguntas Personalizadas (Opcional)</h4>
            <p style={{ fontSize: '0.8rem', color: '#64748B' }}>Agrega preguntas adicionales que necesites solo para este evento.</p>
          </div>
          <button type="button" className="btn btn-outline" onClick={addQuestion} style={{ fontSize: '0.85rem', padding: '0.4rem 0.75rem', backgroundColor: '#fff' }}>+ Agregar Pregunta</button>
        </div>

        {customQuestions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
            <p style={{ color: '#94A3B8', fontSize: '0.9rem' }}>No has agregado preguntas personalizadas.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {customQuestions.map((q, i) => (
            <div key={q.id} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: '#fff', padding: '1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem', fontWeight: 600 }}>Pregunta</label>
                  <input type="text" value={q.label} onChange={e => updateQuestion(i, 'label', e.target.value)} placeholder="Ej. Talla de Camisa..." style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E2E8F0' }} />
                </div>
                <div style={{ width: '180px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.25rem', fontWeight: 600 }}>Tipo de Respuesta</label>
                  <select value={q.type} onChange={e => updateQuestion(i, 'type', e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E2E8F0' }}>
                    <option value="text">Texto Corto</option>
                    <option value="textarea">Texto Largo</option>
                    <option value="number">Número</option>
                    <option value="select">Lista Desplegable</option>
                    <option value="image">Fotografía / Imagen</option>
                    <option value="file">Documento / PDF</option>
                  </select>
                </div>
              </div>

              {q.type === 'select' && (
                <div style={{ padding: '1rem', backgroundColor: '#F8FAFC', borderRadius: '6px', border: '1px dashed #CBD5E1' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 600, color: '#0F172A' }}>
                    Opciones de la lista
                  </label>
                  <p style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: '0.5rem' }}>Escribe las opciones separadas por una coma (,)</p>
                  <input 
                    type="text" 
                    value={q.optionsString || ''} 
                    onChange={e => updateQuestion(i, 'optionsString', e.target.value)} 
                    placeholder="Ej. Sí, No, Tal vez, Otra" 
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #E2E8F0' }} 
                  />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
                  <input type="checkbox" checked={q.required} onChange={e => updateQuestion(i, 'required', e.target.checked)} style={{ accentColor: '#2563EB', width: '1rem', height: '1rem' }} /> Respuesta Obligatoria
                </label>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <button 
                    type="button" 
                    disabled={i === 0}
                    onClick={() => moveQuestion(i, 'up')} 
                    title="Mover arriba"
                    style={{ 
                      background: '#F1F5F9', 
                      border: '1px solid #CBD5E1', 
                      color: i === 0 ? '#CBD5E1' : '#334155', 
                      cursor: i === 0 ? 'not-allowed' : 'pointer', 
                      padding: '0.3rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <ArrowUp size={14} />
                  </button>

                  <button 
                    type="button" 
                    disabled={i === customQuestions.length - 1}
                    onClick={() => moveQuestion(i, 'down')} 
                    title="Mover abajo"
                    style={{ 
                      background: '#F1F5F9', 
                      border: '1px solid #CBD5E1', 
                      color: i === customQuestions.length - 1 ? '#CBD5E1' : '#334155', 
                      cursor: i === customQuestions.length - 1 ? 'not-allowed' : 'pointer', 
                      padding: '0.3rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.75rem',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <ArrowDown size={14} />
                  </button>

                  <button 
                    type="button" 
                    onClick={() => removeQuestion(i)} 
                    style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', cursor: 'pointer', fontWeight: 600, padding: '0.3rem 0.8rem', borderRadius: '4px', fontSize: '0.8rem' }}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
