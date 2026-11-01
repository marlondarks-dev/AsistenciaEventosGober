"use client"

import { useEffect } from 'react'

export default function PrintButton() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault()
        try { window.print() } catch {}
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <button 
      onClick={() => {
        try {
          window.print()
        } catch (e) {
          console.error('Print error:', e)
        }
      }} 
      style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: '#475569',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontWeight: 600,
        cursor: 'pointer',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      Imprimir QR
    </button>
  )
}
