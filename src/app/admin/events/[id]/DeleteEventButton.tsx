"use client"

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DeleteEventButton({ eventId, eventName }: { eventId: string, eventName: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (confirm(`¿Estás completamente seguro de que deseas eliminar el evento "${eventName}"? Esta acción no se puede deshacer y eliminará todos los registros y escaneos asociados a este evento.`)) {
      setLoading(true)
      try {
        const res = await fetch(`/api/events/${eventId}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          router.push('/admin/events')
          router.refresh()
        } else {
          alert('Hubo un error al eliminar el evento.')
        }
      } catch (err) {
        alert('Hubo un error de red.')
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <button 
      onClick={handleDelete} 
      disabled={loading}
      className="btn" 
      style={{ 
        backgroundColor: '#FEF2F2', 
        color: '#DC2626', 
        border: '1px solid #FECACA', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.5rem',
        padding: '0.5rem 1rem'
      }}
    >
      <Trash2 size={18} />
      {loading ? 'Eliminando...' : 'Eliminar Evento'}
    </button>
  )
}
