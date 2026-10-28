"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Utensils, 
  Calendar, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Save, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Coffee,
  Sun,
  Moon,
  Clock,
  Layers,
  Check
} from 'lucide-react'

interface DayConfig {
  id: string
  day: string
  meals: string[]
}

interface EventCheckpointsManagerProps {
  eventId: string
  eventName: string
  initialCheckpoints?: string[]
  initialDailySchedule?: {
    days?: { day: string; meals: string[] }[]
    generalPoints?: string[]
  }
}

const COMMON_MEALS = [
  { name: 'Desayuno', icon: '☕' },
  { name: 'Refrigerio Mañana', icon: '🍪' },
  { name: 'Almuerzo', icon: '🍱' },
  { name: 'Refrigerio Tarde', icon: '🍪' },
  { name: 'Cena', icon: '🍲' },
]

const COMMON_GENERAL_POINTS = [
  'Ingreso',
  'Kit de Bienvenida',
  'Escarapela',
  'Certificado de Asistencia'
]

export default function EventCheckpointsManager({
  eventId,
  eventName,
  initialCheckpoints = ['Ingreso'],
  initialDailySchedule
}: EventCheckpointsManagerProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Initialize schedule from initialDailySchedule or parse from initialCheckpoints
  const parseInitialState = () => {
    if (initialDailySchedule?.days && initialDailySchedule.days.length > 0) {
      return {
        days: initialDailySchedule.days.map((d, idx) => ({
          id: `day_${idx}_${Date.now()}`,
          day: d.day,
          meals: d.meals || []
        })),
        generalPoints: initialDailySchedule.generalPoints || ['Ingreso']
      }
    }

    // Try parsing from initialCheckpoints with " - "
    const detectedDays: Record<string, string[]> = {}
    const general: string[] = []

    initialCheckpoints.forEach(cp => {
      if (cp.includes(' - ')) {
        const [dayPart, ...mealParts] = cp.split(' - ')
        const d = dayPart.trim()
        const m = mealParts.join(' - ').trim()
        if (!detectedDays[d]) detectedDays[d] = []
        if (!detectedDays[d].includes(m)) detectedDays[d].push(m)
      } else {
        if (!general.includes(cp)) general.push(cp)
      }
    })

    const dayKeys = Object.keys(detectedDays)
    if (dayKeys.length > 0) {
      return {
        days: dayKeys.map((k, idx) => ({
          id: `day_${idx}_${Date.now()}`,
          day: k,
          meals: detectedDays[k]
        })),
        generalPoints: general.length > 0 ? general : ['Ingreso']
      }
    }

    // Fallback: Empty schedule or generic checkpoints
    return {
      days: [],
      generalPoints: initialCheckpoints.length > 0 ? initialCheckpoints : ['Ingreso']
    }
  }

  const [schedule, setSchedule] = useState<{ days: DayConfig[]; generalPoints: string[] }>(parseInitialState)
  const [newDayName, setNewDayName] = useState('')
  const [newCustomMeal, setNewCustomMeal] = useState<{ [dayId: string]: string }>({})
  const [newGeneralPoint, setNewGeneralPoint] = useState('')
  const [editMode, setEditMode] = useState<'visual' | 'raw'>('visual')
  const [rawText, setRawText] = useState('')

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text })
    setTimeout(() => setToast(null), 3500)
  }

  // Generate full flat checkpoint list
  const generateFlatCheckpoints = () => {
    const list: string[] = []
    
    // Add general checkpoints first
    schedule.generalPoints.forEach(p => {
      const clean = p.trim()
      if (clean && !list.includes(clean)) list.push(clean)
    })

    // Add day-specific checkpoints
    schedule.days.forEach(d => {
      const dayName = d.day.trim()
      if (!dayName) return
      d.meals.forEach(m => {
        const mealName = m.trim()
        if (!mealName) return
        const fullName = `${dayName} - ${mealName}`
        if (!list.includes(fullName)) list.push(fullName)
      })
    })

    return list
  }

  // Preset for Juventudes Festival 2026
  const applyJuventudesPreset = () => {
    setSchedule({
      generalPoints: ['Ingreso', 'Kit de Bienvenida'],
      days: [
        {
          id: 'day_jueves_22',
          day: 'Jueves 22',
          meals: ['Cena']
        },
        {
          id: 'day_viernes_23',
          day: 'Viernes 23',
          meals: ['Refrigerio Mañana', 'Almuerzo', 'Refrigerio Tarde', 'Cena']
        },
        {
          id: 'day_sabado_24',
          day: 'Sábado 24',
          meals: ['Desayuno', 'Refrigerio Mañana', 'Almuerzo', 'Refrigerio Tarde', 'Cena']
        },
        {
          id: 'day_domingo_25',
          day: 'Domingo 25',
          meals: ['Desayuno', 'Refrigerio Mañana', 'Almuerzo']
        }
      ]
    })
    showToast('success', '¡Cronograma de Juventudes 2026 cargado! Recuerda hacer clic en "Guardar Cronograma".')
  }

  const handleAddDay = () => {
    if (!newDayName.trim()) return
    const newDay: DayConfig = {
      id: `day_${Date.now()}`,
      day: newDayName.trim(),
      meals: ['Almuerzo']
    }
    setSchedule({
      ...schedule,
      days: [...schedule.days, newDay]
    })
    setNewDayName('')
  }

  const handleRemoveDay = (dayId: string) => {
    setSchedule({
      ...schedule,
      days: schedule.days.filter(d => d.id !== dayId)
    })
  }

  const toggleMealInDay = (dayId: string, mealName: string) => {
    setSchedule({
      ...schedule,
      days: schedule.days.map(d => {
        if (d.id !== dayId) return d
        const exists = d.meals.includes(mealName)
        const updatedMeals = exists 
          ? d.meals.filter(m => m !== mealName)
          : [...d.meals, mealName]
        return { ...d, meals: updatedMeals }
      })
    })
  }

  const handleAddCustomMealToDay = (dayId: string) => {
    const meal = (newCustomMeal[dayId] || '').trim()
    if (!meal) return
    setSchedule({
      ...schedule,
      days: schedule.days.map(d => {
        if (d.id !== dayId) return d
        if (d.meals.includes(meal)) return d
        return { ...d, meals: [...d.meals, meal] }
      })
    })
    setNewCustomMeal({ ...newCustomMeal, [dayId]: '' })
  }

  const toggleGeneralPoint = (point: string) => {
    const exists = schedule.generalPoints.includes(point)
    setSchedule({
      ...schedule,
      generalPoints: exists 
        ? schedule.generalPoints.filter(p => p !== point)
        : [...schedule.generalPoints, point]
    })
  }

  const handleAddCustomGeneralPoint = () => {
    const point = newGeneralPoint.trim()
    if (!point) return
    if (!schedule.generalPoints.includes(point)) {
      setSchedule({
        ...schedule,
        generalPoints: [...schedule.generalPoints, point]
      })
    }
    setNewGeneralPoint('')
  }

  const handleRemoveGeneralPoint = (point: string) => {
    setSchedule({
      ...schedule,
      generalPoints: schedule.generalPoints.filter(p => p !== point)
    })
  }

  // Save to backend
  const handleSave = async () => {
    setSaving(true)
    let checkpointsToSave: string[] = []

    if (editMode === 'raw') {
      checkpointsToSave = rawText
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    } else {
      checkpointsToSave = generateFlatCheckpoints()
    }

    if (checkpointsToSave.length === 0) {
      showToast('error', 'Debes configurar al menos un punto de control (ej. Ingreso).')
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkpoints: checkpointsToSave,
          dailySchedule: {
            days: schedule.days.map(d => ({ day: d.day, meals: d.meals })),
            generalPoints: schedule.generalPoints
          }
        })
      })

      const data = await res.json()
      if (res.ok) {
        showToast('success', '¡Cronograma de entregas guardado exitosamente!')
        router.refresh()
      } else {
        showToast('error', data.error || 'Error al guardar los puntos de control.')
      }
    } catch (err: any) {
      showToast('error', 'Error de conexión con el servidor.')
    } finally {
      setSaving(false)
    }
  }

  const flatCheckpoints = generateFlatCheckpoints()

  return (
    <div style={{
      backgroundColor: '#FFFFFF',
      border: '1px solid #E2E8F0',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
      transition: 'all 0.2s ease'
    }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '0.85rem 1.25rem',
          borderRadius: '12px',
          backgroundColor: toast.type === 'success' ? '#065F46' : '#991B1B',
          color: '#FFFFFF',
          fontSize: '0.9rem',
          fontWeight: 600,
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          animation: 'slideIn 0.3s ease-out'
        }}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* HEADER / SUMMARY BAR (Always Visible) */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '1.25rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          backgroundColor: isOpen ? '#F8FAFC' : '#FFFFFF',
          borderBottom: isOpen ? '1px solid #E2E8F0' : 'none',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            backgroundColor: '#EFF6FF',
            color: '#2563EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #DBEAFE'
          }}>
            <Utensils size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0F172A', margin: 0 }}>
                Cronograma de Refrigerios y Entregas por Día
              </h3>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '0.2rem 0.65rem',
                borderRadius: '20px',
                backgroundColor: flatCheckpoints.length > 0 ? '#ECFDF5' : '#FEF3C7',
                color: flatCheckpoints.length > 0 ? '#059669' : '#D97706',
                border: `1px solid ${flatCheckpoints.length > 0 ? '#A7F3D0' : '#FDE68A'}`
              }}>
                {flatCheckpoints.length} puntos activos ({schedule.days.length} días)
              </span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#64748B', margin: '0.2rem 0 0' }}>
              Permite registrar comidas y refrigerios cada día (Jueves, Viernes, Sábado...) sin que el sistema bloquee por entrega duplicada.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {isOpen ? 'Ocultar Configuración' : 'Configurar Días'}
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* EXPANDABLE BODY */}
      {isOpen && (
        <div style={{ padding: '1.5rem', backgroundColor: '#FFFFFF' }}>
          
          {/* TOP QUICK PRESET BUTTON */}
          <div style={{
            backgroundColor: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: '12px',
            padding: '1rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#166534', fontWeight: 700, fontSize: '0.92rem' }}>
                <Sparkles size={18} color="#16A34A" />
                <span>¿Es el Festival Departamental de Juventudes 2026?</span>
              </div>
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#15803D' }}>
                Aplica en 1 solo clic el cronograma oficial: Jueves 22 (Cena), Viernes 23 (4 comidas), Sábado 24 (5 comidas) y Domingo 25 (3 comidas).
              </p>
            </div>
            <button
              type="button"
              onClick={applyJuventudesPreset}
              style={{
                backgroundColor: '#16A34A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '0.6rem 1.1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 6px rgba(22, 163, 74, 0.3)'
              }}
            >
              <Sparkles size={16} />
              Cargar Cronograma Juventudes 2026
            </button>
          </div>

          {/* SECTION 1: PUNTOS GENERALES */}
          <div style={{ marginBottom: '1.75rem', borderBottom: '1px solid #F1F5F9', paddingBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Layers size={18} color="#64748B" />
              Puntos de Control Generales (Sin Día Específico)
            </h4>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 0.85rem' }}>
              Puntos que se entregan solo una vez durante todo el evento (ej: primer ingreso al evento o entrega de escarapela/kit).
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.85rem' }}>
              {COMMON_GENERAL_POINTS.map(p => {
                const isSelected = schedule.generalPoints.includes(p)
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => toggleGeneralPoint(p)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: isSelected ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
                      backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                      color: isSelected ? '#1E40AF' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    {isSelected && <Check size={14} color="#2563EB" />}
                    {p}
                  </button>
                )
              })}
            </div>

            {/* Custom General Point Input */}
            <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px' }}>
              <input
                type="text"
                value={newGeneralPoint}
                onChange={e => setNewGeneralPoint(e.target.value)}
                placeholder="Otro punto general (ej. Manilla VIP)..."
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomGeneralPoint())}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.75rem',
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1'
                }}
              />
              <button
                type="button"
                onClick={handleAddCustomGeneralPoint}
                disabled={!newGeneralPoint.trim()}
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
              >
                + Añadir
              </button>
            </div>
          </div>

          {/* SECTION 2: DÍAS Y COMIDAS */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Calendar size={18} color="#2563EB" />
                  Días del Evento y sus Entregas de Comida
                </h4>
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0.2rem 0 0' }}>
                  Cada día tendrá sus propios refrigerios. El escáner QR agrupará las entregas por cada día.
                </p>
              </div>

              {/* Add New Day Input */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={newDayName}
                  onChange={e => setNewDayName(e.target.value)}
                  placeholder="Ej. Jueves 22 o Día 1..."
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddDay())}
                  style={{
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    width: '180px'
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddDay}
                  disabled={!newDayName.trim()}
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.45rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <Plus size={15} />
                  Agregar Día
                </button>
              </div>
            </div>

            {/* List of Days */}
            {schedule.days.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '2.5rem 1rem',
                backgroundColor: '#F8FAFC',
                borderRadius: '12px',
                border: '1px dashed #CBD5E1'
              }}>
                <Calendar size={36} color="#94A3B8" style={{ margin: '0 auto 0.5rem' }} />
                <p style={{ margin: 0, fontWeight: 700, color: '#475569', fontSize: '0.95rem' }}>
                  No has configurado días específicos para este evento
                </p>
                <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.82rem', color: '#94A3B8' }}>
                  Haz clic en el botón verde superior para cargar el cronograma de Juventudes 2026 o agrega días manualmente.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {schedule.days.map((dayObj) => (
                  <div
                    key={dayObj.id}
                    style={{
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      backgroundColor: '#F8FAFC'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>📅</span>
                        <input
                          type="text"
                          value={dayObj.day}
                          onChange={e => {
                            const val = e.target.value
                            setSchedule({
                              ...schedule,
                              days: schedule.days.map(d => d.id === dayObj.id ? { ...d, day: val } : d)
                            })
                          }}
                          style={{
                            fontWeight: 800,
                            fontSize: '1rem',
                            color: '#0F172A',
                            border: '1px solid transparent',
                            backgroundColor: 'transparent',
                            borderBottom: '1px solid #CBD5E1',
                            padding: '0.2rem 0.4rem',
                            outline: 'none',
                            width: '200px'
                          }}
                        />
                        <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>
                          ({dayObj.meals.length} entregas)
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDay(dayObj.id)}
                        style={{
                          backgroundColor: 'transparent',
                          border: 'none',
                          color: '#EF4444',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.78rem',
                          fontWeight: 600
                        }}
                      >
                        <Trash2 size={15} />
                        Eliminar Día
                      </button>
                    </div>

                    {/* Meal Selector Chips for this Day */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      {COMMON_MEALS.map(meal => {
                        const isSelected = dayObj.meals.includes(meal.name)
                        return (
                          <button
                            key={meal.name}
                            type="button"
                            onClick={() => toggleMealInDay(dayObj.id, meal.name)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.5rem 0.85rem',
                              borderRadius: '8px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: isSelected ? '1.5px solid #16A34A' : '1px solid #CBD5E1',
                              backgroundColor: isSelected ? '#DCFCE7' : '#FFFFFF',
                              color: isSelected ? '#15803D' : '#475569',
                              boxShadow: isSelected ? '0 2px 4px rgba(22, 163, 74, 0.15)' : 'none'
                            }}
                          >
                            <span>{meal.icon}</span>
                            <span>{meal.name}</span>
                            {isSelected && <Check size={14} color="#16A34A" />}
                          </button>
                        )
                      })}
                    </div>

                    {/* Custom Meals already in this Day */}
                    {dayObj.meals.filter(m => !COMMON_MEALS.some(cm => cm.name === m)).length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                        {dayObj.meals.filter(m => !COMMON_MEALS.some(cm => cm.name === m)).map(customM => (
                          <span
                            key={customM}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              backgroundColor: '#E0E7FF',
                              color: '#3730A3',
                              padding: '0.35rem 0.65rem',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 700
                            }}
                          >
                            📍 {customM}
                            <button
                              type="button"
                              onClick={() => toggleMealInDay(dayObj.id, customM)}
                              style={{ background: 'none', border: 'none', color: '#4F46E5', cursor: 'pointer', padding: 0 }}
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Add Custom Meal to this Day */}
                    <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '350px' }}>
                      <input
                        type="text"
                        value={newCustomMeal[dayObj.id] || ''}
                        onChange={e => setNewCustomMeal({ ...newCustomMeal, [dayObj.id]: e.target.value })}
                        placeholder="Comida o entrega personalizada..."
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomMealToDay(dayObj.id))}
                        style={{
                          flex: 1,
                          padding: '0.35rem 0.65rem',
                          fontSize: '0.8rem',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCustomMealToDay(dayObj.id)}
                        disabled={!(newCustomMeal[dayObj.id] || '').trim()}
                        className="btn btn-outline"
                        style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                      >
                        + Añadir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION 3: LIVE PREVIEW OF GENERATED CHECKPOINTS */}
          <div style={{
            backgroundColor: '#0F172A',
            borderRadius: '12px',
            padding: '1.25rem',
            color: '#F8FAFC',
            marginBottom: '1.5rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#38BDF8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Vista Previa de Puntos que verá el Escáner QR ({flatCheckpoints.length}):
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                El operador en móvil podrá filtrar por cada día
              </span>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', maxHeight: '160px', overflowY: 'auto' }}>
              {flatCheckpoints.map(cp => (
                <span
                  key={cp}
                  style={{
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    color: '#E2E8F0',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    padding: '0.35rem 0.65rem',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <span style={{ color: '#38BDF8' }}>●</span>
                  {cp}
                </span>
              ))}
            </div>
          </div>

          {/* SAVE ACTIONS BAR */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', borderTop: '1px solid #E2E8F0', paddingTop: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="btn btn-outline"
              disabled={saving}
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                fontWeight: 700,
                fontSize: '0.95rem',
                backgroundColor: '#2563EB'
              }}
            >
              <Save size={18} />
              {saving ? 'Guardando...' : 'Guardar Cronograma'}
            </button>
          </div>

        </div>
      )}
    </div>
  )
}
