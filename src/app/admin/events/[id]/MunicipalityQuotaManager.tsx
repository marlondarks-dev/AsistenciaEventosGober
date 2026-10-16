"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Search, CheckCircle2, AlertCircle, X, Save, Settings2, Plus, Sparkles } from 'lucide-react'

const MUNICIPIOS_NDS = [
  'Ábrego', 'Arboledas', 'Bochalema', 'Bucarasica', 'Cáchira', 'Cácota', 'Chinácota', 'Chitagá', 'Convención', 'Cúcuta',
  'Cucutilla', 'Durania', 'El Carmen', 'El Tarra', 'El Zulia', 'Gramalote', 'Hacarí', 'Herrán', 'La Esperanza', 'La Playa de Belén',
  'Labateca', 'Los Patios', 'Lourdes', 'Mutiscua', 'Ocaña', 'Pamplona', 'Pamplonita', 'Puerto Santander', 'Ragonvalia', 'Salazar de Las Palmas',
  'San Calixto', 'San Cayetano', 'Santiago', 'Sardinata', 'Silos', 'Teorama', 'Tibú', 'Toledo', 'Villa Caro', 'Villa del Rosario'
]

export default function MunicipalityQuotaManager({
  eventId,
  eventName,
  initialQuotas = {},
  registrationsByMunicipality = {}
}: {
  eventId: string,
  eventName: string,
  initialQuotas?: Record<string, number>,
  registrationsByMunicipality?: Record<string, number>
}) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [quotas, setQuotas] = useState<Record<string, number>>(initialQuotas)
  const [search, setSearch] = useState('')
  const [bulkValue, setBulkValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  const activeQuotas = Object.entries(quotas).filter(([_, q]) => q > 0)

  const updateQuota = (mun: string, val: string) => {
    const num = parseInt(val)
    if (isNaN(num) || num <= 0) {
      const copy = { ...quotas }
      delete copy[mun]
      setQuotas(copy)
    } else {
      setQuotas({ ...quotas, [mun]: num })
    }
  }

  const handleApplyBulk = () => {
    const num = parseInt(bulkValue)
    if (isNaN(num) || num <= 0) return
    const all: Record<string, number> = {}
    MUNICIPIOS_NDS.forEach(m => { all[m] = num })
    setQuotas(all)
    setBulkValue('')
  }

  const handleClearAll = () => {
    setQuotas({})
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ municipalityQuotas: quotas })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar los cupos')
      }

      setIsOpen(false)
      showToast('success', '¡Cupos por municipio actualizados con éxito!')
      router.refresh()
    } catch (err: any) {
      showToast('error', err.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const filtered = MUNICIPIOS_NDS.filter(m => 
    m.toLowerCase().includes(search.toLowerCase().trim())
  )

  return (
    <>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          backgroundColor: toast.type === 'success' ? '#065F46' : '#991B1B',
          color: '#FFFFFF',
          padding: '0.85rem 1.25rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: 600,
          fontSize: '0.9rem'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={20} color="#34D399" /> : <AlertCircle size={20} color="#F87171" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* DASHBOARD CARD EN EL EVENTO */}
      <div className="card" style={{ 
        border: '2px solid #3B82F6', 
        borderRadius: '14px', 
        padding: '1.25rem',
        backgroundColor: '#FFFFFF',
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.06)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ backgroundColor: '#EFF6FF', padding: '0.5rem', borderRadius: '10px' }}>
              <MapPin size={22} color="#2563EB" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Cupos de Pre-registro por Municipio
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
                Control de capacidad por territorio. Muestra "Cupo lleno" al alcanzar el límite.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="btn btn-primary"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              padding: '0.5rem 1rem', 
              fontSize: '0.85rem', 
              fontWeight: 700,
              backgroundColor: '#2563EB',
              borderRadius: '8px'
            }}
          >
            <Settings2 size={16} />
            Configurar / Subir Cupos
          </button>
        </div>

        {/* Status Breakdown */}
        {activeQuotas.length === 0 ? (
          <div style={{ 
            backgroundColor: '#F8FAFC', 
            padding: '1rem', 
            borderRadius: '10px', 
            border: '1px dashed #CBD5E1', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>
              ℹ️ Todos los municipios están actualmente <strong>sin límite (ilimitados)</strong>.
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              style={{ background: 'none', border: 'none', color: '#2563EB', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Fijar cupos ahora (ej. Ábrego: 9)
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.8rem', color: '#64748B' }}>
              <span>Municipios con cupo limitado activo ({activeQuotas.length}):</span>
              <span style={{ fontSize: '0.75rem', color: '#2563EB', fontWeight: 600 }}>Clic en Configurar para subir o cambiar</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {activeQuotas.map(([mun, max]) => {
                const count = registrationsByMunicipality[mun] || 0
                const isFull = count >= max
                const pct = Math.min(100, Math.round((count / max) * 100))

                return (
                  <div 
                    key={mun}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: isFull ? '#FEF2F2' : '#F8FAFC',
                      border: `1px solid ${isFull ? '#FECACA' : '#E2E8F0'}`
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      <strong style={{ color: isFull ? '#B91C1C' : '#1E293B' }}>{mun}</strong>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: isFull ? '#EF4444' : '#2563EB' }}>
                        {isFull ? `LLENO (${count}/${max})` : `${count} / ${max}`}
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '5px', backgroundColor: '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: isFull ? '#EF4444' : '#3B82F6', borderRadius: '4px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ================= MODAL CONFIGURACIÓN CUPOS ================= */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div className="animate-fade-in" style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
            maxWidth: '680px',
            width: '100%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#F8FAFC'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ backgroundColor: '#DBEAFE', padding: '0.4rem', borderRadius: '8px' }}>
                  <MapPin size={22} color="#1D4ED8" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                    Configurar Cupos por Municipio
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.15rem 0 0' }}>
                    {eventName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              
              <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                
                <div style={{ backgroundColor: '#EFF6FF', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #BFDBFE', fontSize: '0.85rem', color: '#1E40AF', lineHeight: 1.5 }}>
                  💡 <strong>¿Cómo funciona?</strong> Escribe el número máximo de personas a aceptar por municipio (ej. Ábrego: 9). Si dejas un municipio vacío o en 0, no tendrá límite. Puedes subir el número en cualquier momento si decides abrir más cupos.
                </div>

                {/* Bulk and Search controls */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                    <Search size={15} color="#94A3B8" style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Buscar municipio (ej. Ábrego)..."
                      style={{ width: '100%', padding: '0.4rem 0.5rem 0.4rem 1.9rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input
                      type="number"
                      min="1"
                      value={bulkValue}
                      onChange={e => setBulkValue(e.target.value)}
                      placeholder="Cupo general"
                      style={{ width: '100px', padding: '0.4rem', fontSize: '0.8rem', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                    />
                    <button
                      type="button"
                      onClick={handleApplyBulk}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 600, backgroundColor: '#2563EB', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Poner a todos
                    </button>
                    {activeQuotas.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', fontWeight: 600, backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Limpiar
                      </button>
                    )}
                  </div>
                </div>

                {/* Municipalities List */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.6rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                  {filtered.map(m => {
                    const currentVal = quotas[m] || ''
                    const hasQuota = Boolean(currentVal)
                    const count = registrationsByMunicipality[m] || 0

                    return (
                      <div
                        key={m}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          border: hasQuota ? '1.5px solid #3B82F6' : '1px solid #E2E8F0',
                          backgroundColor: hasQuota ? '#EFF6FF' : '#FFFFFF',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
                          <span style={{ fontSize: '0.83rem', fontWeight: hasQuota ? 700 : 500, color: hasQuota ? '#1D4ED8' : '#334155', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {m}
                          </span>
                          <span style={{ fontSize: '0.7rem', color: hasQuota ? '#2563EB' : '#94A3B8' }}>
                            {hasQuota ? `${count} inscritos / Máx: ${currentVal}` : `${count} inscritos (Ilimitado)`}
                          </span>
                        </div>

                        <input
                          type="number"
                          min="0"
                          value={currentVal}
                          onChange={e => updateQuota(m, e.target.value)}
                          placeholder="--"
                          style={{
                            width: '65px',
                            padding: '0.35rem 0.4rem',
                            fontSize: '0.85rem',
                            fontWeight: 700,
                            textAlign: 'center',
                            borderRadius: '6px',
                            border: hasQuota ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                            backgroundColor: '#FFFFFF',
                            color: '#0F172A'
                          }}
                        />
                      </div>
                    )
                  })}
                </div>

              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#F8FAFC'
              }}>
                <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                  {activeQuotas.length} municipios con límite configurado
                </span>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="btn btn-outline"
                    disabled={saving}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn btn-primary"
                    style={{ 
                      padding: '0.5rem 1.25rem', 
                      fontSize: '0.85rem', 
                      fontWeight: 700, 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.4rem',
                      backgroundColor: '#2563EB' 
                    }}
                  >
                    <Save size={16} />
                    {saving ? 'Guardando...' : 'Guardar Cupos'}
                  </button>
                </div>
              </div>

            </form>

          </div>
        </div>
      )}
    </>
  )
}
