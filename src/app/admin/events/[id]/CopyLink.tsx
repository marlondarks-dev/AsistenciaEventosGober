"use client"

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    // Attempt to construct full URL if it's relative
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${url}` : url
    navigator.clipboard.writeText(fullUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
      <input 
        type="text" 
        value={typeof window !== 'undefined' ? `${window.location.origin}${url}` : url} 
        readOnly 
        className="form-input" 
        style={{ flex: 1, padding: '0.5rem', backgroundColor: 'var(--background)', color: 'var(--text-muted)' }} 
      />
      <button 
        onClick={handleCopy} 
        className="btn btn-outline" 
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        title="Copiar enlace público"
      >
        {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  )
}
