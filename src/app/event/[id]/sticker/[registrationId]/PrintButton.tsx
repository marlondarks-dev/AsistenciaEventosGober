"use client"

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()} 
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
